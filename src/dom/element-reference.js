import {ensure} from '../core/ensure.js';

export class ElementReference {
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

    addClass(className) {
        this.get().classList.add(className);
    }

    removeClass(className) {
        this.get().classList.remove(className);
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
