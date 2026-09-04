import {UiElement} from './ui-element.js';

export class UiFieldset extends UiElement {
    constructor(label, columns = 2) {
        super();

        this.children = [];
        this.content = this.element.lastElementChild;
        this.element.firstElementChild.innerText = label;
        this.content.style.gridTemplateColumns = `repeat(${columns}, minmax(0, 1fr))`;
    }

    render() {
        const fieldset = document.createElement('div');

        fieldset.classList.add('flex', 'flex-col', 'gap-1');

        const text = document.createElement('span');

        text.classList.add('text-xs', 'font-bold');

        const content = document.createElement('div');

        content.classList.add('grid', 'gap-x-2');

        fieldset.append(text, content);

        return fieldset;
    }

    add(child) {
        this.children.push(child);

        child.mount(this.content);
    }
}
