import {ButtonElementReference} from '../../dom/button-element-reference.js';
import {CheckboxElementReference} from '../../dom/checkbox-element-reference.js';
import {InputElementReference} from '../../dom/input-element-reference.js';
import {KanaRowElementReference} from '../../dom/kana-row-element-reference.js';
import {KANA_ROW_ORDER, KANA_DAKUTEN_OFFSET, KANA_COMBINATIONS_OFFSET} from './constants.js';

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

export class PracticeKanaSetupForm {
    * kanaRowMatrix() {
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

    async applyRecipeOrder(targetOrder, orderRandomButton, orderFocusButton) {
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

    async applyKana(kana) {
        for (const {column, rowIndex, index} of this.kanaRowMatrix()) {
            const kanaRow = new KanaRowElementReference(`div[data-walkthrough="kana-characters"] > div.grid > div.card:nth-child(${column}) > div.card-body > div.grid > div.card:nth-child(${rowIndex})`);

            await kanaRow.set(kana[KANA_ROW_ORDER[index]]);
        }
    }

    async apply(recipe) {
        await Promise.all([
            modeDrawKanaButton.set(recipe.drawKana),
            modeSelectRomanjiButton.set(recipe.selectRomanji),
            modeSelectKanaButton.set(recipe.selectKana),
            modeTypeRomanjiButton.set(recipe.typeRomanji),
            modeListenTypeButton.set(recipe.listenType),
            modeListenDrawButton.set(recipe.listenDraw),
            modeWordToKanaButton.set(recipe.wordToKana),
            this.applyRecipeOrder(recipe.order, orderRandomButton, orderFocusButton),
            sessionSizeInput.set(recipe.size),
            learningCardsCheckbox.set(recipe.learningCards),
            randomFontCheckbox.set(recipe.randomFont),
            (async () => {
                // false is hiragana
                await kanaSwitch.set(false);

                await this.applyKana(recipe.kana.hiragana);

                // true is katakana
                await kanaSwitch.set(true);

                await this.applyKana(recipe.kana.katakana);
            })(),
        ]);
    }
}
