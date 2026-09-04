import {SubPage} from '../../core/sub-page.js';
import {ButtonElementReference} from '../../dom/button-element-reference.js';

const SECONDS = /([\d.]+)\s*s/;

const COUNT = /×\s*(\d+)/;

export class PracticeKanaResultPage extends SubPage {
    constructor() {
        super('.stat-pill');

        this.details = new ButtonElementReference('.kana-practice-page button:has(.fa-chevron-down)');
        this.continueButton = new ButtonElementReference('.kana-practice-page button.btn-primary.w-full');
        this.reported = false;
    }

    getDetails() {
        const button = this.details.get();

        if (button === null || button.parentElement.children.length < 2) {
            return null;
        }

        return button.parentElement.children[1];
    }

    getIncorrect(details) {
        return [...details.querySelectorAll('.rounded-xl.p-3.text-center')]
            .filter((entry) => entry.querySelector('span') !== null)
            .map((entry) => ({
                kana: entry.firstElementChild.textContent.trim(),
                romaji: entry.querySelector('span').textContent.trim(),
                count: Number(entry.textContent.match(COUNT)?.[1] ?? 0),
            }));
    }

    getResults(details) {
        return [...details.querySelectorAll('.group')]
            .map((entry) => ({
                kana: entry.querySelector('.kana-display'),
                seconds: entry.textContent.match(SECONDS),
            }))
            .filter(({kana, seconds}) => kana !== null && seconds !== null)
            .map(({kana, seconds}) => ({
                kana: kana.textContent.trim(),
                seconds: Number(seconds[1]),
            }));
    }

    check() {
        super.check();

        if (!this.loaded || this.reported) {
            return;
        }

        const details = this.getDetails();

        if (details === null) {
            this.details.click();

            return;
        }

        this.reported = true;

        this.dispatchEvent(new CustomEvent('result', {
            detail: {
                incorrect: this.getIncorrect(details),
                results: this.getResults(details),
            },
        }));

        this.continueButton.click();
    }

    onLoad() {
        this.reported = false;
    }
}
