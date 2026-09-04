// ==UserScript==
// @name        nihondex-plus
// @namespace   chapterjason
// @version     1.0.0
// @run-at      document-idle
// @inject-into page
// @match       https://nihondex.com/*
// @grant       none
//
// @author      -
// @description
// ==/UserScript==
(() => {
  // src/core/router.js
  var Router = class {
    constructor() {
      this.pages = /* @__PURE__ */ new Map();
      this.current = null;
      this.originals = /* @__PURE__ */ new Map();
      this.onPopState = () => this.navigate();
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
            this.navigate();
            return result;
          }
        });
      }
      window.addEventListener("popstate", this.onPopState);
      this.navigate();
    }
    stop() {
      for (const [method, original] of this.originals) {
        window.history[method] = original;
      }
      this.originals.clear();
      window.removeEventListener("popstate", this.onPopState);
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
  var panel = new UiPanel("Nihondex Plus");

  // src/core/page.js
  var Page = class extends EventTarget {
    load() {
    }
    unload() {
    }
  };

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

  // src/core/sub-page.js
  var SubPage = class extends Page {
    constructor(reference) {
      super();
      this.reference = reference;
      this.loaded = false;
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
    }
    unload() {
      if (!this.loaded) {
        return;
      }
      this.loaded = false;
      this.onUnload();
    }
    onLoad() {
    }
    onUnload() {
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
      super(new ButtonElementReference('button[data-walkthrough="kana-start"]'));
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

  // src/page/practice-kana/kana-game.js
  var KanaGame = class extends EventTarget {
    constructor() {
      super();
      this.started = false;
      this.observer = new MutationObserver(() => this.check());
    }
    start() {
      this.observer.observe(document.body, { subtree: true, childList: true });
    }
    stop() {
      this.observer.disconnect();
    }
    check() {
      if (document.querySelector("[active-system]") !== null) {
        this.started = true;
        return;
      }
      if (!this.started) {
        return;
      }
      this.started = false;
      this.stop();
      this.dispatchEvent(new CustomEvent("end"));
    }
  };

  // src/page/practice-kana/practice-kana-page.js
  var PracticeKanaPage = class extends Page {
    constructor() {
      super();
      this.hiddenStyles = [];
      this.kanaGame = null;
      this.page = new ElementReference(".kana-practice-page");
      this.setupPage = new PracticeKanaSetupPage();
      this.observer = new MutationObserver(() => this.check());
      this.setupPage.addEventListener("start", () => this.start());
    }
    check() {
      this.setupPage.check();
    }
    start() {
      this.kanaGame = new KanaGame();
      this.kanaGame.addEventListener("end", () => this.end());
      this.kanaGame.start();
    }
    end() {
      this.kanaGame = null;
      this.check();
    }
    load() {
      this.page.addClass(NO_ANIMATIONS_CLASS);
      this.hiddenStyles = [
        hideElements("canvas[data-confetti]"),
        hideElements(".animate-subtle-bounce")
      ];
      this.observer.observe(document.body, { subtree: true, childList: true });
      this.check();
    }
    unload() {
      this.observer.disconnect();
      this.kanaGame?.stop();
      this.kanaGame = null;
      this.setupPage.unload();
      this.page.removeClass(NO_ANIMATIONS_CLASS);
      for (const style of this.hiddenStyles) {
        style.remove();
      }
      this.hiddenStyles = [];
    }
  };

  // src/main.js
  async function main() {
    disableAnimations();
    panel.mount(document.body);
    const router = new Router();
    router.add("/practice/kana", new PracticeKanaPage());
    router.start();
  }
  (() => {
    main().catch((error) => {
      console.error(error);
    });
  })();
})();
