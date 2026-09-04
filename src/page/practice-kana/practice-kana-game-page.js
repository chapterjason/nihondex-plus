import {SubPage} from '../../core/sub-page.js';

export const GAME_MODE_SELECT_ROMAJI = 'selectRomanji';

export const GAME_MODE_SELECT_KANA = 'selectKana';

export const GAME_MODE_TYPE_ROMAJI = 'typeRomanji';

export const GAME_MODE_UNKNOWN = 'unknown';

const KANA = /[\u3040-\u30ff]/;

export class PracticeKanaGamePage extends SubPage {
    constructor() {
        super('[game-count]');

        this.card = null;
    }

    getGameMode() {
        const card = this.reference.get();

        if (card === null) {
            return GAME_MODE_UNKNOWN;
        }

        const option = card.querySelector('.kana-option-btn');

        if (option !== null) {
            return KANA.test(option.lastElementChild.textContent)
                ? GAME_MODE_SELECT_KANA
                : GAME_MODE_SELECT_ROMAJI;
        }

        if (card.querySelector('input') !== null) {
            return GAME_MODE_TYPE_ROMAJI;
        }

        return GAME_MODE_UNKNOWN;
    }

    check() {
        super.check();

        const card = this.reference.get();

        if (card === this.card) {
            return;
        }

        this.card = card;

        if (card === null) {
            return;
        }

        this.onCard(card);
    }

    onCard(card) {
        const gameMode = this.getGameMode();

        console.log(gameMode);
    }
}
