import {SubPage} from '../../core/sub-page.js';
import {ButtonElementReference} from '../../dom/button-element-reference.js';
import {Wrapper} from '../../ui/wrapper.js';
import {PracticeKanaSetupForm} from './practice-kana-setup-form.js';
import {recipe} from './recipe.js';

export class PracticeKanaSetupPage extends SubPage {
    constructor() {
        super(new ButtonElementReference('button[data-walkthrough="kana-start"]'));

        this.form = new PracticeKanaSetupForm();
        this.element = null;
        this.startButton = null;
        this.onStartClick = (event) => this.onStart(event);
    }

    onLoad() {
        this.element = this.reference.get();
        this.element.addEventListener('click', this.onStartClick);

        this.startButton = Wrapper.addButton('Start', async () => {
            this.startButton.disable();

            await this.form.apply(recipe);

            this.startButton.enable();
        });
    }

    onUnload() {
        this.element.removeEventListener('click', this.onStartClick);
        this.element = null;

        Wrapper.removeButton(this.startButton.get());

        this.startButton = null;
    }

    onStart(event) {
        this.startButton.disable();

        this.dispatchEvent(new CustomEvent('start'));
    }
}
