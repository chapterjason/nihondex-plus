import {UiElement} from './ui-element.js';

export class UiButton extends UiElement {
    constructor(label) {
        super();

        this.element.innerText = label;
        this.element.addEventListener('click', () => this.emit('click'));
    }

    render() {
        const button = document.createElement('button');

        button.classList.add('btn', 'btn-xs', 'btn-primary');

        return button;
    }

    enable() {
        this.element.classList.remove('disabled');
        this.element.disabled = false;
    }

    disable() {
        this.element.classList.add('disabled');
        this.element.disabled = true;
    }
}
