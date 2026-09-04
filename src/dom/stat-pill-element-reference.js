import {ElementReference} from './element-reference.js';

const NUMBER = /(\d+)/;

const DIGITS = /^\d+$/;

export class StatPillElementReference extends ElementReference {
    getLabel() {
        return this.get().lastElementChild.textContent.trim();
    }

    getValue() {
        return this.get().querySelector('span').textContent.trim();
    }

    getNumber() {
        const match = this.getValue().match(NUMBER);

        return match === null ? null : Number(match[1]);
    }

    getSeconds() {
        const parts = this.getValue().split(':');

        return parts.every((part) => DIGITS.test(part))
            ? parts.reduce((total, part) => total * 60 + Number(part), 0)
            : null;
    }
}
