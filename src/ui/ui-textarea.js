import {UiElement} from './ui-element.js';

const ROWS = 10;

export class UiTextarea extends UiElement {
    constructor(label, value = '') {
        super();

        this.textarea = this.element.lastElementChild;
        this.element.firstElementChild.innerText = label;
        this.textarea.value = value;
        this.textarea.addEventListener('change', () => this.emit('change', this.get()));
    }

    render() {
        const control = document.createElement('label');

        control.classList.add('form-control', 'flex', 'flex-col', 'gap-1');

        const text = document.createElement('span');

        text.classList.add('text-xs');

        const textarea = document.createElement('textarea');

        textarea.classList.add('textarea', 'textarea-xs', 'textarea-bordered', 'font-mono');
        textarea.readOnly = true;
        textarea.rows = ROWS;

        control.append(text, textarea);

        return control;
    }

    get() {
        return this.textarea.value;
    }

    set(value) {
        this.textarea.value = value;
    }

    select() {
        this.textarea.select();
    }
}
