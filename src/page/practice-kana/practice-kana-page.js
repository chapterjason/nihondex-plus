import {Page} from '../../core/page.js';
import {PracticeKanaSetupPage} from './practice-kana-setup-page.js';
import {NO_ANIMATIONS_CLASS} from '../../util/disable-animations.js';
import {HiddenStyles} from '../../util/hidden-styles.js';
import {PracticeKanaGamePage} from './practice-kana-game-page.js';

export class PracticeKanaPage extends Page {
    constructor() {
        super('.kana-practice-page');

        this.hiddenStyles = new HiddenStyles();
        this.setupPage = new PracticeKanaSetupPage();
        this.gamePage = new PracticeKanaGamePage();
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
