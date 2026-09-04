import {UiModal} from './ui/ui-modal.js';
import {UiTextarea} from './ui/ui-textarea.js';

export class ResultsModal {
    constructor() {
        this.modal = new UiModal('Results');
        this.output = new UiTextarea('Session');

        this.modal.add(this.output);
    }

    mount(parent) {
        this.modal.mount(parent);
    }

    show(session) {
        this.output.set(JSON.stringify(session, null, 4));

        this.modal.open();
        this.output.select();
    }
}
