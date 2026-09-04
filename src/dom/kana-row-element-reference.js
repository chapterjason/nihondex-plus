import {ensure} from '../core/ensure.js';
import {ElementReference} from './element-reference.js';

export class KanaRowElementReference extends ElementReference {
    isActive() {
        return this.hasClass('ring-primary');
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
