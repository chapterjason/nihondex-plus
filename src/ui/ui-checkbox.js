import {UiElement} from './ui-element.js';

export class UiCheckbox extends UiElement {
    constructor(label, value = false) {
        super();

        this.input = this.element.firstElementChild;
        this.element.lastElementChild.innerText = label;
        this.input.checked = value;
        this.input.addEventListener('change', () => this.emit('change', this.get()));
    }

    render() {
        const control = document.createElement('label');

        control.classList.add('label', 'cursor-pointer', 'flex', 'flex-row', 'gap-2', 'justify-start', 'p-0');

        const input = document.createElement('input');

        input.classList.add('checkbox', 'checkbox-xs');
        input.type = 'checkbox';

        const text = document.createElement('span');

        text.classList.add('text-xs');

        control.append(input, text);

        return control;
    }

    get() {
        return this.input.checked;
    }

    set(value) {
        this.input.checked = value;
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
