import {observer} from './observer.js';
import {ElementReference} from '../dom/element-reference.js';

export class Page extends EventTarget {
    constructor(selector) {
        super();

        this.reference = new ElementReference(selector);
        this.loaded = false;
        this.onCheck = () => this.check();

        observer.addEventListener('mutation', this.onCheck);
    }

    check() {
        if (this.reference.exists()) {
            this.load();

            return;
        }

        this.unload();
    }

    load() {
        if (this.loaded) {
            return;
        }

        this.loaded = true;

        this.onLoad();

        this.dispatchEvent(new CustomEvent('load'));
    }

    unload() {
        if (!this.loaded) {
            return;
        }

        this.loaded = false;

        this.onUnload();

        this.dispatchEvent(new CustomEvent('unload'));
    }

    onLoad() {
    }

    onUnload() {
    }
}
