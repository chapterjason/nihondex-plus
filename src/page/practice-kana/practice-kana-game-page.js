import {SubPage} from '../../core/sub-page.js';
import {InputTracker} from '../../tracking/input-tracker.js';
import {TrackingCollector} from '../../tracking/tracking-collector.js';
import {TrackingProcessor} from '../../tracking/tracking-processor.js';
import {absolute} from '../../util/absolute.js';

export const GAME_MODE_SELECT_ROMAJI = 'selectRomanji';

export const GAME_MODE_SELECT_KANA = 'selectKana';

export const GAME_MODE_TYPE_ROMAJI = 'typeRomanji';

export const GAME_MODE_UNKNOWN = 'unknown';

const KANA = /[\u3040-\u30ff]/;

const OPTION_SUCCESS_CLASS = 'bg-success/40';

const OPTION_ERROR_CLASS = 'bg-error/40';

const FEEDBACK_SELECTOR = '.animate-fly-up';

const FEEDBACK_SUCCESS = '\u2713';

const FEEDBACK_ERROR = '\u2717';

const EMPTY_ANSWER = {
    prompt: null,
};

export class PracticeKanaGamePage extends SubPage {
    constructor() {
        super('[game-count]');

        this.card = null;
        this.tracker = new InputTracker();
        this.collector = new TrackingCollector(this.tracker);
        this.trackings = [];
        this.gameMode = null;
        this.tracked = null;
        this.answered = false;
        this.answer = null;
        this.choices = [];
        this.feedback = null;
        this.mark = null;
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

    checkAnswer() {
        if (this.answered) {
            return;
        }

        const card = this.reference.get();

        if (card === null) {
            return;
        }

        this.choose(card, OPTION_ERROR_CLASS);

        const feedback = card.querySelector(FEEDBACK_SELECTOR);
        const mark = feedback === null ? null : feedback.textContent.trim();

        if (feedback === this.feedback && mark === this.mark) {
            return;
        }

        this.feedback = feedback;
        this.mark = mark;

        if (mark === FEEDBACK_SUCCESS) {
            this.answered = true;

            this.choose(card, OPTION_SUCCESS_CLASS);

            this.answer = this.snapshot(card);

            this.collector.mark('answer', {correct: true});

            return;
        }

        if (mark === FEEDBACK_ERROR) {
            this.collector.mark('answer', {correct: false});
        }
    }

    check() {
        super.check();

        this.checkAnswer();

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

    getLabel(option) {
        return option.lastElementChild.textContent.trim();
    }

    getPrompt(card) {
        const display = [...card.querySelectorAll('.kana-display')]
            .find((element) => element.closest('dialog') === null);

        return display === undefined ? null : display.textContent.trim();
    }

    getOptions(card) {
        return [...card.querySelectorAll('.kana-option-btn')].map((option) => this.getLabel(option));
    }

    getMarked(card, className) {
        return [...card.querySelectorAll('.kana-option-btn')]
            .filter((option) => option.classList.contains(className))
            .map((option) => this.getLabel(option));
    }

    choose(card, className) {
        const marked = this.getMarked(card, className)
            .filter((label) => !this.choices.includes(label));

        this.choices.push(...marked);
    }

    snapshot(card) {
        const answer = {
            prompt: this.getPrompt(card),
        };

        const options = this.getOptions(card);

        if (options.length === 0) {
            return answer;
        }

        return {
            ...answer,
            options,
            choices: [...this.choices],
        };
    }

    finish() {
        if (!this.collector.isRunning()) {
            return;
        }

        const card = this.tracked;
        const answer = this.answer ?? (card === null ? EMPTY_ANSWER : this.snapshot(card));
        const started = absolute(this.collector.startTime);
        const log = this.collector.stop();
        const finished = absolute(this.collector.endTime);
        const processed = new TrackingProcessor(log).process();

        const tracking = {
            started,
            finished,
            gameMode: this.gameMode,
            ...answer,
            log,
            processed,
        };

        this.trackings.push(tracking);
    }

    onCard(card) {
        this.finish();

        this.answered = false;
        this.answer = null;
        this.choices = [];
        this.feedback = null;
        this.mark = null;
        this.tracked = card;
        this.gameMode = this.getGameMode();

        this.collector.start();
    }

    onUnload() {
        this.finish();

        this.dispatchEvent(new CustomEvent('tracking', {detail: this.trackings}));

        this.trackings = [];
    }
}
