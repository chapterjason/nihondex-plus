import {observer} from '../../core/observer.js';

export class KanaGame extends EventTarget {
    constructor() {
        super();

        this.started = false;
        this.onCheck = () => this.check();
    }

    start() {
        observer.addEventListener('mutation', this.onCheck);
    }

    stop() {
        observer.removeEventListener('mutation', this.onCheck);
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
