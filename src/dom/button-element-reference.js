import {ensure} from '../core/ensure.js';
import {ElementReference} from './element-reference.js';

export class ButtonElementReference extends ElementReference {
    isActive() {
        return !this.hasClass('btn-ghost');
    }

    enable() {
        const element = this.get();

        if (element.classList.contains('disabled')) {
            element.classList.remove('disabled');
        }

        element.disabled = false;
    }

    disable() {
        const element = this.get();

        if (!element.classList.contains('disabled')) {
            element.classList.add('disabled');
        }

        element.disabled = true;
    }

    async ensureActive(timeout = 1000) {
        await ensure(() => this.isActive(), {
            timeout,
            action: () => this.click(),
            message: `Button ${this.selector} not active`,
        });
    }

    async ensureInactive(timeout = 1000) {
        await ensure(() => !this.isActive(), {
            timeout,
            action: () => this.click(),
            message: `Button ${this.selector} not inactive`,
        });
    }

    async set(value, timeout = 1000) {
        await this.wait(timeout);

        if (value) {
            await this.ensureActive();
        } else {
            await this.ensureInactive();
        }
    }
}
