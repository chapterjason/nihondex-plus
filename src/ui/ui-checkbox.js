import {UiElement} from './ui-element.js';

export class UiCheckbox extends UiElement {
    constructor(label, value, action) {
        super();

        this.input = this.element.firstElementChild;
        this.element.lastElementChild.innerText = label;
        this.input.checked = value;
        this.input.addEventListener('change', () => action(this.input.checked));
    }

    render() {
        const control = document.createElement('label');

        control.classList.add('label', 'cursor-pointer', 'flex', 'flex-row', 'gap-2', 'justify-start');

        const input = document.createElement('input');

        input.classList.add('checkbox', 'checkbox-xs');
        input.type = 'checkbox';

        const text = document.createElement('span');

        text.classList.add('text-xs');

        control.append(input, text);

        return control;
    }
}
