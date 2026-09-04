import {SubPage} from '../../core/sub-page.js';
import {ButtonElementReference} from '../../dom/button-element-reference.js';
import {panel} from '../../ui/panel.js';
import {UiButton} from '../../ui/ui-button.js';
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

        this.startButton = new UiButton('Start', async () => {
            this.startButton.disable();

            await this.form.apply(recipe);

            this.startButton.enable();
        });

        panel.add(this.startButton);
    }

    onUnload() {
        this.element.removeEventListener('click', this.onStartClick);
        this.element = null;

        panel.remove(this.startButton);

        this.startButton = null;
    }

    onStart(event) {
        this.startButton.disable();

        this.dispatchEvent(new CustomEvent('start'));
    }
}
