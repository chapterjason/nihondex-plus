import {ElementReference} from './element-reference.js';

export class InputElementReference extends ElementReference {
    async set(value, timeout = 1000) {
        await this.wait(timeout);

        const element = this.get();

        if (element.value.toString() !== value.toString()) {
            element.value = '';

            for (const character of value.toString()) {
                element.dispatchEvent(new KeyboardEvent('keydown', {key: character, bubbles: true}));
                element.value += character;
                element.dispatchEvent(new Event('input', {bubbles: true}));
                element.dispatchEvent(new KeyboardEvent('keyup', {key: character, bubbles: true}));
            }

            element.dispatchEvent(new Event('change', {bubbles: true}));
        }
    }
}
