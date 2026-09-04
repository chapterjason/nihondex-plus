import {UiElement} from './ui-element.js';

export class UiDropdown extends UiElement {
    constructor(label, items = []) {
        super();

        this.trigger = this.element.firstElementChild;
        this.menu = this.element.lastElementChild;
        this.trigger.innerText = label;

        this.set(items);
    }

    render() {
        const dropdown = document.createElement('div');

        dropdown.classList.add('dropdown', 'dropdown-top', 'dropdown-end', 'w-full');

        const trigger = document.createElement('button');

        trigger.classList.add('btn', 'btn-xs', 'btn-primary', 'w-full');
        trigger.tabIndex = 0;

        const menu = document.createElement('ul');

        menu.classList.add('dropdown-content', 'menu', 'bg-base-100', 'rounded-box', 'shadow', 'p-1', 'z-[200]', 'w-max', 'min-w-full', 'flex-nowrap', 'max-h-64', 'overflow-y-auto');
        menu.tabIndex = 0;
        menu.style.top = 'auto';
        menu.style.left = 'auto';
        menu.style.bottom = '0';
        menu.style.right = '100%';
        menu.style.marginRight = '0.25rem';

        dropdown.append(trigger, menu);

        return dropdown;
    }

    set(items) {
        const groups = new Map();

        for (const {value, label} of items) {
            const [first, ...rest] = label.split(' ');
            const group = rest.length === 0 ? null : first;
            const entry = {value, label: rest.length === 0 ? label : rest.join(' ')};

            groups.set(group, [...groups.get(group) ?? [], entry]);
        }

        this.menu.replaceChildren(...[...groups].flatMap(([group, entries]) => [
            ...group === null ? [] : [this.title(group)],
            ...entries.map((entry) => this.item(entry)),
        ]));
    }

    title(label) {
        const title = document.createElement('li');

        title.classList.add('menu-title', 'text-xs', 'px-2', 'py-0');
        title.innerText = label;

        return title;
    }

    item({value, label}) {
        const item = document.createElement('li');
        const button = document.createElement('button');

        button.classList.add('text-xs');
        button.innerText = label;
        button.addEventListener('click', () => {
            this.close();
            this.emit('select', value);
        });

        item.append(button);

        return item;
    }

    close() {
        this.trigger.blur();
        this.menu.blur();
    }

    enable() {
        this.trigger.classList.remove('disabled');
        this.trigger.disabled = false;
    }

    disable() {
        this.trigger.classList.add('disabled');
        this.trigger.disabled = true;
    }
}
