import {Page} from '../../core/page.js';
import {ElementReference} from '../../dom/element-reference.js';
import {PracticeKanaSetupPage} from './practice-kana-setup-page.js';
import {NO_ANIMATIONS_CLASS} from '../../util/disable-animations.js';
import {hideElements} from '../../util/hide-elements.js';
import {KanaGame} from './kana-game.js';

export class PracticeKanaPage extends Page {
    constructor() {
        super();

        this.hiddenStyles = [];
        this.kanaGame = null;
        this.page = new ElementReference('.kana-practice-page');
        this.setupPage = new PracticeKanaSetupPage();
        this.observer = new MutationObserver(() => this.check());
        this.setupPage.addEventListener('start', () => this.start());
    }

    check() {
        this.setupPage.check();
    }

    start() {
        this.kanaGame = new KanaGame();
        this.kanaGame.addEventListener('end', () => this.end());
        this.kanaGame.start();
    }

    end() {
        this.kanaGame = null;

        this.check();
    }

    load() {
        this.page.addClass(NO_ANIMATIONS_CLASS);

        this.hiddenStyles = [
            hideElements('canvas[data-confetti]'),
            hideElements('.animate-subtle-bounce'),
        ];

        this.observer.observe(document.body, {subtree: true, childList: true});

        this.check();
    }

    unload() {
        this.observer.disconnect();

        this.kanaGame?.stop();
        this.kanaGame = null;

        this.setupPage.unload();

        this.page.removeClass(NO_ANIMATIONS_CLASS);

        for (const style of this.hiddenStyles) {
            style.remove();
        }

        this.hiddenStyles = [];
    }
}
