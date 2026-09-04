import {ensure} from '../core/ensure.js';
import {recipe} from './recipe.js';
import {KANA_ROW_ORDER, KANA_DAKUTEN_OFFSET, KANA_COMBINATIONS_OFFSET} from './constants.js';
import {BUTTON_STORE, createButton} from '../ui/wrapper.js';
import {ButtonElementReference} from '../dom/button-element-reference.js';
import {CheckboxElementReference} from '../dom/checkbox-element-reference.js';
import {InputElementReference} from '../dom/input-element-reference.js';
import {KanaRowElementReference} from '../dom/kana-row-element-reference.js';
import {KanaGame} from './kana-game.js';

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

function disableAnimations() {
    const style = document.createElement('style');

    style.id = 'nihondex-plus-no-animations';
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
    document.getElementById('nihondex-plus-no-animations')?.remove();
}

function onStartPractice(event) {
    if (event.target.closest('button[data-walkthrough="kana-start"]') === null) {
        return;
    }

    startButton.disable();

    kanaGame = new KanaGame();
    kanaGame.addEventListener('end', () => startButton.enable());
    kanaGame.start();
}

export function loadPracticeKana() {
    if (practiceKanaLoaded) {
        return;
    }

    practiceKanaLoaded = true;

    disableAnimations();

    document.addEventListener('click', onStartPractice, {capture: true, passive: true});

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

    startButton = createButton('Start', async () => {
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

        startButton.enable();
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

export function unloadPracticeKana() {
    for (const buttonReference of BUTTON_STORE) {
        const button = buttonReference.get();

        button.remove()
    }

    BUTTON_STORE.length = 0;
    startButton = null;
    practiceKanaLoaded = false;

    document.removeEventListener('click', onStartPractice, {capture: true});

    enableAnimations();

    if (kanaGame !== null) {
        kanaGame.stop();
        kanaGame = null;
    }
}

let practiceKanaLoaded = false;
let startButton = null;
let kanaGame = null;
