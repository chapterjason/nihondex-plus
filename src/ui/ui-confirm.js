import {UiElement} from './ui-element.js';

export class UiConfirm extends UiElement {
    constructor(label) {
        super();

        this.message = this.element.firstElementChild.children[1];
        this.element.firstElementChild.firstElementChild.innerText = label;
    }

    render() {
        const dialog = document.createElement('dialog');

        dialog.classList.add('modal');

        const box = document.createElement('div');

        box.classList.add('modal-box', 'flex', 'flex-col', 'gap-2');

        const title = document.createElement('h3');

        title.classList.add('text-sm', 'font-bold');

        const message = document.createElement('span');

        message.classList.add('text-xs');

        const actions = document.createElement('form');

        actions.method = 'dialog';
        actions.classList.add('flex', 'flex-row', 'gap-2', 'justify-end');

        const cancel = document.createElement('button');

        cancel.classList.add('btn', 'btn-xs');
        cancel.innerText = 'Cancel';

        const confirm = document.createElement('button');

        confirm.classList.add('btn', 'btn-xs', 'btn-error');
        confirm.innerText = 'Delete';
        confirm.addEventListener('click', () => this.emit('confirm'));

        actions.append(cancel, confirm);
        box.append(title, message, actions);
        dialog.append(box);

        return dialog;
    }

    open(message) {
        this.message.innerText = message;

        this.element.showModal();
    }
}
