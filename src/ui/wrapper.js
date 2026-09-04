import {ButtonElementReference} from '../dom/button-element-reference.js';

export const BUTTON_STORE = [];

function createWrapper() {
    const wrapperCard = document.createElement('div');
    wrapperCard.classList.add('card', 'bg-base-100', 'rounded-xs', 'shadow-xs');
    wrapperCard.style.position = 'fixed';
    wrapperCard.style.bottom = '0.5rem';
    wrapperCard.style.right = '0.5rem';

    const wrapperBody = document.createElement('div');
    wrapperBody.classList.add('card-body', 'p-2');

    const label = document.createElement('span');
    label.classList.add('text-sm', 'font-bold');
    label.innerText = 'Nihondex Plus';

    wrapperBody.append(label);
    wrapperCard.append(wrapperBody);

    document.body.append(wrapperCard);

    return wrapperBody;
}

export function createButton(label, action) {
    const button = document.createElement('button');
    button.innerText = label;
    button.classList.add('btn', 'btn-xs', 'btn-primary');
    button.addEventListener('click', action.bind(button));

    wrapper.append(button);

    BUTTON_STORE.push(button);

    return new ButtonElementReference(button);
}

const wrapper = createWrapper();
