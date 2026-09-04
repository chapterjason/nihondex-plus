import {UiModal} from './ui/ui-modal.js';
import {UiInput} from './ui/ui-input.js';
import {UiCheckbox} from './ui/ui-checkbox.js';
import {UiButton} from './ui/ui-button.js';
import {UiList} from './ui/ui-list.js';
import {UiConfirm} from './ui/ui-confirm.js';
import {RecipeEditor} from './page/practice-kana/recipe-editor.js';
import {settings} from './util/settings.js';
import {CUSTOM, RECIPES, RESULTS, SERVER} from './settings.js';
import {customRecipes, deleteRecipe, findRecipe, saveRecipe} from './recipes.js';

function toggle(element, enabled) {
    if (enabled) {
        element.enable();

        return;
    }

    element.disable();
}

export class SettingsModal {
    constructor() {
        this.pending = null;
        this.modal = new UiModal('Settings');
        this.confirm = new UiConfirm('Delete recipe');
        this.editor = new RecipeEditor();

        this.server = new UiCheckbox(SERVER.label, settings.get(SERVER.name, SERVER.value));
        this.results = new UiInput(RESULTS.label, settings.get(RESULTS.name, RESULTS.value));
        this.recipes = new UiInput(RECIPES.label, settings.get(RECIPES.name, RECIPES.value));
        this.list = new UiList(CUSTOM.label, this.items());
        this.add = new UiButton('Add recipe');

        this.listen();

        this.modal.add(this.server);
        this.modal.add(this.results);
        this.modal.add(this.recipes);
        this.modal.add(this.list);
        this.modal.add(this.add);

        this.update(settings.get(SERVER.name, SERVER.value));
    }

    items() {
        return customRecipes().map((recipe) => ({value: recipe.id, label: recipe.name}));
    }

    listen() {
        this.server.addEventListener('change', (event) => {
            settings.set(SERVER.name, event.detail);

            this.update(event.detail);
        });

        this.results.addEventListener('change', (event) => settings.set(RESULTS.name, event.detail));
        this.recipes.addEventListener('change', (event) => settings.set(RECIPES.name, event.detail));

        this.add.addEventListener('click', () => this.editor.open(null));

        this.list.addEventListener('edit', (event) => this.editor.open(findRecipe(event.detail)));

        this.list.addEventListener('delete', (event) => {
            this.pending = event.detail;

            this.confirm.open(`Delete "${findRecipe(this.pending).name}"?`);
        });

        this.confirm.addEventListener('confirm', () => {
            deleteRecipe(this.pending);

            this.list.set(this.items());
        });

        this.editor.addEventListener('save', (event) => {
            saveRecipe(event.detail);

            this.list.set(this.items());
        });
    }

    update(server) {
        toggle(this.results, server);
        toggle(this.recipes, server);
        toggle(this.list, !server);
        toggle(this.add, !server);
    }

    mount(parent) {
        this.modal.mount(parent);
        this.confirm.mount(parent);
        this.editor.mount(parent);
    }

    open() {
        this.modal.open();
    }
}
