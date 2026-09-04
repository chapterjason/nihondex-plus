import {hideElements} from './hide-elements.js';

export class HiddenStyles {
    constructor() {
        this.styles = [];
    }

    add(selector) {
        this.styles.push(hideElements(selector));
    }

    clear() {
        for (const style of this.styles) {
            style.remove();
        }

        this.styles = [];
    }
}
