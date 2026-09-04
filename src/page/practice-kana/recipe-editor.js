import {UiModal} from '../../ui/ui-modal.js';
import {UiInput} from '../../ui/ui-input.js';
import {UiCheckbox} from '../../ui/ui-checkbox.js';
import {UiRadio} from '../../ui/ui-radio.js';
import {UiButton} from '../../ui/ui-button.js';
import {UiFieldset} from '../../ui/ui-fieldset.js';
import {id} from '../../util/id.js';
import {PRACTICE_KANA, KANA_ROW_ORDER} from './constants.js';

const MODES = [
    ['drawKana', 'Draw kana'],
    ['selectRomanji', 'Multiple choice'],
    ['selectKana', 'Romaji to kana'],
    ['typeRomanji', 'Kana to romaji'],
    ['listenType', 'Listen & type'],
    ['listenDraw', 'Listen & draw'],
    ['wordToKana', 'Word to kana'],
];

const ORDER_RANDOM = 'random';

const ORDER_FOCUS = 'focus';

const ORDERS = [
    {value: ORDER_RANDOM, label: 'Random'},
    {value: ORDER_FOCUS, label: 'Focus'},
];

export class RecipeEditor extends EventTarget {
    constructor() {
        super();

        this.recipe = null;
        this.modal = new UiModal('Recipe');

        this.name = new UiInput('Name');
        this.size = new UiInput('Size', '20', 'number');
        this.order = new UiRadio('Order', ORDERS, ORDER_RANDOM);
        this.saveButton = new UiButton('Save');

        this.saveButton.addEventListener('click', () => this.save());

        this.modes = new Map(MODES.map(([mode]) => [mode, new UiCheckbox(RecipeEditor.label(mode))]));
        this.hiragana = new Map(KANA_ROW_ORDER.map((row) => [row, new UiCheckbox(row)]));
        this.katakana = new Map(KANA_ROW_ORDER.map((row) => [row, new UiCheckbox(row)]));

        this.modal.add(this.name);
        this.modal.add(this.size);
        this.modal.add(this.order);
        this.modal.add(RecipeEditor.fieldset('Modes', this.modes, 2));
        this.modal.add(RecipeEditor.fieldset('Hiragana', this.hiragana, 4));
        this.modal.add(RecipeEditor.fieldset('Katakana', this.katakana, 4));
        this.modal.add(this.saveButton);
    }

    static label(mode) {
        return MODES.find(([name]) => name === mode)[1];
    }

    static fieldset(label, checkboxes, columns) {
        const fieldset = new UiFieldset(label, columns);

        for (const checkbox of checkboxes.values()) {
            fieldset.add(checkbox);
        }

        return fieldset;
    }

    static values(checkboxes) {
        return Object.fromEntries([...checkboxes].map(([key, checkbox]) => [key, checkbox.get()]));
    }

    static fill(checkboxes, values = {}) {
        for (const [key, checkbox] of checkboxes) {
            checkbox.set(values[key] === true);
        }
    }

    mount(parent) {
        this.modal.mount(parent);
    }

    open(recipe) {
        this.recipe = recipe;

        const settings = recipe?.settings ?? {};

        this.name.set(recipe?.name ?? '');
        this.size.set(settings.size ?? 20);
        this.order.select(settings.order ?? ORDER_RANDOM);

        RecipeEditor.fill(this.modes, settings);
        RecipeEditor.fill(this.hiragana, settings.kana?.hiragana);
        RecipeEditor.fill(this.katakana, settings.kana?.katakana);

        this.modal.open();
    }

    save() {
        this.dispatchEvent(new CustomEvent('save', {detail: {
            id: this.recipe?.id ?? id(),
            module: PRACTICE_KANA,
            name: this.name.get(),
            settings: {
                ...RecipeEditor.values(this.modes),
                order: this.order.get(),
                size: Number(this.size.get()),
                learningCards: false,
                randomFont: true,
                kana: {
                    hiragana: RecipeEditor.values(this.hiragana),
                    katakana: RecipeEditor.values(this.katakana),
                },
            },
        }}));

        this.modal.close();
    }
}
