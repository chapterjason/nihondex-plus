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
  // src/practice/constants.js
  var PRACTICE_KANA_PATH = "/practice/kana";
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

  // src/practice/recipe.js
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

  // src/ui/wrapper.js
  var BUTTON_STORE = [];
  function createWrapper() {
    const wrapperCard = document.createElement("div");
    wrapperCard.classList.add("card", "bg-base-100", "rounded-xs", "shadow-xs");
    wrapperCard.style.position = "fixed";
    wrapperCard.style.bottom = "0.5rem";
    wrapperCard.style.right = "0.5rem";
    const wrapperBody = document.createElement("div");
    wrapperBody.classList.add("card-body", "p-2");
    const label = document.createElement("span");
    label.classList.add("text-sm", "font-bold");
    label.innerText = "Nihondex Plus";
    wrapperBody.append(label);
    wrapperCard.append(wrapperBody);
    document.body.append(wrapperCard);
    return wrapperBody;
  }
  function createButton(label, action) {
    const button = document.createElement("button");
    button.innerText = label;
    button.classList.add("btn", "btn-xs", "btn-primary");
    button.addEventListener("click", action.bind(button));
    wrapper.append(button);
    BUTTON_STORE.push(button);
    return new ButtonElementReference(button);
  }
  var wrapper = createWrapper();

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

  // src/practice/kana-game.js
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

  // src/practice/practice-kana.js
  async function applyRecipeOrder(targetOrder, orderRandomButton, orderFocusButton) {
    if (targetOrder === "random") {
      await orderRandomButton.wait();
      await orderRandomButton.ensureActive();
    } else if (targetOrder === "focus") {
      await orderFocusButton.wait();
      await orderFocusButton.ensureActive();
    } else {
      throw new Error(`Invalid order: ${targetOrder}. Must be "random" or "focus".`);
    }
  }
  function* kanaRowMatrix() {
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
  function disableAnimations() {
    const style = document.createElement("style");
    style.id = "nihondex-plus-no-animations";
    style.textContent = `
        .kana-practice-page,
        .kana-practice-page *,
        .kana-practice-page *::before,
        .kana-practice-page *::after {
            transition: none !important;
            animation: none !important;
        }

        .animate-subtle-bounce,
        canvas[data-confetti] {
            display: none !important;
        }
    `;
    document.head.append(style);
  }
  function enableAnimations() {
    document.getElementById("nihondex-plus-no-animations")?.remove();
  }
  function onStartPractice(event) {
    if (event.target.closest('button[data-walkthrough="kana-start"]') === null) {
      return;
    }
    startButton.disable();
    kanaGame = new KanaGame();
    kanaGame.addEventListener("end", () => startButton.enable());
    kanaGame.start();
  }
  function loadPracticeKana() {
    if (practiceKanaLoaded) {
      return;
    }
    practiceKanaLoaded = true;
    disableAnimations();
    document.addEventListener("click", onStartPractice, { capture: true, passive: true });
    const modeDrawKanaButton = new ButtonElementReference('button[data-tip="Draw Kana"]');
    const modeSelectRomanjiButton = new ButtonElementReference('button[data-tip="Multiple Choice"]');
    const modeSelectKanaButton = new ButtonElementReference('button[data-tip="Romaji to Kana"]');
    const modeTypeRomanjiButton = new ButtonElementReference('button[data-tip="Kana to Romaji"]');
    const modeListenTypeButton = new ButtonElementReference('button[data-tip="Listen & Type"]');
    const modeListenDrawButton = new ButtonElementReference('button[data-tip="Listen & Draw"]');
    const modeWordToKanaButton = new ButtonElementReference('button[data-tip="Word to Kana"]');
    const orderRandomButton = new ButtonElementReference('div[data-walkthrough="kana-order"] > div > button:first-child');
    const orderFocusButton = new ButtonElementReference('div[data-walkthrough="kana-order"] > div > button:last-child');
    const sessionSizeInput = new InputElementReference('div[data-walkthrough="kana-session"] > div > input.input[type="number"]');
    const learningCardsCheckbox = new CheckboxElementReference('div[data-walkthrough="kana-session"] + div > label > input.checkbox[type="checkbox"]');
    const randomFontCheckbox = new CheckboxElementReference('div[data-walkthrough="kana-session"] + div + div > label > input.checkbox[type="checkbox"]');
    const kanaSwitch = new CheckboxElementReference('div[data-walkthrough="kana-characters"] input.toggle[type="checkbox"]');
    startButton = createButton("Start", async () => {
      startButton.disable();
      await Promise.all([
        modeDrawKanaButton.set(recipe.drawKana),
        modeSelectRomanjiButton.set(recipe.selectRomanji),
        modeSelectKanaButton.set(recipe.selectKana),
        modeTypeRomanjiButton.set(recipe.typeRomanji),
        modeListenTypeButton.set(recipe.listenType),
        modeListenDrawButton.set(recipe.listenDraw),
        modeWordToKanaButton.set(recipe.wordToKana),
        applyRecipeOrder(recipe.order, orderRandomButton, orderFocusButton),
        sessionSizeInput.set(recipe.size),
        learningCardsCheckbox.set(recipe.learningCards),
        randomFontCheckbox.set(recipe.randomFont),
        (async () => {
          await kanaSwitch.set(false);
          for (const { column, rowIndex, index } of kanaRowMatrix()) {
            const kanaRow = new KanaRowElementReference(`div[data-walkthrough="kana-characters"] > div.grid > div.card:nth-child(${column}) > div.card-body > div.grid > div.card:nth-child(${rowIndex})`);
            await kanaRow.set(recipe.kana.hiragana[KANA_ROW_ORDER[index]]);
          }
          await kanaSwitch.set(true);
          for (const { column, rowIndex, index } of kanaRowMatrix()) {
            const kanaRow = new KanaRowElementReference(`div[data-walkthrough="kana-characters"] > div.grid > div.card:nth-child(${column}) > div.card-body > div.grid > div.card:nth-child(${rowIndex})`);
            await kanaRow.set(recipe.kana.katakana[KANA_ROW_ORDER[index]]);
          }
        })()
      ]);
      startButton.enable();
    });
  }
  function unloadPracticeKana() {
    for (const buttonReference of BUTTON_STORE) {
      const button = buttonReference.get();
      button.remove();
    }
    BUTTON_STORE.length = 0;
    startButton = null;
    practiceKanaLoaded = false;
    document.removeEventListener("click", onStartPractice, { capture: true });
    enableAnimations();
    if (kanaGame !== null) {
      kanaGame.stop();
      kanaGame = null;
    }
  }
  var practiceKanaLoaded = false;
  var startButton = null;
  var kanaGame = null;

  // src/main.js
  async function main() {
    function onNavigation(url) {
      if (url.pathname === PRACTICE_KANA_PATH) {
        loadPracticeKana();
      } else {
        unloadPracticeKana();
      }
    }
    for (const method of ["pushState", "replaceState"]) {
      window.history[method] = new Proxy(window.history[method], {
        apply: (target, thisArg, argArray) => {
          const result = target.apply(thisArg, argArray);
          onNavigation(new URL(window.location.href));
          return result;
        }
      });
    }
    window.addEventListener("popstate", () => {
      onNavigation(new URL(window.location.href));
    });
    onNavigation(new URL(window.location.href));
  }
  (() => {
    main().catch((error) => {
      console.error(error);
    });
  })();
})();
