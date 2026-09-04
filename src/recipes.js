import {settings} from './util/settings.js';
import {get} from './util/get.js';
import {CUSTOM, RECIPES, SERVER} from './settings.js';
import {recipes as defaults} from './page/practice-kana/recipes.js';

export function customRecipes() {
    return settings.get(CUSTOM.name, defaults);
}

export function storeRecipes(recipes) {
    settings.set(CUSTOM.name, recipes);
}

export function findRecipe(id) {
    return customRecipes().find((recipe) => recipe.id === id) ?? null;
}

export function saveRecipe(recipe) {
    storeRecipes([...customRecipes().filter((stored) => stored.id !== recipe.id), recipe]);
}

export function deleteRecipe(id) {
    storeRecipes(customRecipes().filter((recipe) => recipe.id !== id));
}

export async function loadRecipes(module) {
    const local = () => customRecipes().filter((recipe) => recipe.module === module);

    if (!settings.get(SERVER.name, SERVER.value)) {
        return local();
    }

    const url = new URL(settings.get(RECIPES.name, RECIPES.value));

    url.searchParams.set('module', module);

    return get(url.toString()).catch((error) => {
        console.error(error);

        return local();
    });
}
