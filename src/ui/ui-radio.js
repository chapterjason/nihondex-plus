import {UiElement} from './ui-element.js';
import {id} from '../util/id.js';

export class UiRadio extends UiElement {
    constructor(label, options = [], value = null) {
        super();

        this.name = id();
        this.options = this.element.lastElementChild;
        this.element.firstElementChild.innerText = label;

        this.set(options, value);
    }

    render() {
        const control = document.createElement('div');

        control.classList.add('flex', 'flex-col', 'gap-1');

        const text = document.createElement('span');

        text.classList.add('text-xs', 'font-bold');

        const options = document.createElement('div');

        options.classList.add('flex', 'flex-row', 'gap-3');

        control.append(text, options);

        return control;
    }

    set(options, value = this.get()) {
        this.options.replaceChildren(...options.map((option) => this.option(option, value)));
    }

    option({value, label}, checked) {
        const control = document.createElement('label');

        control.classList.add('label', 'cursor-pointer', 'flex', 'flex-row', 'gap-1', 'p-0');

        const input = document.createElement('input');

        input.classList.add('radio', 'radio-xs');
        input.type = 'radio';
        input.name = this.name;
        input.value = value;
        input.checked = value === checked;
        input.addEventListener('change', () => this.emit('change', this.get()));

        const text = document.createElement('span');

        text.classList.add('text-xs');
        text.innerText = label;

        control.append(input, text);

        return control;
    }

    get() {
        return this.options.querySelector('input:checked')?.value ?? null;
    }

    select(value) {
        for (const input of this.options.querySelectorAll('input')) {
            input.checked = input.value === value;
        }
    }

    enable() {
        this.element.classList.remove('opacity-50');

        for (const input of this.options.querySelectorAll('input')) {
            input.disabled = false;
        }
    }

    disable() {
        this.element.classList.add('opacity-50');

        for (const input of this.options.querySelectorAll('input')) {
            input.disabled = true;
        }
    }
}
