import {ensure} from '../core/ensure.js';
import {ElementReference} from './element-reference.js';

export class CheckboxElementReference extends ElementReference {
    isChecked() {
        return this.get().checked;
    }

    async ensureChecked(timeout = 1000) {
        await ensure(() => this.isChecked(), {
            timeout,
            action: () => this.click(),
            message: `Checkbox ${this.selector} not checked`,
        });
    }

    async ensureUnchecked(timeout = 1000) {
        await ensure(() => !this.isChecked(), {
            timeout,
            action: () => this.click(),
            message: `Checkbox ${this.selector} not unchecked`,
        });
    }

    async set(value, timeout = 1000) {
        await this.wait(timeout);

        if (value) {
            await this.ensureChecked(timeout);
        } else {
            await this.ensureUnchecked();
        }
    }
}
