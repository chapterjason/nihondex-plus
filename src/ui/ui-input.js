import {UiElement} from './ui-element.js';

export class UiInput extends UiElement {
    constructor(label, value = '', type = 'text') {
        super();

        this.input = this.element.lastElementChild;
        this.element.firstElementChild.innerText = label;
        this.input.type = type;
        this.input.value = value;
        this.input.addEventListener('change', () => this.emit('change', this.get()));
    }

    render() {
        const control = document.createElement('label');

        control.classList.add('form-control', 'flex', 'flex-col', 'gap-1');

        const text = document.createElement('span');

        text.classList.add('text-xs');

        const input = document.createElement('input');

        input.classList.add('input', 'input-xs', 'input-bordered');

        control.append(text, input);

        return control;
    }

    get() {
        return this.input.value;
    }

    set(value) {
        this.input.value = value;
    }

    enable() {
        this.element.classList.remove('opacity-50');
        this.input.disabled = false;
    }

    disable() {
        this.element.classList.add('opacity-50');
        this.input.disabled = true;
    }
}
