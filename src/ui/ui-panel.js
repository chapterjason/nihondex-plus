import {UiElement} from './ui-element.js';

export class UiPanel extends UiElement {
    constructor(label) {
        super();

        this.children = [];
        this.body = this.element.firstElementChild;
        this.body.firstElementChild.innerText = label;
    }

    render() {
        const card = document.createElement('div');

        card.classList.add('card', 'bg-base-100', 'rounded-xs', 'shadow-xs', 'overflow-visible');
        card.style.position = 'fixed';
        card.style.zIndex = '200';
        card.style.bottom = '0.5rem';
        card.style.right = '0.5rem';

        const body = document.createElement('div');

        body.classList.add('card-body', 'p-2');

        const title = document.createElement('span');

        title.classList.add('text-sm', 'font-bold');

        body.append(title);
        card.append(body);

        return card;
    }

    add(child) {
        this.children.push(child);

        child.mount(this.body);
    }

    remove(child) {
        this.children = this.children.filter((stored) => stored !== child);

        child.unmount();
    }
}
