import {SubPage} from '../../core/sub-page.js';
import {ButtonElementReference} from '../../dom/button-element-reference.js';
import {StatPillElementReference} from '../../dom/stat-pill-element-reference.js';
import {ensure} from '../../core/ensure.js';

const SECONDS = /([\d.]+)\s*s/;

const COUNT = /×\s*(\d+)/;

const EMPTY_STATS = {
    score: null,
    duration: null,
    streak: null,
};

export class PracticeKanaResultPage extends SubPage {
    static SETTLE = 3;

    static equal(stats, other) {
        return other !== null && Object.keys(stats).every((key) => stats[key] === other[key]);
    }

    static STATS = {
        'Score': 'score',
        'Duration': 'duration',
        'Best Streak': 'streak',
    };

    static VALUES = {
        score: (pill) => pill.getNumber(),
        duration: (pill) => pill.getSeconds(),
        streak: (pill) => pill.getNumber(),
    };

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

    getStats() {
        const entries = [...document.querySelectorAll('.stat-pill')]
            .map((element) => new StatPillElementReference(element))
            .map((pill) => [PracticeKanaResultPage.STATS[pill.getLabel()], pill])
            .filter(([key]) => key !== undefined)
            .map(([key, pill]) => [key, PracticeKanaResultPage.VALUES[key](pill)]);

        return {...EMPTY_STATS, ...Object.fromEntries(entries)};
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

    async settle(timeout = 3000) {
        let previous = null;
        let changed = false;
        let stable = 0;

        await ensure(() => {
            const stats = this.getStats();
            const same = PracticeKanaResultPage.equal(stats, previous);

            changed = changed || previous !== null && !same;
            stable = same ? stable + 1 : 0;
            previous = stats;

            return changed && stable >= PracticeKanaResultPage.SETTLE;
        }, {timeout, interval: 100, message: 'Stats not settled'});
    }

    async report() {
        await this.settle().catch(() => undefined);

        const details = this.getDetails();

        if (details === null) {
            return;
        }

        this.dispatchEvent(new CustomEvent('result', {
            detail: {
                ...this.getStats(),
                incorrect: this.getIncorrect(details),
                results: this.getResults(details),
            },
        }));

        this.continueButton.click();
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

        this.report();
    }

    onLoad() {
        this.reported = false;
    }
}
