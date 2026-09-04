import {Page} from '../../core/page.js';
import {PracticeKanaSetupPage} from './practice-kana-setup-page.js';
import {NO_ANIMATIONS_CLASS} from '../../util/disable-animations.js';
import {HiddenStyles} from '../../util/hidden-styles.js';
import {PracticeKanaGamePage} from './practice-kana-game-page.js';
import {PracticeKanaResultPage} from './practice-kana-result-page.js';

export class PracticeKanaPage extends Page {
    constructor() {
        super('.kana-practice-page');

        this.hiddenStyles = new HiddenStyles();
        this.setupPage = new PracticeKanaSetupPage();
        this.gamePage = new PracticeKanaGamePage();
        this.resultPage = new PracticeKanaResultPage();

        this.trackings = [];

        this.gamePage.addEventListener('tracking', (event) => this.onTracking(event.detail));
        this.resultPage.addEventListener('result', (event) => this.onResult(event.detail));
    }

    onTracking(trackings) {
        this.trackings = trackings;
    }

    onResult(result) {
        const results = this.trackings.map((tracking, index) => ({
            ...tracking,
            nihondex: result.results[index],
        }));

        this.trackings = [];

        console.log(results);
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
