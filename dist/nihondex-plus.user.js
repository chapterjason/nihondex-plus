// ==UserScript==
// @name         nihondex-plus
// @namespace    chapterjason
// @version      1.0.16
// @author       chapterjason
// @homepageURL  https://github.com/chapterjason/nihondex-plus
// @supportURL   https://github.com/chapterjason/nihondex-plus/issues
// @match        https://nihondex.com/*
// @run-at       document-idle
// @connect      localhost
// @grant        GM_xmlhttpRequest
// ==/UserScript==

// Limit: a question starts when the new card shows up in the DOM, roughly
// 40-80ms after it really appeared. Answer times are taken from the actual
// click or keypress, start times cannot be. Measured times run a bit short.
(() => {
  // src/core/router.js
  var Router = class {
    constructor() {
      this.pages = /* @__PURE__ */ new Map();
      this.current = null;
      this.originals = /* @__PURE__ */ new Map();
      this.frame = null;
      this.onPopState = () => this.schedule();
    }
    add(path, page) {
      this.pages.set(path, page);
    }
    start() {
      for (const method of ["pushState", "replaceState"]) {
        const original = window.history[method];
        this.originals.set(method, original);
        window.history[method] = new Proxy(original, {
          apply: (target, thisArg, argArray) => {
            const result = target.apply(thisArg, argArray);
            this.schedule();
            return result;
          }
        });
      }
      window.addEventListener("popstate", this.onPopState);
      this.schedule();
    }
    stop() {
      for (const [method, original] of this.originals) {
        window.history[method] = original;
      }
      this.originals.clear();
      window.removeEventListener("popstate", this.onPopState);
      if (this.frame !== null) {
        cancelAnimationFrame(this.frame);
        this.frame = null;
      }
    }
    schedule() {
      if (this.frame !== null) {
        return;
      }
      this.frame = requestAnimationFrame(() => {
        this.frame = null;
        this.navigate();
      });
    }
    navigate() {
      const page = this.pages.get(window.location.pathname) ?? null;
      if (page === this.current) {
        return;
      }
      if (this.current !== null) {
        this.current.unload();
      }
      this.current = page;
      if (page !== null) {
        page.load();
      }
    }
  };

  // src/ui/ui-element.js
  var UiElement = class {
    constructor() {
      this.element = this.render();
    }
    render() {
      return document.createElement("div");
    }
    mount(parent) {
      parent.append(this.element);
    }
    unmount() {
      this.element.remove();
    }
  };

  // src/ui/ui-panel.js
  var UiPanel = class extends UiElement {
    constructor(label) {
      super();
      this.children = [];
      this.body = this.element.firstElementChild;
      this.body.firstElementChild.innerText = label;
    }
    render() {
      const card = document.createElement("div");
      card.classList.add("card", "bg-base-100", "rounded-xs", "shadow-xs");
      card.style.position = "fixed";
      card.style.bottom = "0.5rem";
      card.style.right = "0.5rem";
      const body = document.createElement("div");
      body.classList.add("card-body", "p-2");
      const title = document.createElement("span");
      title.classList.add("text-sm", "font-bold");
      body.append(title);
      card.append(body);
      return card;
    }
    add(child) {
      this.children.push(child);
      child.mount(this.body);
    }
    remove(child) {
      this.children = this.children.filter((stored) => stored !== child);
      child.unmount();
    }
  };

  // src/ui/panel.js
  var panel = new UiPanel(`Nihondex Plus v${"1.0.16"}`);

  // src/core/dom-observer.js
  var DomObserver = class extends EventTarget {
    constructor() {
      super();
      this.listeners = 0;
      this.observer = new MutationObserver(() => this.notify());
    }
    addEventListener(type, listener, options) {
      super.addEventListener(type, listener, options);
      this.listeners += 1;
      if (this.listeners === 1) {
        this.observer.observe(document.body, { subtree: true, childList: true });
      }
    }
    removeEventListener(type, listener, options) {
      super.removeEventListener(type, listener, options);
      this.listeners -= 1;
      if (this.listeners === 0) {
        this.observer.disconnect();
      }
    }
    notify() {
      this.dispatchEvent(new CustomEvent("mutation"));
    }
  };

  // src/core/observer.js
  var observer = new DomObserver();

  // src/core/now.js
  function now() {
    return performance.now();
  }

  // src/core/sleep.js
  function sleep(ms) {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  // src/core/ensure.js
  async function ensure(predicate, { timeout = 1e3, interval = 20, action, message = "Condition not met" } = {}) {
    const deadline = now() + timeout;
    while (!predicate()) {
      if (now() >= deadline) {
        throw new Error(`${message} after ${timeout}ms`);
      }
      action?.();
      await sleep(interval);
    }
  }

  // src/dom/element-reference.js
  var ElementReference = class {
    constructor(selectorOrElement) {
      this.selector = selectorOrElement instanceof Element ? null : selectorOrElement;
      this.element = selectorOrElement instanceof Element ? selectorOrElement : null;
    }
    exists() {
      return this.element != null || this.selector != null && this.get() != null;
    }
    get() {
      return this.element != null ? this.element : document.querySelector(this.selector);
    }
    hasClass(className) {
      return this.get().classList.contains(className);
    }
    addClass(className) {
      const element = this.get();
      if (element === null) {
        return;
      }
      element.classList.add(className);
    }
    removeClass(className) {
      const element = this.get();
      if (element === null) {
        return;
      }
      element.classList.remove(className);
    }
    click() {
      const element = this.get();
      element.click();
    }
    async wait(timeout = 1e3) {
      await ensure(() => this.exists(), {
        timeout,
        message: `Element ${this.selector} not found`
      });
    }
  };

  // src/core/page.js
  var Page = class extends EventTarget {
    constructor(selector) {
      super();
      this.reference = new ElementReference(selector);
      this.loaded = false;
      this.onCheck = () => this.check();
      observer.addEventListener("mutation", this.onCheck);
    }
    check() {
      if (this.reference.exists()) {
        this.load();
        return;
      }
      this.unload();
    }
    load() {
      if (this.loaded) {
        return;
      }
      this.loaded = true;
      this.onLoad();
      this.dispatchEvent(new CustomEvent("load"));
    }
    unload() {
      if (!this.loaded) {
        return;
      }
      this.loaded = false;
      this.onUnload();
      this.dispatchEvent(new CustomEvent("unload"));
    }
    onLoad() {
    }
    onUnload() {
    }
  };

  // src/core/sub-page.js
  var SubPage = class extends Page {
  };

  // src/ui/ui-button.js
  var UiButton = class extends UiElement {
    constructor(label, action) {
      super();
      this.element.innerText = label;
      this.element.addEventListener("click", action);
    }
    render() {
      const button = document.createElement("button");
      button.classList.add("btn", "btn-xs", "btn-primary");
      return button;
    }
    enable() {
      this.element.classList.remove("disabled");
      this.element.disabled = false;
    }
    disable() {
      this.element.classList.add("disabled");
      this.element.disabled = true;
    }
  };

  // src/dom/button-element-reference.js
  var ButtonElementReference = class extends ElementReference {
    isActive() {
      return !this.hasClass("btn-ghost");
    }
    enable() {
      const element = this.get();
      if (element.classList.contains("disabled")) {
        element.classList.remove("disabled");
      }
      element.disabled = false;
    }
    disable() {
      const element = this.get();
      if (!element.classList.contains("disabled")) {
        element.classList.add("disabled");
      }
      element.disabled = true;
    }
    async ensureActive(timeout = 1e3) {
      await ensure(() => this.isActive(), {
        timeout,
        action: () => this.click(),
        message: `Button ${this.selector} not active`
      });
    }
    async ensureInactive(timeout = 1e3) {
      await ensure(() => !this.isActive(), {
        timeout,
        action: () => this.click(),
        message: `Button ${this.selector} not inactive`
      });
    }
    async set(value, timeout = 1e3) {
      await this.wait(timeout);
      if (value) {
        await this.ensureActive();
      } else {
        await this.ensureInactive();
      }
    }
  };

  // src/dom/checkbox-element-reference.js
  var CheckboxElementReference = class extends ElementReference {
    isChecked() {
      return this.get().checked;
    }
    async ensureChecked(timeout = 1e3) {
      await ensure(() => this.isChecked(), {
        timeout,
        action: () => this.click(),
        message: `Checkbox ${this.selector} not checked`
      });
    }
    async ensureUnchecked(timeout = 1e3) {
      await ensure(() => !this.isChecked(), {
        timeout,
        action: () => this.click(),
        message: `Checkbox ${this.selector} not unchecked`
      });
    }
    async set(value, timeout = 1e3) {
      await this.wait(timeout);
      if (value) {
        await this.ensureChecked(timeout);
      } else {
        await this.ensureUnchecked();
      }
    }
  };

  // src/dom/input-element-reference.js
  var InputElementReference = class extends ElementReference {
    async set(value, timeout = 1e3) {
      await this.wait(timeout);
      const element = this.get();
      if (element.value.toString() !== value.toString()) {
        element.value = "";
        for (const character of value.toString()) {
          element.dispatchEvent(new KeyboardEvent("keydown", { key: character, bubbles: true }));
          element.value += character;
          element.dispatchEvent(new Event("input", { bubbles: true }));
          element.dispatchEvent(new KeyboardEvent("keyup", { key: character, bubbles: true }));
        }
        element.dispatchEvent(new Event("change", { bubbles: true }));
      }
    }
  };

  // src/dom/kana-row-element-reference.js
  var KanaRowElementReference = class extends ElementReference {
    isActive() {
      return this.hasClass("ring-primary");
    }
    async ensureActive(timeout = 1e3) {
      await ensure(() => this.isActive(), {
        timeout,
        action: () => this.click(),
        message: `Button ${this.selector} not active`
      });
    }
    async ensureInactive(timeout = 1e3) {
      await ensure(() => !this.isActive(), {
        timeout,
        action: () => this.click(),
        message: `Button ${this.selector} not inactive`
      });
    }
    async set(value, timeout = 1e3) {
      await this.wait(timeout);
      if (value) {
        await this.ensureActive();
      } else {
        await this.ensureInactive();
      }
    }
  };

  // src/page/practice-kana/constants.js
  var KANA_DAKUTEN_OFFSET = 10;
  var KANA_COMBINATIONS_OFFSET = KANA_DAKUTEN_OFFSET + 5;
  var KANA_ROW_ORDER = [
    // Basic
    "a",
    "ka",
    "sa",
    "ta",
    "na",
    "ha",
    "ma",
    "ya",
    "ra",
    "wa",
    // Dakuten
    "ga",
    "za",
    "da",
    "ba",
    "pa",
    // Combinations
    "kya",
    "sha",
    "cha",
    "nya",
    "hya",
    "mya",
    "rya",
    "gya",
    "ja",
    "bya",
    "pya"
  ];

  // src/page/practice-kana/practice-kana-setup-form.js
  var modeDrawKanaButton = new ButtonElementReference('button[data-tip="Draw Kana"]');
  var modeSelectRomanjiButton = new ButtonElementReference('button[data-tip="Multiple Choice"]');
  var modeSelectKanaButton = new ButtonElementReference('button[data-tip="Romaji to Kana"]');
  var modeTypeRomanjiButton = new ButtonElementReference('button[data-tip="Kana to Romaji"]');
  var modeListenTypeButton = new ButtonElementReference('button[data-tip="Listen & Type"]');
  var modeListenDrawButton = new ButtonElementReference('button[data-tip="Listen & Draw"]');
  var modeWordToKanaButton = new ButtonElementReference('button[data-tip="Word to Kana"]');
  var orderRandomButton = new ButtonElementReference('div[data-walkthrough="kana-order"] > div > button:first-child');
  var orderFocusButton = new ButtonElementReference('div[data-walkthrough="kana-order"] > div > button:last-child');
  var sessionSizeInput = new InputElementReference('div[data-walkthrough="kana-session"] > div > input.input[type="number"]');
  var learningCardsCheckbox = new CheckboxElementReference('div[data-walkthrough="kana-session"] + div > label > input.checkbox[type="checkbox"]');
  var randomFontCheckbox = new CheckboxElementReference('div[data-walkthrough="kana-session"] + div + div > label > input.checkbox[type="checkbox"]');
  var kanaSwitch = new CheckboxElementReference('div[data-walkthrough="kana-characters"] input.toggle[type="checkbox"]');
  var PracticeKanaSetupForm = class {
    *kanaRowMatrix() {
      for (let index = 0; index < KANA_ROW_ORDER.length; index++) {
        let column = 1;
        let rowIndex = index + 1;
        if (index >= KANA_COMBINATIONS_OFFSET) {
          column = 3;
          rowIndex -= KANA_COMBINATIONS_OFFSET;
        } else if (index >= KANA_DAKUTEN_OFFSET) {
          column = 2;
          rowIndex -= KANA_DAKUTEN_OFFSET;
        }
        yield { column, rowIndex, index };
      }
    }
    async applyRecipeOrder(targetOrder, orderRandomButton2, orderFocusButton2) {
      if (targetOrder === "random") {
        await orderRandomButton2.wait();
        await orderRandomButton2.ensureActive();
      } else if (targetOrder === "focus") {
        await orderFocusButton2.wait();
        await orderFocusButton2.ensureActive();
      } else {
        throw new Error(`Invalid order: ${targetOrder}. Must be "random" or "focus".`);
      }
    }
    async applyKana(kana) {
      for (const { column, rowIndex, index } of this.kanaRowMatrix()) {
        const kanaRow = new KanaRowElementReference(`div[data-walkthrough="kana-characters"] > div.grid > div.card:nth-child(${column}) > div.card-body > div.grid > div.card:nth-child(${rowIndex})`);
        await kanaRow.set(kana[KANA_ROW_ORDER[index]]);
      }
    }
    async apply(recipe2) {
      await Promise.all([
        modeDrawKanaButton.set(recipe2.drawKana),
        modeSelectRomanjiButton.set(recipe2.selectRomanji),
        modeSelectKanaButton.set(recipe2.selectKana),
        modeTypeRomanjiButton.set(recipe2.typeRomanji),
        modeListenTypeButton.set(recipe2.listenType),
        modeListenDrawButton.set(recipe2.listenDraw),
        modeWordToKanaButton.set(recipe2.wordToKana),
        this.applyRecipeOrder(recipe2.order, orderRandomButton, orderFocusButton),
        sessionSizeInput.set(recipe2.size),
        learningCardsCheckbox.set(recipe2.learningCards),
        randomFontCheckbox.set(recipe2.randomFont),
        (async () => {
          await kanaSwitch.set(false);
          await this.applyKana(recipe2.kana.hiragana);
          await kanaSwitch.set(true);
          await this.applyKana(recipe2.kana.katakana);
        })()
      ]);
    }
  };

  // src/page/practice-kana/recipe.js
  var recipe = {
    drawKana: false,
    selectRomanji: true,
    selectKana: true,
    typeRomanji: false,
    listenType: false,
    listenDraw: false,
    wordToKana: false,
    order: "random",
    // "focus" or "random"
    size: 5,
    learningCards: false,
    randomFont: true,
    kana: {
      hiragana: {
        // Basic
        a: true,
        ka: false,
        sa: false,
        ta: false,
        na: false,
        ha: false,
        ma: false,
        ya: false,
        ra: false,
        wa: false,
        // Dakuten
        ga: false,
        za: false,
        da: false,
        ba: false,
        pa: false,
        // Combinations
        kya: false,
        sha: false,
        cha: false,
        nya: false,
        hya: false,
        mya: false,
        rya: false,
        gya: false,
        ja: false,
        bya: false,
        pya: false
      },
      katakana: {
        a: false,
        ka: false,
        sa: false,
        ta: false,
        na: false,
        ha: false,
        ma: false,
        ya: false,
        ra: false,
        wa: false,
        // Dakuten
        ga: false,
        za: false,
        da: false,
        ba: false,
        pa: false,
        // Combinations
        kya: false,
        sha: false,
        cha: false,
        nya: false,
        hya: false,
        mya: false,
        rya: false,
        gya: false,
        ja: false,
        bya: false,
        pya: false
      }
    }
  };

  // src/page/practice-kana/practice-kana-setup-page.js
  var PracticeKanaSetupPage = class extends SubPage {
    constructor() {
      super('button[data-walkthrough="kana-start"]');
      this.form = new PracticeKanaSetupForm();
      this.element = null;
      this.startButton = null;
      this.onStartClick = (event) => this.onStart(event);
    }
    onLoad() {
      this.element = this.reference.get();
      this.element.addEventListener("click", this.onStartClick);
      this.startButton = new UiButton("Start", async () => {
        this.startButton.disable();
        await this.form.apply(recipe);
        this.startButton.enable();
      });
      panel.add(this.startButton);
    }
    onUnload() {
      this.element.removeEventListener("click", this.onStartClick);
      this.element = null;
      panel.remove(this.startButton);
      this.startButton = null;
    }
    onStart(event) {
      this.startButton.disable();
      this.dispatchEvent(new CustomEvent("start"));
    }
  };

  // src/util/disable-animations.js
  var NO_ANIMATIONS_CLASS = "nihondex-plus-no-animations";
  function disableAnimations() {
    const style = document.createElement("style");
    style.textContent = `
        .${NO_ANIMATIONS_CLASS},
        .${NO_ANIMATIONS_CLASS} *,
        .${NO_ANIMATIONS_CLASS} *::before,
        .${NO_ANIMATIONS_CLASS} *::after {
            transition: none !important;
            animation: none !important;
        }

        .animate-fade-in,
        .pill-animate {
            opacity: 1 !important;
            transform: none !important;
        }
    `;
    document.head.append(style);
  }

  // src/util/hide-elements.js
  function hideElements(selector) {
    const style = document.createElement("style");
    style.textContent = `
        ${selector} {
            display: none !important;
        }
    `;
    document.head.append(style);
    return style;
  }

  // src/util/hidden-styles.js
  var HiddenStyles = class {
    constructor() {
      this.styles = [];
    }
    add(selector) {
      this.styles.push(hideElements(selector));
    }
    clear() {
      for (const style of this.styles) {
        style.remove();
      }
      this.styles = [];
    }
  };

  // src/tracking/input-tracker.js
  var EVENTS = [
    "keydown",
    "keyup",
    "compositionstart",
    "compositionupdate",
    "compositionend",
    "focusin",
    "focusout",
    "click",
    "pointermove",
    "pointerdown",
    "pointerup",
    "pointercancel",
    "pointerenter",
    "pointerleave",
    "visibilitychange"
  ];
  var POINTER_STATE = [
    "pointermove",
    "pointerdown",
    "pointerup",
    "pointerenter"
  ];
  var DOCUMENT_ONLY = [
    "pointerenter",
    "pointerleave"
  ];
  var InputTracker = class extends EventTarget {
    constructor() {
      super();
      this.pointer = null;
      for (const type of EVENTS) {
        document.addEventListener(type, (event) => {
          if (DOCUMENT_ONLY.includes(type) && event.target !== document.documentElement) {
            return;
          }
          if (POINTER_STATE.includes(type)) {
            this.pointer = event;
          }
          this.dispatchEvent(new CustomEvent("tracking", {
            detail: {
              type,
              time: event.timeStamp,
              source: event
            }
          }));
        }, {
          capture: true,
          passive: true
        });
      }
    }
  };

  // src/tracking/tracking-collector.js
  var TrackingCollector = class _TrackingCollector extends EventTarget {
    static BUTTONS = ["left", "middle", "right"];
    static MODIFIERS = [
      ["ctrlKey", "ctrl"],
      ["altKey", "alt"],
      ["shiftKey", "shift"],
      ["metaKey", "meta"]
    ];
    static button(event) {
      return _TrackingCollector.BUTTONS[event.button] ?? String(event.button);
    }
    static modifiers(event) {
      return _TrackingCollector.MODIFIERS.filter(([property]) => event[property]).map(([, name]) => name);
    }
    constructor(tracker) {
      super();
      this.tracker = tracker;
      this.log = [];
      this.startTime = null;
      this.endTime = null;
      this.handler = (event) => this.log.push(...this.lines(event.detail));
    }
    isRunning() {
      return this.startTime !== null;
    }
    start(time2 = performance.now()) {
      if (this.isRunning()) {
        return;
      }
      this.log = [];
      this.startTime = time2;
      this.endTime = null;
      this.log.push(this.line("start", this.startTime, this.tracker.pointer));
      this.tracker.addEventListener("tracking", this.handler);
    }
    stop() {
      if (!this.isRunning()) {
        return this.log;
      }
      this.tracker.removeEventListener("tracking", this.handler);
      this.endTime = performance.now();
      this.log.push(this.line("end", this.endTime, this.tracker.pointer));
      this.startTime = null;
      return this.log;
    }
    mark(type, extra = {}) {
      if (!this.isRunning()) {
        return null;
      }
      const time2 = performance.now();
      this.log.push(this.line(type, time2, null, extra));
      return Math.round(time2 - this.startTime);
    }
    lines({ type, time: time2, source }) {
      if (type === "pointermove") {
        const samples = source.getCoalescedEvents();
        const fresh = samples.filter((sample) => sample.timeStamp >= this.startTime);
        if (fresh.length > 0) {
          return fresh.map((sample) => this.line(type, sample.timeStamp, sample));
        }
      }
      return [this.line(type, time2, source)];
    }
    line(type, time2, source, extra = {}) {
      const record = {
        time: Math.round(time2 - this.startTime),
        type,
        ...extra
      };
      switch (type) {
        case "click":
          Object.assign(record, {
            x: Math.round(source.clientX),
            y: Math.round(source.clientY),
            button: _TrackingCollector.button(source)
          });
          break;
        case "pointermove":
        case "pointercancel":
        case "pointerenter":
        case "pointerleave":
          Object.assign(record, {
            x: Math.round(source.clientX),
            y: Math.round(source.clientY),
            pointerType: source.pointerType
          });
          break;
        case "pointerdown":
        case "pointerup":
          Object.assign(record, {
            x: Math.round(source.clientX),
            y: Math.round(source.clientY),
            button: _TrackingCollector.button(source),
            pointerType: source.pointerType
          });
          break;
        case "compositionstart":
        case "compositionupdate":
        case "compositionend":
          Object.assign(record, {
            data: source.data
          });
          break;
        case "focusin":
        case "focusout":
          Object.assign(record, {});
          break;
        case "start":
        case "end":
          if (source !== null) {
            Object.assign(record, {
              x: Math.round(source.clientX),
              y: Math.round(source.clientY),
              pointerType: source.pointerType
            });
          }
          break;
        case "visibilitychange":
          Object.assign(record, {
            state: document.visibilityState
          });
          break;
        case "keydown":
        case "keyup":
          Object.assign(record, {
            code: source.code,
            key: source.key,
            modifiers: _TrackingCollector.modifiers(source)
          });
          break;
      }
      this.dispatchEvent(new CustomEvent("line", {
        detail: { type, time: time2, source, record }
      }));
      return JSON.stringify(record);
    }
  };

  // src/tracking/tracking-processor.js
  var TrackingProcessor = class _TrackingProcessor {
    static MOVEMENT_GAP = 100;
    static FIELDS = [
      "time",
      "type",
      "x",
      "y",
      "button",
      "pointerType",
      "code",
      "key",
      "modifiers",
      "data",
      "state"
    ];
    static custom(records) {
      return records.map((record) => Object.entries(record).filter(([field]) => !_TrackingProcessor.FIELDS.includes(field))).map((entries, index) => [records[index].time, entries]).filter(([, entries]) => entries.length > 0).map(([time2, entries]) => Object.fromEntries([["time", time2], ...entries]));
    }
    static withCustom(entry, records) {
      const custom = _TrackingProcessor.custom(records);
      return custom.length === 0 ? entry : { ...entry, custom };
    }
    static DERIVED = [
      "movement",
      "typing",
      "answer"
    ];
    static order(entry) {
      return _TrackingProcessor.DERIVED.includes(entry.type) ? 1 : 0;
    }
    static compare(a, b) {
      return a.time - b.time || _TrackingProcessor.order(a) - _TrackingProcessor.order(b);
    }
    static INPUTS = [
      "click",
      "keydown"
    ];
    static TYPING = [
      "keydown",
      "keyup",
      "compositionstart",
      "compositionupdate",
      "compositionend"
    ];
    static BOUNDARIES = [
      "pointerdown",
      "pointerup",
      "pointercancel",
      "pointerenter",
      "pointerleave"
    ];
    static distance(from, to) {
      return Math.hypot(to.x - from.x, to.y - from.y);
    }
    constructor(log) {
      this.records = log.map((line) => JSON.parse(line)).sort((a, b) => a.time - b.time);
    }
    select(...types) {
      return this.records.filter((record) => types.includes(record.type));
    }
    process() {
      return [
        ...this.movements(),
        ...this.typing(),
        ...this.visibility(),
        ...this.answers(),
        ...this.select("start", "end", "click", ..._TrackingProcessor.BOUNDARIES, "focusin", "focusout")
      ].sort(_TrackingProcessor.compare);
    }
    answers() {
      const inputs = this.select(..._TrackingProcessor.INPUTS);
      return this.select("answer").map((answer) => this.describeAnswer(answer, inputs));
    }
    describeAnswer(answer, inputs) {
      const input = inputs.filter((event) => event.time <= answer.time).pop();
      if (input === void 0) {
        return { ...answer, detected: answer.time, input: null };
      }
      return {
        ...answer,
        time: input.time,
        detected: answer.time,
        input: input.type
      };
    }
    movements() {
      const groups = [];
      let current = null;
      for (const event of this.select("pointermove", ..._TrackingProcessor.BOUNDARIES)) {
        if (event.type !== "pointermove") {
          current = null;
          continue;
        }
        if (current === null || event.time - current[current.length - 1].time > _TrackingProcessor.MOVEMENT_GAP) {
          current = [event];
          groups.push(current);
          continue;
        }
        current.push(event);
      }
      return groups.filter((points) => points.length > 1).map((points) => this.describeMovement(points)).filter((movement) => movement.distance > 0);
    }
    describeMovement(points) {
      const first = points[0];
      const last = points[points.length - 1];
      let distance = 0;
      let peakSpeed = 0;
      for (let index = 1; index < points.length; index += 1) {
        const from = points[index - 1];
        const to = points[index];
        const step = _TrackingProcessor.distance(from, to);
        const elapsed = to.time - from.time;
        distance += step;
        if (elapsed > 0) {
          peakSpeed = Math.max(peakSpeed, step / elapsed);
        }
      }
      const displacement = _TrackingProcessor.distance(first, last);
      const movement = {
        time: first.time,
        type: "movement",
        end: last.time,
        duration: last.time - first.time,
        samples: points.length,
        from: { x: first.x, y: first.y },
        to: { x: last.x, y: last.y },
        distance: Math.round(distance),
        displacement: Math.round(displacement),
        efficiency: distance === 0 ? 1 : displacement / distance,
        peakSpeed
      };
      return _TrackingProcessor.withCustom(movement, points);
    }
    typing() {
      const events = this.select(..._TrackingProcessor.TYPING, "answer");
      const owner = /* @__PURE__ */ new Map();
      const groups = [];
      let current = null;
      let closed = false;
      for (const event of events) {
        if (event.type === "answer") {
          closed = true;
          continue;
        }
        if (event.type === "keyup") {
          const group = owner.get(event.code) ?? current;
          owner.delete(event.code);
          group?.push(event);
          continue;
        }
        if (current === null || closed) {
          current = [];
          closed = false;
          groups.push(current);
        }
        current.push(event);
        if (event.type === "keydown") {
          owner.set(event.code, current);
        }
      }
      return groups.filter((group) => group.length > 0).map((group) => this.describeTyping(group));
    }
    describeTyping(events) {
      const characters = [];
      const typed = [];
      const intervals = [];
      const dwells = [];
      const compositions = [];
      const pressed = /* @__PURE__ */ new Map();
      let keys = 0;
      let backspaces = 0;
      let previousKeydown = null;
      let composing = null;
      for (const event of events) {
        switch (event.type) {
          case "keydown":
            keys += 1;
            typed.push(event.key);
            pressed.set(event.code, event.time);
            if (previousKeydown !== null) {
              intervals.push(event.time - previousKeydown);
            }
            previousKeydown = event.time;
            if (composing !== null) {
              break;
            }
            if (event.key === "Backspace") {
              backspaces += 1;
              characters.pop();
            } else if ([...event.key].length === 1) {
              characters.push(event.key);
            }
            break;
          case "keyup": {
            const down = pressed.get(event.code);
            if (down !== void 0) {
              dwells.push(event.time - down);
              pressed.delete(event.code);
            }
            break;
          }
          case "compositionstart":
            composing = { start: event.time, updates: 0, data: "" };
            break;
          case "compositionupdate":
            if (composing !== null) {
              composing.updates += 1;
              composing.data = event.data;
            }
            break;
          case "compositionend":
            if (composing !== null) {
              composing.end = event.time;
              composing.duration = event.time - composing.start;
              composing.data = event.data;
              compositions.push(composing);
              composing = null;
            }
            characters.push(...event.data);
            break;
        }
      }
      const first = events[0];
      const last = events[events.length - 1];
      const run = {
        time: first.time,
        type: "typing",
        end: last.time,
        duration: last.time - first.time,
        text: characters.join(""),
        typed,
        keys,
        backspaces,
        intervals,
        dwells,
        compositions
      };
      return _TrackingProcessor.withCustom(run, events);
    }
    visibility() {
      const changes = this.select("visibilitychange");
      const last = this.records[this.records.length - 1];
      const end = last === void 0 ? 0 : last.time;
      return changes.map((change, index) => {
        const next = changes[index + 1];
        const until = next === void 0 ? end : next.time;
        return {
          ...change,
          end: until,
          duration: until - change.time
        };
      });
    }
  };

  // src/util/date.js
  function date(value = /* @__PURE__ */ new Date()) {
    const year = String(value.getFullYear()).padStart(4, "0");
    const month = String(value.getMonth() + 1).padStart(2, "0");
    const day = String(value.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  }

  // src/util/time.js
  function time(value = /* @__PURE__ */ new Date()) {
    const hours = String(value.getHours()).padStart(2, "0");
    const minutes = String(value.getMinutes()).padStart(2, "0");
    const seconds = String(value.getSeconds()).padStart(2, "0");
    return `${hours}:${minutes}:${seconds}`;
  }

  // src/util/stamp.js
  function stamp(value = /* @__PURE__ */ new Date()) {
    const milliseconds = String(value.getMilliseconds()).padStart(3, "0");
    return `${date(value)} ${time(value)}.${milliseconds}`;
  }

  // src/util/absolute.js
  function absolute(elapsed) {
    return stamp(new Date(performance.timeOrigin + elapsed));
  }

  // src/page/practice-kana/practice-kana-game-page.js
  var GAME_MODE_SELECT_ROMAJI = "selectRomanji";
  var GAME_MODE_SELECT_KANA = "selectKana";
  var GAME_MODE_TYPE_ROMAJI = "typeRomanji";
  var GAME_MODE_UNKNOWN = "unknown";
  var KANA = /[\u3040-\u30ff]/;
  var OPTION_SUCCESS_CLASS = "bg-success/40";
  var OPTION_ERROR_CLASS = "bg-error/40";
  var FEEDBACK_SELECTOR = ".animate-fly-up";
  var FEEDBACK_SUCCESS = "✓";
  var FEEDBACK_ERROR = "✗";
  var EMPTY_ANSWER = {
    prompt: null
  };
  var PracticeKanaGamePage = class extends SubPage {
    constructor() {
      super("[game-count]");
      this.card = null;
      this.tracker = new InputTracker();
      this.collector = new TrackingCollector(this.tracker);
      this.trackings = [];
      this.gameMode = null;
      this.tracked = null;
      this.answered = false;
      this.answer = null;
      this.choices = [];
      this.feedback = null;
      this.mark = null;
    }
    getGameMode() {
      const card = this.reference.get();
      if (card === null) {
        return GAME_MODE_UNKNOWN;
      }
      const option = card.querySelector(".kana-option-btn");
      if (option !== null) {
        return KANA.test(option.lastElementChild.textContent) ? GAME_MODE_SELECT_KANA : GAME_MODE_SELECT_ROMAJI;
      }
      if (card.querySelector("input") !== null) {
        return GAME_MODE_TYPE_ROMAJI;
      }
      return GAME_MODE_UNKNOWN;
    }
    checkAnswer() {
      if (this.answered) {
        return;
      }
      const card = this.reference.get();
      if (card === null) {
        return;
      }
      this.choose(card, OPTION_ERROR_CLASS);
      const feedback = card.querySelector(FEEDBACK_SELECTOR);
      const mark = feedback === null ? null : feedback.textContent.trim();
      if (feedback === this.feedback && mark === this.mark) {
        return;
      }
      this.feedback = feedback;
      this.mark = mark;
      if (mark === FEEDBACK_SUCCESS) {
        this.answered = true;
        this.choose(card, OPTION_SUCCESS_CLASS);
        this.answer = this.snapshot(card);
        this.collector.mark("answer", { correct: true });
        return;
      }
      if (mark === FEEDBACK_ERROR) {
        this.collector.mark("answer", { correct: false });
      }
    }
    check() {
      super.check();
      this.checkAnswer();
      const card = this.reference.get();
      if (card === this.card) {
        return;
      }
      this.card = card;
      if (card === null) {
        return;
      }
      this.onCard(card);
    }
    getLabel(option) {
      return option.lastElementChild.textContent.trim();
    }
    getPrompt(card) {
      const display = [...card.querySelectorAll(".kana-display")].find((element) => element.closest("dialog") === null);
      return display === void 0 ? null : display.textContent.trim();
    }
    getOptions(card) {
      return [...card.querySelectorAll(".kana-option-btn")].map((option) => this.getLabel(option));
    }
    getMarked(card, className) {
      return [...card.querySelectorAll(".kana-option-btn")].filter((option) => option.classList.contains(className)).map((option) => this.getLabel(option));
    }
    choose(card, className) {
      const marked = this.getMarked(card, className).filter((label) => !this.choices.includes(label));
      this.choices.push(...marked);
    }
    snapshot(card) {
      const answer = {
        prompt: this.getPrompt(card)
      };
      const options = this.getOptions(card);
      if (options.length === 0) {
        return answer;
      }
      return {
        ...answer,
        options,
        choices: [...this.choices]
      };
    }
    finish() {
      if (!this.collector.isRunning()) {
        return;
      }
      const card = this.tracked;
      const answer = this.answer ?? (card === null ? EMPTY_ANSWER : this.snapshot(card));
      const started = absolute(this.collector.startTime);
      const log = this.collector.stop();
      const finished = absolute(this.collector.endTime);
      const processed = new TrackingProcessor(log).process();
      const tracking = {
        started,
        finished,
        gameMode: this.gameMode,
        ...answer,
        log,
        processed
      };
      this.trackings.push(tracking);
    }
    onCard(card) {
      this.finish();
      this.answered = false;
      this.answer = null;
      this.choices = [];
      this.feedback = null;
      this.mark = null;
      this.tracked = card;
      this.gameMode = this.getGameMode();
      this.collector.start();
    }
    onUnload() {
      this.finish();
      this.dispatchEvent(new CustomEvent("tracking", { detail: this.trackings }));
      this.trackings = [];
    }
  };

  // src/dom/stat-pill-element-reference.js
  var NUMBER = /(\d+)/;
  var DIGITS = /^\d+$/;
  var StatPillElementReference = class extends ElementReference {
    getLabel() {
      return this.get().lastElementChild.textContent.trim();
    }
    getValue() {
      return this.get().querySelector("span").textContent.trim();
    }
    getNumber() {
      const match = this.getValue().match(NUMBER);
      return match === null ? null : Number(match[1]);
    }
    getSeconds() {
      const parts = this.getValue().split(":");
      return parts.every((part) => DIGITS.test(part)) ? parts.reduce((total, part) => total * 60 + Number(part), 0) : null;
    }
  };

  // src/page/practice-kana/practice-kana-result-page.js
  var SECONDS = /([\d.]+)\s*s/;
  var COUNT = /×\s*(\d+)/;
  var EMPTY_STATS = {
    score: null,
    duration: null,
    streak: null
  };
  var PracticeKanaResultPage = class _PracticeKanaResultPage extends SubPage {
    static SETTLE = 3;
    static equal(stats, other) {
      return other !== null && Object.keys(stats).every((key) => stats[key] === other[key]);
    }
    static STATS = {
      "Score": "score",
      "Duration": "duration",
      "Best Streak": "streak"
    };
    static VALUES = {
      score: (pill) => pill.getNumber(),
      duration: (pill) => pill.getSeconds(),
      streak: (pill) => pill.getNumber()
    };
    constructor() {
      super(".stat-pill");
      this.details = new ButtonElementReference(".kana-practice-page button:has(.fa-chevron-down)");
      this.continueButton = new ButtonElementReference(".kana-practice-page button.btn-primary.w-full");
      this.reported = false;
    }
    getDetails() {
      const button = this.details.get();
      if (button === null || button.parentElement.children.length < 2) {
        return null;
      }
      return button.parentElement.children[1];
    }
    getStats() {
      const entries = [...document.querySelectorAll(".stat-pill")].map((element) => new StatPillElementReference(element)).map((pill) => [_PracticeKanaResultPage.STATS[pill.getLabel()], pill]).filter(([key]) => key !== void 0).map(([key, pill]) => [key, _PracticeKanaResultPage.VALUES[key](pill)]);
      return { ...EMPTY_STATS, ...Object.fromEntries(entries) };
    }
    getIncorrect(details) {
      return [...details.querySelectorAll(".rounded-xl.p-3.text-center")].filter((entry) => entry.querySelector("span") !== null).map((entry) => ({
        kana: entry.firstElementChild.textContent.trim(),
        romaji: entry.querySelector("span").textContent.trim(),
        count: Number(entry.textContent.match(COUNT)?.[1] ?? 0)
      }));
    }
    getResults(details) {
      return [...details.querySelectorAll(".group")].map((entry) => ({
        kana: entry.querySelector(".kana-display"),
        seconds: entry.textContent.match(SECONDS)
      })).filter(({ kana, seconds }) => kana !== null && seconds !== null).map(({ kana, seconds }) => ({
        kana: kana.textContent.trim(),
        seconds: Number(seconds[1])
      }));
    }
    async settle(timeout = 3e3) {
      let previous = null;
      let changed = false;
      let stable = 0;
      await ensure(() => {
        const stats = this.getStats();
        const same = _PracticeKanaResultPage.equal(stats, previous);
        changed = changed || previous !== null && !same;
        stable = same ? stable + 1 : 0;
        previous = stats;
        return changed && stable >= _PracticeKanaResultPage.SETTLE;
      }, { timeout, interval: 100, message: "Stats not settled" });
    }
    async report() {
      await this.settle().catch(() => void 0);
      const details = this.getDetails();
      if (details === null) {
        return;
      }
      this.dispatchEvent(new CustomEvent("result", {
        detail: {
          ...this.getStats(),
          incorrect: this.getIncorrect(details),
          results: this.getResults(details)
        }
      }));
      this.continueButton.click();
    }
    check() {
      super.check();
      if (!this.loaded || this.reported) {
        return;
      }
      const details = this.getDetails();
      if (details === null) {
        this.details.click();
        return;
      }
      this.reported = true;
      this.report();
    }
    onLoad() {
      this.reported = false;
    }
  };

  // src/util/id.js
  function id() {
    return crypto.randomUUID();
  }

  // src/page/practice-kana/practice-kana-page.js
  var PracticeKanaPage = class extends Page {
    constructor() {
      super(".kana-practice-page");
      this.hiddenStyles = new HiddenStyles();
      this.setupPage = new PracticeKanaSetupPage();
      this.gamePage = new PracticeKanaGamePage();
      this.resultPage = new PracticeKanaResultPage();
      this.trackings = [];
      this.startedAt = null;
      this.session = null;
      this.setupPage.addEventListener("start", () => this.onStart());
      this.gamePage.addEventListener("tracking", (event) => this.onTracking(event.detail));
      this.resultPage.addEventListener("result", (event) => this.onResult(event.detail));
    }
    onStart() {
      this.startedAt = /* @__PURE__ */ new Date();
      this.session = id();
    }
    onTracking(trackings) {
      this.trackings = trackings;
    }
    onResult(result) {
      const finishedAt = /* @__PURE__ */ new Date();
      const startedAt = this.startedAt ?? finishedAt;
      const session = this.session ?? id();
      const results = this.trackings.map((tracking, index) => ({
        ...tracking,
        nihondex: result.results[index]
      }));
      this.trackings = [];
      this.startedAt = null;
      this.session = null;
      this.dispatchEvent(new CustomEvent("session", {
        detail: {
          session,
          started: stamp(startedAt),
          finished: stamp(finishedAt),
          score: result.score,
          duration: result.duration,
          streak: result.streak,
          incorrect: result.incorrect,
          results
        }
      }));
    }
    onLoad() {
      this.reference.addClass(NO_ANIMATIONS_CLASS);
      this.hiddenStyles.add("canvas[data-confetti]");
      this.hiddenStyles.add(".animate-subtle-bounce");
    }
    onUnload() {
      this.reference.removeClass(NO_ANIMATIONS_CLASS);
      this.hiddenStyles.clear();
    }
  };

  // src/ui/ui-input.js
  var UiInput = class extends UiElement {
    constructor(label, value, action) {
      super();
      this.input = this.element.lastElementChild;
      this.element.firstElementChild.innerText = label;
      this.input.value = value;
      this.input.addEventListener("change", () => action(this.input.value));
    }
    render() {
      const control = document.createElement("label");
      control.classList.add("form-control", "flex", "flex-col", "gap-1");
      const text = document.createElement("span");
      text.classList.add("text-xs");
      const input = document.createElement("input");
      input.classList.add("input", "input-xs", "input-bordered");
      input.type = "text";
      control.append(text, input);
      return control;
    }
    enable() {
      this.element.classList.remove("opacity-50");
      this.input.disabled = false;
    }
    disable() {
      this.element.classList.add("opacity-50");
      this.input.disabled = true;
    }
  };

  // src/ui/ui-modal.js
  var UiModal = class extends UiElement {
    constructor(label) {
      super();
      this.children = [];
      this.box = this.element.firstElementChild;
      this.content = this.box.children[1];
      this.box.firstElementChild.innerText = label;
    }
    render() {
      const dialog = document.createElement("dialog");
      dialog.classList.add("modal");
      const box = document.createElement("div");
      box.classList.add("modal-box", "flex", "flex-col", "gap-2");
      const title = document.createElement("h3");
      title.classList.add("text-sm", "font-bold");
      const form = document.createElement("form");
      form.method = "dialog";
      form.classList.add("modal-backdrop");
      const close = document.createElement("button");
      close.innerText = "Close";
      close.classList.add("btn", "btn-xs");
      const content = document.createElement("div");
      content.classList.add("flex", "flex-col", "gap-2");
      box.append(title, content, form);
      form.append(close);
      dialog.append(box);
      return dialog;
    }
    add(child) {
      this.children.push(child);
      child.mount(this.content);
    }
    remove(child) {
      this.children = this.children.filter((stored) => stored !== child);
      child.unmount();
    }
    open() {
      this.element.showModal();
    }
    close() {
      this.element.close();
    }
  };

  // src/ui/ui-checkbox.js
  var UiCheckbox = class extends UiElement {
    constructor(label, value, action) {
      super();
      this.input = this.element.firstElementChild;
      this.element.lastElementChild.innerText = label;
      this.input.checked = value;
      this.input.addEventListener("change", () => action(this.input.checked));
    }
    render() {
      const control = document.createElement("label");
      control.classList.add("label", "cursor-pointer", "flex", "flex-row", "gap-2", "justify-start");
      const input = document.createElement("input");
      input.classList.add("checkbox", "checkbox-xs");
      input.type = "checkbox";
      const text = document.createElement("span");
      text.classList.add("text-xs");
      control.append(input, text);
      return control;
    }
  };

  // src/ui/ui-textarea.js
  var UiTextarea = class extends UiElement {
    constructor(label, rows = 12) {
      super();
      this.textarea = this.element.lastElementChild;
      this.element.firstElementChild.innerText = label;
      this.textarea.rows = rows;
    }
    render() {
      const control = document.createElement("label");
      control.classList.add("form-control", "flex", "flex-col", "gap-1");
      const text = document.createElement("span");
      text.classList.add("text-xs");
      const textarea = document.createElement("textarea");
      textarea.classList.add("textarea", "textarea-xs", "textarea-bordered", "font-mono");
      textarea.readOnly = true;
      control.append(text, textarea);
      return control;
    }
    set(value) {
      this.textarea.value = value;
    }
    select() {
      this.textarea.select();
    }
  };

  // src/util/settings.js
  var KEY = "nihondex-plus";
  var Settings = class _Settings {
    constructor() {
      this.values = _Settings.load();
    }
    static load() {
      const stored = localStorage.getItem(KEY);
      if (stored === null) {
        return {};
      }
      try {
        return JSON.parse(stored);
      } catch {
        return {};
      }
    }
    get(name, fallback) {
      return this.values[name] ?? fallback;
    }
    set(name, value) {
      this.values[name] = value;
      localStorage.setItem(KEY, JSON.stringify(this.values));
    }
  };
  var settings = new Settings();

  // src/util/post.js
  function post(url, payload) {
    return new Promise((resolve, reject) => {
      GM_xmlhttpRequest({
        method: "POST",
        url,
        headers: { "content-type": "application/json" },
        data: JSON.stringify(payload),
        onload: (response) => {
          if (response.status >= 200 && response.status < 300) {
            resolve(response);
            return;
          }
          reject(new Error(`${response.status} ${response.statusText}`));
        },
        onerror: () => reject(new Error("request failed")),
        ontimeout: () => reject(new Error("request timed out"))
      });
    });
  }

  // src/settings.js
  var SERVER = {
    name: "server",
    label: "Use result server",
    value: false
  };
  var RESULTS = {
    name: "results",
    label: "Result server",
    value: "http://localhost:3001/results"
  };

  // src/main.js
  function toggle(element, enabled) {
    if (enabled) {
      element.enable();
      return;
    }
    element.disable();
  }
  async function onSession(session, output, results) {
    if (settings.get(SERVER.name, SERVER.value)) {
      await post(settings.get(RESULTS.name, RESULTS.value), session);
      return;
    }
    output.set(JSON.stringify(session, null, 4));
    results.open();
    output.select();
  }
  async function main() {
    disableAnimations();
    panel.mount(document.body);
    const modal = new UiModal("Settings");
    const server = settings.get(SERVER.name, SERVER.value);
    const url = new UiInput(
      RESULTS.label,
      settings.get(RESULTS.name, RESULTS.value),
      (value) => settings.set(RESULTS.name, value)
    );
    modal.add(new UiCheckbox(SERVER.label, server, (value) => {
      settings.set(SERVER.name, value);
      toggle(url, value);
    }));
    modal.add(url);
    toggle(url, server);
    modal.mount(document.body);
    panel.add(new UiButton("Settings", () => modal.open()));
    const output = new UiTextarea("Session");
    const results = new UiModal("Results");
    results.add(output);
    results.mount(document.body);
    const page = new PracticeKanaPage();
    page.addEventListener("session", (event) => onSession(event.detail, output, results));
    const router = new Router();
    router.add("/practice/kana", page);
    router.start();
  }
  (() => {
    main().catch((error) => {
      console.error(error);
    });
  })();
})();
