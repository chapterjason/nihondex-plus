import {SubPage} from '../../core/sub-page.js';
import {panel} from '../../ui/panel.js';
import {UiDropdown} from '../../ui/ui-dropdown.js';
import {PracticeKanaSetupForm} from './practice-kana-setup-form.js';
import {loadRecipes} from '../../recipes.js';
import {PRACTICE_KANA} from './constants.js';

export const STARTED_BY_RECIPE = 'recipe';

export const STARTED_BY_MANUAL = 'manual';

const MANUAL = {
    by: STARTED_BY_MANUAL,
    recipe: null,
    id: null,
};

export class PracticeKanaSetupPage extends SubPage {
    constructor() {
        super('button[data-walkthrough="kana-start"]');

        this.form = new PracticeKanaSetupForm();
        this.recipes = [];
        this.applied = null;
        this.element = null;
        this.dropdown = null;
        this.onStartClick = () => this.onStart();
    }

    items() {
        return this.recipes.map((recipe) => ({value: recipe.id, label: recipe.name}));
    }

    async refresh() {
        this.recipes = await loadRecipes(PRACTICE_KANA);

        this.dropdown?.set(this.items());
        this.dropdown?.enable();
    }

    async apply(id) {
        const recipe = this.recipes.find((stored) => stored.id === id);

        if (recipe === undefined) {
            return;
        }

        this.dropdown.disable();

        await this.form.apply(recipe.settings);

        this.applied = {by: STARTED_BY_RECIPE, recipe: recipe.name, id: recipe.id};

        this.element.click();
    }

    onLoad() {
        this.element = this.reference.get();
        this.element.addEventListener('click', this.onStartClick);

        this.applied = null;
        this.dropdown = new UiDropdown('Recipes', this.items());

        this.dropdown.addEventListener('select', (event) => this.apply(event.detail));

        this.dropdown.disable();

        panel.add(this.dropdown);

        this.refresh();
    }

    onUnload() {
        this.element.removeEventListener('click', this.onStartClick);
        this.element = null;

        panel.remove(this.dropdown);

        this.dropdown = null;
    }

    onStart() {
        this.dropdown.disable();

        this.dispatchEvent(new CustomEvent('start', {detail: this.applied ?? MANUAL}));
    }
}
