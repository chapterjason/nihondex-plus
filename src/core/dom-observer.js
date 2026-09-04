export class DomObserver extends EventTarget {
    constructor() {
        super();

        this.listeners = 0;
        this.observer = new MutationObserver(() => this.notify());
    }

    addEventListener(type, listener, options) {
        super.addEventListener(type, listener, options);

        this.listeners += 1;

        if (this.listeners === 1) {
            this.observer.observe(document.body, {subtree: true, childList: true});
        }
    }

    removeEventListener(type, listener, options) {
        super.removeEventListener(type, listener, options);

        this.listeners -= 1;

        if (this.listeners === 0) {
            this.observer.disconnect();
        }
    }

    notify() {
        this.dispatchEvent(new CustomEvent('mutation'));
    }
}
