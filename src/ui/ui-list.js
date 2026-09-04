import {UiElement} from './ui-element.js';

export class UiList extends UiElement {
    constructor(label, items = []) {
        super();

        this.list = this.element.lastElementChild;
        this.element.firstElementChild.innerText = label;

        this.set(items);
    }

    render() {
        const control = document.createElement('div');

        control.classList.add('flex', 'flex-col', 'gap-1');

        const text = document.createElement('span');

        text.classList.add('text-xs', 'font-bold');

        const list = document.createElement('ul');

        list.classList.add('flex', 'flex-col', 'gap-1');

        control.append(text, list);

        return control;
    }

    row({value, label}) {
        const item = document.createElement('li');

        item.classList.add('flex', 'flex-row', 'items-center', 'gap-2');

        const text = document.createElement('span');

        text.classList.add('text-xs', 'grow', 'truncate');
        text.innerText = label;

        item.append(
            text,
            this.button('Edit', () => this.emit('edit', value)),
            this.button('Delete', () => this.emit('delete', value)),
        );

        return item;
    }

    button(label, action) {
        const button = document.createElement('button');

        button.classList.add('btn', 'btn-xs', 'btn-ghost');
        button.innerText = label;
        button.addEventListener('click', action);

        return button;
    }

    set(items) {
        this.list.replaceChildren(...items.map((item) => this.row(item)));
    }

    enable() {
        this.element.classList.remove('opacity-50', 'pointer-events-none');
    }

    disable() {
        this.element.classList.add('opacity-50', 'pointer-events-none');
    }
}
