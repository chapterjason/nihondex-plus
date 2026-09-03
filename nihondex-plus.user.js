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

const recipe = {
    drawKana: false,
    selectRomanji: true,
    selectKana: true,
    typeRomanji: false,
    listenType: false,
    listenDraw: false,
    wordToKana: false,

    order: 'focus', // or "random"

    size: 5,
    learningCards: true,
    randomFont: false
}

function isOnPage(path) {
    return document.location.pathname === path;
}

function isOnPracticeKanaPage() {
    return isOnPage(PRACTICE_KANA_PATH);
}

function elementExists(selector) {
    return document.querySelector(selector) != null;
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
    setValue(value) {
        const element = this.get();

        if (element.value.toString() !== value.toString()) {
            element.value = '';

            for (const character of value.toString()) {
                element.dispatchEvent(new KeyboardEvent('keydown', { key: character, bubbles: true }));
                element.value += character;
                element.dispatchEvent(new Event('input', { bubbles: true }));
                element.dispatchEvent(new KeyboardEvent('keyup', { key: character, bubbles: true }));
            }

            element.dispatchEvent(new Event('change', { bubbles: true }));
        }
    }
}

class CheckboxElementReference extends ElementReference {
    isChecked(){
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

    async ensureNotActive(timeout = 1000) {
        await ensure(() => !this.isActive(), {
            timeout,
            action: () => this.click(),
            message: `Button ${this.selector} not inactive`,
        });
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

    async ensureNotActive(timeout = 1000) {
        await ensure(() => !this.isActive(), {
            timeout,
            action: () => this.click(),
            message: `Button ${this.selector} not inactive`,
        });
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

    return new ButtonElementReference(button);
}

const wrapper = createWrapper();

async function applyRecipeMode(targetState, buttonReference) {
    await buttonReference.wait();

    if (targetState) {
        await buttonReference.ensureActive();
    } else {
        await buttonReference.ensureNotActive();
    }
}
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
async function applyRecipeSessionSize(size, sessionSizeInput) {
    await sessionSizeInput.wait();

    await sessionSizeInput.setValue(size);
}
async function applyRecipeCheckbox(targetLearningCards, learningCardsCheckbox) {
    await learningCardsCheckbox.wait();

    if (targetLearningCards) {
        await learningCardsCheckbox.ensureChecked();
    } else {
        await learningCardsCheckbox.ensureUnchecked();
    }
}

function initPracticeKana() {
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

    const rowA = new KanaRowElementReference('div[data-walkthrough="kana-characters"] > div.grid > div.card:nth-child(0) > div.card-body > div.grid');

    const button = createButton('Start', async () => {
        button.disable();

        await Promise.all([
            applyRecipeMode(recipe.drawKana, modeDrawKanaButton),
            applyRecipeMode(recipe.selectRomanji, modeSelectRomanjiButton),
            applyRecipeMode(recipe.selectKana, modeSelectKanaButton),
            applyRecipeMode(recipe.typeRomanji, modeTypeRomanjiButton),
            applyRecipeMode(recipe.listenType, modeListenTypeButton),
            applyRecipeMode(recipe.listenDraw, modeListenDrawButton),
            applyRecipeMode(recipe.wordToKana, modeWordToKanaButton),
            applyRecipeOrder(recipe.order, orderRandomButton, orderFocusButton),
            applyRecipeSessionSize(recipe.size, sessionSizeInput),
            applyRecipeCheckbox(recipe.learningCards, learningCardsCheckbox),
            applyRecipeCheckbox(recipe.randomFont, randomFontCheckbox),
            applyRow(recipe.row.hiragana.a, rowA),
        ]);

        button.enable();
    });
}

async function main() {
    if (isOnPracticeKanaPage()) {
        initPracticeKana();
    }
}

(() => {
    main()
        .catch((error) => {
            console.error(error);
        });
})();
