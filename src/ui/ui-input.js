import {UiElement} from './ui-element.js';

export class UiInput extends UiElement {
    constructor(label, value, action) {
        super();

        this.input = this.element.lastElementChild;
        this.element.firstElementChild.innerText = label;
        this.input.value = value;
        this.input.addEventListener('change', () => action(this.input.value));
    }

    render() {
        const control = document.createElement('label');

        control.classList.add('form-control', 'flex', 'flex-col', 'gap-1');

        const text = document.createElement('span');

        text.classList.add('text-xs');

        const input = document.createElement('input');

        input.classList.add('input', 'input-xs', 'input-bordered');
        input.type = 'text';

        control.append(text, input);

        return control;
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
