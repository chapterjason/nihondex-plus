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

const PRACTICE_KANA_PATH = "/practice/kana";
const KANA_DAKUTEN_OFFSET = 10;
const KANA_COMBINATIONS_OFFSET = KANA_DAKUTEN_OFFSET + 5;
const KANA_ROW_ORDER = [
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
    "kya",
    // Combinations
    "sha",
    "cha",
    "nya",
    "hya",
    "mya",
    "rya",
    "gya",
    "ja",
    "bya",
    "pya",
];
const BUTTON_STORE = [];

const recipe = {
    drawKana: false,
    selectRomanji: true,
    selectKana: true,
    typeRomanji: false,
    listenType: false,
    listenDraw: false,
    wordToKana: false,

    order: 'random', // "focus" or "random"

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
            pya: false,
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
            pya: false,
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function now() {
    return performance.now();
}

async function ensure(predicate, {timeout = 1000, interval = 20, action, message = 'Condition not met'} = {}) {
    const deadline = now() + timeout;

    while (!predicate()) {
        if (now() >= deadline) {
            throw new Error(`${message} after ${timeout}ms`);
        }

        action?.();
        await sleep(interval);
    }
}

class ElementReference {
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

    async wait(timeout = 1000) {
        await ensure(() => this.exists(), {
            timeout,
            message: `Element ${this.selector} not found`,
        });
    }
}

class InputElementReference extends ElementReference {
    async set(value, timeout = 1000) {
        await this.wait(timeout);

        const element = this.get();

        if (element.value.toString() !== value.toString()) {
            element.value = '';

            for (const character of value.toString()) {
                element.dispatchEvent(new KeyboardEvent('keydown', {key: character, bubbles: true}));
                element.value += character;
                element.dispatchEvent(new Event('input', {bubbles: true}));
                element.dispatchEvent(new KeyboardEvent('keyup', {key: character, bubbles: true}));
            }

            element.dispatchEvent(new Event('change', {bubbles: true}));
        }
    }
}

class CheckboxElementReference extends ElementReference {
    isChecked() {
        return this.get().checked;
    }

    async ensureChecked(timeout = 1000) {
        await ensure(() => this.isChecked(), {
            timeout,
            action: () => this.click(),
            message: `Checkbox ${this.selector} not checked`,
        });
    }

    async ensureUnchecked(timeout = 1000) {
        await ensure(() => !this.isChecked(), {
            timeout,
            action: () => this.click(),
            message: `Checkbox ${this.selector} not unchecked`,
        });
    }

    async set(value, timeout = 1000) {
        await this.wait(timeout);

        if (value) {
            await this.ensureChecked(timeout);
        } else {
            await this.ensureUnchecked();
        }
    }
}

class ButtonElementReference extends ElementReference {
    isActive() {
        return !this.hasClass('btn-ghost');
    }

    enable() {
        const element = this.get();

        if (element.classList.contains('disabled')) {
            element.classList.remove('disabled');
        }

        element.disabled = false;
    }

    disable() {
        const element = this.get();

        if (!element.classList.contains('disabled')) {
            element.classList.add('disabled');
        }

        element.disabled = true;
    }

    async ensureActive(timeout = 1000) {
        await ensure(() => this.isActive(), {
            timeout,
            action: () => this.click(),
            message: `Button ${this.selector} not active`,
        });
    }

    async ensureInactive(timeout = 1000) {
        await ensure(() => !this.isActive(), {
            timeout,
            action: () => this.click(),
            message: `Button ${this.selector} not inactive`,
        });
    }

    async set(value, timeout = 1000) {
        await this.wait(timeout);

        if (value) {
            await this.ensureActive();
        } else {
            await this.ensureInactive();
        }
    }
}

class KanaRowElementReference extends ElementReference {
    isActive() {
        return this.hasClass('ring-primary');
    }

    async ensureActive(timeout = 1000) {
        await ensure(() => this.isActive(), {
            timeout,
            action: () => this.click(),
            message: `Button ${this.selector} not active`,
        });
    }

    async ensureInactive(timeout = 1000) {
        await ensure(() => !this.isActive(), {
            timeout,
            action: () => this.click(),
            message: `Button ${this.selector} not inactive`,
        });
    }

    async set(value, timeout = 1000) {
        await this.wait(timeout);

        if (value) {
            await this.ensureActive();
        } else {
            await this.ensureInactive();
        }
    }
}

function createWrapper() {
    const wrapperCard = document.createElement('div');
    wrapperCard.classList.add('card', 'bg-base-100', 'rounded-xs', 'shadow-xs');
    wrapperCard.style.position = 'fixed';
    wrapperCard.style.bottom = '0.5rem';
    wrapperCard.style.right = '0.5rem';

    const wrapperBody = document.createElement('div');
    wrapperBody.classList.add('card-body', 'p-2');

    const label = document.createElement('span');
    label.classList.add('text-sm', 'font-bold');
    label.innerText = 'Nihondex Plus';

    wrapperBody.append(label);
    wrapperCard.append(wrapperBody);

    document.body.append(wrapperCard);

    return wrapperBody;
}

function createButton(label, action) {
    const button = document.createElement('button');
    button.innerText = label;
    button.classList.add('btn', 'btn-xs', 'btn-primary');
    button.addEventListener('click', action.bind(button));

    wrapper.append(button);

    BUTTON_STORE.push(button);

    return new ButtonElementReference(button);
}

const wrapper = createWrapper();

async function applyRecipeOrder(targetOrder, orderRandomButton, orderFocusButton) {
    if (targetOrder === 'random') {
        await orderRandomButton.wait();
        await orderRandomButton.ensureActive();
    } else if (targetOrder === 'focus') {
        await orderFocusButton.wait();
        await orderFocusButton.ensureActive();
    } else {
        throw new Error(`Invalid order: ${targetOrder}. Must be "random" or "focus".`);
    }
}

function* kanaRowMatrix() {
    for (let index = 0; index < KANA_ROW_ORDER.length; index++) {
        // css selector nth-child is 1-indexed
        let column = 1;
        let rowIndex = index + 1;

        if (index >= KANA_COMBINATIONS_OFFSET) {
            column = 3;
            rowIndex -= KANA_COMBINATIONS_OFFSET;
        } else if (index >= KANA_DAKUTEN_OFFSET) {
            column = 2;
            rowIndex -= KANA_DAKUTEN_OFFSET;
        }

        yield {column, rowIndex, index};
    }
}

function loadPracticeKana() {
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

    const button = createButton('Start', async () => {
        button.disable();

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
                // false is hiragana
                await kanaSwitch.set(false);

                for (const {column, rowIndex, index} of kanaRowMatrix()) {
                    const kanaRow = new KanaRowElementReference(`div[data-walkthrough="kana-characters"] > div.grid > div.card:nth-child(${column}) > div.card-body > div.grid > div.card:nth-child(${rowIndex})`);

                    await kanaRow.set(recipe.kana.hiragana[KANA_ROW_ORDER[index]]);
                }

                // true is katakana
                await kanaSwitch.set(true);

                for (const {column, rowIndex, index} of kanaRowMatrix()) {
                    const kanaRow = new KanaRowElementReference(`div[data-walkthrough="kana-characters"] > div.grid > div.card:nth-child(${column}) > div.card-body > div.grid > div.card:nth-child(${rowIndex})`);

                    await kanaRow.set(recipe.kana.katakana[KANA_ROW_ORDER[index]]);
                }
            })(),
        ]);

        button.enable();
    });
}

