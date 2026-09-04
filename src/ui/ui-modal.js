import {UiElement} from './ui-element.js';

export class UiModal extends UiElement {
    constructor(label) {
        super();

        this.children = [];
        this.box = this.element.firstElementChild;
        this.content = this.box.children[1];
        this.box.firstElementChild.innerText = label;
    }

    render() {
        const dialog = document.createElement('dialog');

        dialog.classList.add('modal');

        const box = document.createElement('div');

        box.classList.add('modal-box', 'flex', 'flex-col', 'gap-2');

        const title = document.createElement('h3');

        title.classList.add('text-sm', 'font-bold');

        const form = document.createElement('form');

        form.method = 'dialog';
        form.classList.add('modal-backdrop');

        const close = document.createElement('button');

        close.innerText = 'Close';
        close.classList.add('btn', 'btn-xs');

        const content = document.createElement('div');

        content.classList.add('flex', 'flex-col', 'gap-2');

        box.append(title, content, form);
        form.append(close);
        dialog.append(box);

        return dialog;
    }

    add(child) {
        this.children.push(child);

        child.mount(this.content);
    }

    remove(child) {
        this.children = this.children.filter((stored) => stored !== child);

        child.unmount();
    }

    open() {
        this.element.showModal();
    }

    close() {
        this.element.close();
    }
}
