import {Page} from '../../core/page.js';
import {PracticeKanaSetupPage} from './practice-kana-setup-page.js';
import {NO_ANIMATIONS_CLASS} from '../../util/disable-animations.js';
import {HiddenStyles} from '../../util/hidden-styles.js';
import {KanaGame} from './kana-game.js';

export class PracticeKanaPage extends Page {
    constructor() {
        super('.kana-practice-page');

        this.hiddenStyles = new HiddenStyles();
        this.kanaGame = null;
        this.setupPage = new PracticeKanaSetupPage();
        this.setupPage.addEventListener('start', () => this.start());
    }

    start() {
        this.kanaGame = new KanaGame();
        this.kanaGame.addEventListener('end', () => this.end());
        this.kanaGame.start();
    }

    end() {
        this.kanaGame = null;
    }

    onLoad() {
        this.reference.addClass(NO_ANIMATIONS_CLASS);

        this.hiddenStyles.add('canvas[data-confetti]');
        this.hiddenStyles.add('.animate-subtle-bounce');

    }

    onUnload() {
        this.kanaGame?.stop();
        this.kanaGame = null;

        this.setupPage.unload();

        this.reference.removeClass(NO_ANIMATIONS_CLASS);

        this.hiddenStyles.clear();
    }
}