/**
 * ingame:
 *   div.kana-practice-page
 *   // active-system="katakana" selected-rows="あ,あ" game-count="1" current-streak="0" show-type-indicator="true" listen-mode="false"
 *
 *   div.card-body > div.flex > div:nth-child(1) -- div.kana-display
 *   div.card-body > div.flex > div:nth-child(1) -- div.kana-display + div > button // i don't know button
 *   div.card-body > div.flex > div.grid
 *      --> button > span:first-child --> index
 *      --> button > span:last-child --> character
 *
 * results:
 *   div.kana-practice-page > div > div > div.flex > h2 -- Lesosn complete label, can we use as indicator
 *   div.kana-practice-page > div > div > div.flex > div.grid -- stats overview
 *   div.kana-practice-page > div > div > div.flex > div > button -- show details button
 *   div.kana-practice-page > div > div > div.flex > div > button -- show details button
 *   div.kana-practice-page > div > div > div.flex > div > button + div > div -- details container
 *   div.kana-practice-page > div > div > div.flex > div > button + div > div > div > div:nth-child(2) -- chars + timings
 */

function unloadPracticeKana() {
    for (const buttonReference of BUTTON_STORE) {
        const button = buttonReference.get();

        button.remove()
    }

    BUTTON_STORE.length = 0;
}

async function main() {

    /**
     * @param {URL} url
     */
    function onNavigation(url) {
        if (url.pathname === PRACTICE_KANA_PATH) {
            loadPracticeKana();
        } else {
            unloadPracticeKana();
        }
    }

    for (const method of ['pushState', 'replaceState']) {
        window.history[method] = new Proxy(window.history[method], {
            apply: (target, thisArg, argArray) => {
                const result = target.apply(thisArg, argArray);

                onNavigation(new URL(window.location.href));

                return result;
            },
        });
    }

    window.addEventListener('popstate', () => {
        onNavigation(new URL(window.location.href));
    });

    onNavigation(new URL(window.location.href));
}

(() => {
    main()
        .catch((error) => {
            console.error(error);
        });
})();
