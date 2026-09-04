import {Page} from '../../core/page.js';
import {PracticeKanaSetupPage} from './practice-kana-setup-page.js';
import {NO_ANIMATIONS_CLASS} from '../../util/disable-animations.js';
import {HiddenStyles} from '../../util/hidden-styles.js';
import {PracticeKanaGamePage} from './practice-kana-game-page.js';
import {PracticeKanaResultPage} from './practice-kana-result-page.js';
import {stamp} from '../../util/stamp.js';
import {id} from '../../util/id.js';
import {PRACTICE_KANA} from './constants.js';

export class PracticeKanaPage extends Page {
    constructor() {
        super('.kana-practice-page');

        this.hiddenStyles = new HiddenStyles();
        this.setupPage = new PracticeKanaSetupPage();
        this.gamePage = new PracticeKanaGamePage();
        this.resultPage = new PracticeKanaResultPage();

        this.trackings = [];
        this.startedAt = null;
        this.session = null;
        this.run = null;

        this.setupPage.addEventListener('start', (event) => this.onStart(event.detail));
        this.gamePage.addEventListener('tracking', (event) => this.onTracking(event.detail));
        this.resultPage.addEventListener('result', (event) => this.onResult(event.detail));
    }

    onStart(run) {
        this.startedAt = new Date();
        this.session = id();
        this.run = run;
    }

    onTracking(trackings) {
        this.trackings = trackings;
    }

    onResult(result) {
        const finishedAt = new Date();
        const startedAt = this.startedAt ?? finishedAt;
        const session = this.session ?? id();
        const run = this.run ?? null;

        const results = this.trackings.map((tracking, index) => ({
            ...tracking,
            nihondex: result.results[index],
        }));

        this.trackings = [];
        this.startedAt = null;
        this.session = null;
        this.run = null;

        this.dispatchEvent(new CustomEvent('session', {
            detail: {
                session,
                module: PRACTICE_KANA,
                run,
                started: stamp(startedAt),
                finished: stamp(finishedAt),
                score: result.score,
                duration: result.duration,
                streak: result.streak,
                incorrect: result.incorrect,
                results,
            },
        }));
    }

    onLoad() {
        this.reference.addClass(NO_ANIMATIONS_CLASS);

        this.hiddenStyles.add('canvas[data-confetti]');
        this.hiddenStyles.add('.animate-subtle-bounce');
    }

    onUnload() {
        this.reference.removeClass(NO_ANIMATIONS_CLASS);

        this.hiddenStyles.clear();
    }
}
