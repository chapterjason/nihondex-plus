import {ButtonElementReference} from '../dom/button-element-reference.js';

export class Wrapper {
    static card = null;

    static body = null;

    static buttons = [];

    static create() {
        Wrapper.card = document.createElement('div');
        Wrapper.card.classList.add('card', 'bg-base-100', 'rounded-xs', 'shadow-xs');
        Wrapper.card.style.position = 'fixed';
        Wrapper.card.style.bottom = '0.5rem';
        Wrapper.card.style.right = '0.5rem';

        Wrapper.body = document.createElement('div');
        Wrapper.body.classList.add('card-body', 'p-2');

        const label = document.createElement('span');
        label.classList.add('text-sm', 'font-bold');
        label.innerText = 'Nihondex Plus';

        Wrapper.body.append(label);
        Wrapper.card.append(Wrapper.body);

        document.body.append(Wrapper.card);
    }

    static get() {
        if (Wrapper.body === null) {
            Wrapper.create();
        }

        return Wrapper.body;
    }

    static addButton(label, action) {
        const button = document.createElement('button');

        button.innerText = label;
        button.classList.add('btn', 'btn-xs', 'btn-primary');
        button.addEventListener('click', action.bind(button));

        Wrapper.get().append(button);
        Wrapper.buttons.push(button);

        return new ButtonElementReference(button);
    }

    static removeButton(button) {
        button.remove();

        Wrapper.buttons = Wrapper.buttons.filter((stored) => stored !== button);
    }

    static clear() {
        for (const button of Wrapper.buttons) {
            button.remove();
        }

        Wrapper.buttons = [];
    }

    static remove() {
        Wrapper.clear();

        if (Wrapper.card !== null) {
            Wrapper.card.remove();
        }

        Wrapper.card = null;
        Wrapper.body = null;
    }
}
