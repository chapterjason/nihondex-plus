import {Page} from './page.js';

export class SubPage extends Page {
    constructor(reference) {
        super();

        this.reference = reference;
        this.loaded = false;
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
    }

    unload() {
        if (!this.loaded) {
            return;
        }

        this.loaded = false;

        this.onUnload();
    }

    onLoad() {
    }

    onUnload() {
    }
}
