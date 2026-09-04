export class KanaGame extends EventTarget {
    constructor() {
        super();

        this.started = false;
        this.observer = new MutationObserver(() => this.check());
    }

    start() {
        this.observer.observe(document.body, {subtree: true, childList: true});
    }

    stop() {
        this.observer.disconnect();
    }

    check() {
        if (document.querySelector('[active-system]') !== null) {
            this.started = true;

            return;
        }

        if (!this.started) {
            return;
        }

        this.started = false;

        this.stop();
        this.dispatchEvent(new CustomEvent('end'));
    }
}
