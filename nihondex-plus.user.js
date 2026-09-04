// ==UserScript==
// @name        nihondex-plus
// @namespace   chapterjason
// @version     1.0.0
// @run-at      document-idle
// @inject-into page
// @match       https://nihondex.com/*
// @grant       none
//
// @author      -
// @description
// ==/UserScript==

const PRACTICE_KANA_PATH = "/practice/kana";
const KANA_DAKUTEN_OFFSET = 10;
const KANA_COMBINATIONS_OFFSET = KANA_DAKUTEN_OFFSET + 5;
const KANA_ROW_ORDER = [
    // Basic
    "a",
    "ka",
    "sa",
    "ta",
    "na",
    "ha",
    "ma",
    "ya",
    "ra",
    "wa",
    // Dakuten
    "ga",
    "za",
    "da",
    "ba",
    "pa",
    // Combinations
    "kya",
    "sha",
    "cha",
    "nya",
    "hya",
    "mya",
    "rya",
    "gya",
    "ja",
    "bya",
    "pya",
];
const BUTTON_STORE = [];

const recipe = {
    drawKana: false,
    selectRomanji: true,
    selectKana: true,
    typeRomanji: false,
    listenType: false,
    listenDraw: false,
    wordToKana: false,

    order: 'random', // "focus" or "random"

    size: 5,
    learningCards: false,
    randomFont: true,
    kana: {
        hiragana: {
            // Basic
            a: true,
            ka: false,
            sa: false,
            ta: false,
            na: false,
            ha: false,
            ma: false,
            ya: false,
            ra: false,
            wa: false,
            // Dakuten
            ga: false,
            za: false,
            da: false,
            ba: false,
            pa: false,
            // Combinations
            kya: false,
            sha: false,
            cha: false,
            nya: false,
            hya: false,
            mya: false,
            rya: false,
            gya: false,
            ja: false,
            bya: false,
            pya: false,
        },
        katakana: {
            a: false,
            ka: false,
            sa: false,
            ta: false,
            na: false,
            ha: false,
            ma: false,
            ya: false,
            ra: false,
            wa: false,
            // Dakuten
            ga: false,
            za: false,
            da: false,
            ba: false,
            pa: false,
            // Combinations
            kya: false,
            sha: false,
            cha: false,
            nya: false,
            hya: false,
            mya: false,
            rya: false,
            gya: false,
            ja: false,
            bya: false,
            pya: false,
        }
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

function now() {
    return performance.now();
}

async function ensure(predicate, {timeout = 1000, interval = 20, action, message = 'Condition not met'} = {}) {
    const deadline = now() + timeout;

    while (!predicate()) {
        if (now() >= deadline) {
            throw new Error(`${message} after ${timeout}ms`);
        }

        action?.();
        await sleep(interval);
    }
}

class ElementReference {
    constructor(selectorOrElement) {
        this.selector = selectorOrElement instanceof Element ? null : selectorOrElement;
        this.element = selectorOrElement instanceof Element ? selectorOrElement : null;
    }

    exists() {
        return this.element != null || this.selector != null && this.get() != null;
    }

    get() {
        return this.element != null ? this.element : document.querySelector(this.selector);
    }

    hasClass(className) {
        return this.get().classList.contains(className);
    }

    click() {
        const element = this.get();
        element.click();
    }

    async wait(timeout = 1000) {
        await ensure(() => this.exists(), {
            timeout,
            message: `Element ${this.selector} not found`,
        });
    }
}

class InputElementReference extends ElementReference {
    async set(value, timeout = 1000) {
        await this.wait(timeout);

        const element = this.get();

        if (element.value.toString() !== value.toString()) {
            element.value = '';

            for (const character of value.toString()) {
                element.dispatchEvent(new KeyboardEvent('keydown', {key: character, bubbles: true}));
                element.value += character;
                element.dispatchEvent(new Event('input', {bubbles: true}));
                element.dispatchEvent(new KeyboardEvent('keyup', {key: character, bubbles: true}));
            }

            element.dispatchEvent(new Event('change', {bubbles: true}));
        }
    }
}

class CheckboxElementReference extends ElementReference {
    isChecked() {
        return this.get().checked;
    }

    async ensureChecked(timeout = 1000) {
        await ensure(() => this.isChecked(), {
            timeout,
            action: () => this.click(),
            message: `Checkbox ${this.selector} not checked`,
        });
    }

    async ensureUnchecked(timeout = 1000) {
        await ensure(() => !this.isChecked(), {
            timeout,
            action: () => this.click(),
            message: `Checkbox ${this.selector} not unchecked`,
        });
    }

    async set(value, timeout = 1000) {
        await this.wait(timeout);

        if (value) {
            await this.ensureChecked(timeout);
        } else {
            await this.ensureUnchecked();
        }
    }
}

class ButtonElementReference extends ElementReference {
    isActive() {
        return !this.hasClass('btn-ghost');
    }

    enable() {
        const element = this.get();

        if (element.classList.contains('disabled')) {
            element.classList.remove('disabled');
        }

        element.disabled = false;
    }

    disable() {
        const element = this.get();

        if (!element.classList.contains('disabled')) {
            element.classList.add('disabled');
        }

        element.disabled = true;
    }

    async ensureActive(timeout = 1000) {
        await ensure(() => this.isActive(), {
            timeout,
            action: () => this.click(),
            message: `Button ${this.selector} not active`,
        });
    }

    async ensureInactive(timeout = 1000) {
        await ensure(() => !this.isActive(), {
            timeout,
            action: () => this.click(),
            message: `Button ${this.selector} not inactive`,
        });
    }

    async set(value, timeout = 1000) {
        await this.wait(timeout);

        if (value) {
            await this.ensureActive();
        } else {
            await this.ensureInactive();
        }
    }
}

class KanaRowElementReference extends ElementReference {
    isActive() {
        return this.hasClass('ring-primary');
    }

    async ensureActive(timeout = 1000) {
        await ensure(() => this.isActive(), {
            timeout,
            action: () => this.click(),
            message: `Button ${this.selector} not active`,
        });
    }

    async ensureInactive(timeout = 1000) {
        await ensure(() => !this.isActive(), {
            timeout,
            action: () => this.click(),
            message: `Button ${this.selector} not inactive`,
        });
    }

    async set(value, timeout = 1000) {
        await this.wait(timeout);

        if (value) {
            await this.ensureActive();
        } else {
            await this.ensureInactive();
        }
    }
}

function createWrapper() {
    const wrapperCard = document.createElement('div');
    wrapperCard.classList.add('card', 'bg-base-100', 'rounded-xs', 'shadow-xs');
    wrapperCard.style.position = 'fixed';
    wrapperCard.style.bottom = '0.5rem';
    wrapperCard.style.right = '0.5rem';

    const wrapperBody = document.createElement('div');
    wrapperBody.classList.add('card-body', 'p-2');

    const label = document.createElement('span');
    label.classList.add('text-sm', 'font-bold');
    label.innerText = 'Nihondex Plus';

    wrapperBody.append(label);
    wrapperCard.append(wrapperBody);

    document.body.append(wrapperCard);

    return wrapperBody;
}

function createButton(label, action) {
    const button = document.createElement('button');
    button.innerText = label;
    button.classList.add('btn', 'btn-xs', 'btn-primary');
    button.addEventListener('click', action.bind(button));

    wrapper.append(button);

    BUTTON_STORE.push(button);

    return new ButtonElementReference(button);
}

const wrapper = createWrapper();

async function applyRecipeOrder(targetOrder, orderRandomButton, orderFocusButton) {
    if (targetOrder === 'random') {
        await orderRandomButton.wait();
        await orderRandomButton.ensureActive();
    } else if (targetOrder === 'focus') {
        await orderFocusButton.wait();
        await orderFocusButton.ensureActive();
    } else {
        throw new Error(`Invalid order: ${targetOrder}. Must be "random" or "focus".`);
    }
}

function* kanaRowMatrix() {
    for (let index = 0; index < KANA_ROW_ORDER.length; index++) {
        // css selector nth-child is 1-indexed
        let column = 1;
        let rowIndex = index + 1;

        if (index >= KANA_COMBINATIONS_OFFSET) {
            column = 3;
            rowIndex -= KANA_COMBINATIONS_OFFSET;
        } else if (index >= KANA_DAKUTEN_OFFSET) {
            column = 2;
            rowIndex -= KANA_DAKUTEN_OFFSET;
        }

        yield {column, rowIndex, index};
    }
}

function disableAnimations() {
    const style = document.createElement('style');

    style.id = 'nihondex-plus-no-animations';
    style.textContent = `
        .kana-practice-page,
        .kana-practice-page *,
        .kana-practice-page *::before,
        .kana-practice-page *::after {
            transition: none !important;
            animation: none !important;
        }

        .animate-subtle-bounce,
        canvas[data-confetti] {
            display: none !important;
        }
    `;

    document.head.append(style);
}

function enableAnimations() {
    document.getElementById('nihondex-plus-no-animations')?.remove();
}

function onStartPractice(event) {
    if (event.target.closest('button[data-walkthrough="kana-start"]') === null) {
        return;
    }

    kanaGame = new KanaGame();
    kanaGame.start();
}

function loadPracticeKana() {
    disableAnimations();

    document.addEventListener('click', onStartPractice, {capture: true, passive: true});

    const modeDrawKanaButton = new ButtonElementReference('button[data-tip="Draw Kana"]');
    const modeSelectRomanjiButton = new ButtonElementReference('button[data-tip="Multiple Choice"]');
    const modeSelectKanaButton = new ButtonElementReference('button[data-tip="Romaji to Kana"]');
    const modeTypeRomanjiButton = new ButtonElementReference('button[data-tip="Kana to Romaji"]');
    const modeListenTypeButton = new ButtonElementReference('button[data-tip="Listen & Type"]');
    const modeListenDrawButton = new ButtonElementReference('button[data-tip="Listen & Draw"]');
    const modeWordToKanaButton = new ButtonElementReference('button[data-tip="Word to Kana"]');

    const orderRandomButton = new ButtonElementReference('div[data-walkthrough="kana-order"] > div > button:first-child');
    const orderFocusButton = new ButtonElementReference('div[data-walkthrough="kana-order"] > div > button:last-child');

    const sessionSizeInput = new InputElementReference('div[data-walkthrough="kana-session"] > div > input.input[type="number"]');
    const learningCardsCheckbox = new CheckboxElementReference('div[data-walkthrough="kana-session"] + div > label > input.checkbox[type="checkbox"]');
    const randomFontCheckbox = new CheckboxElementReference('div[data-walkthrough="kana-session"] + div + div > label > input.checkbox[type="checkbox"]');

    const kanaSwitch = new CheckboxElementReference('div[data-walkthrough="kana-characters"] input.toggle[type="checkbox"]');

    const button = createButton('Start', async () => {
        button.disable();

        await Promise.all([
            modeDrawKanaButton.set(recipe.drawKana),
            modeSelectRomanjiButton.set(recipe.selectRomanji),
            modeSelectKanaButton.set(recipe.selectKana),
            modeTypeRomanjiButton.set(recipe.typeRomanji),
            modeListenTypeButton.set(recipe.listenType),
            modeListenDrawButton.set(recipe.listenDraw),
            modeWordToKanaButton.set(recipe.wordToKana),
            applyRecipeOrder(recipe.order, orderRandomButton, orderFocusButton),
            sessionSizeInput.set(recipe.size),
            learningCardsCheckbox.set(recipe.learningCards),
            randomFontCheckbox.set(recipe.randomFont),
            (async () => {
                // false is hiragana
                await kanaSwitch.set(false);

                for (const {column, rowIndex, index} of kanaRowMatrix()) {
                    const kanaRow = new KanaRowElementReference(`div[data-walkthrough="kana-characters"] > div.grid > div.card:nth-child(${column}) > div.card-body > div.grid > div.card:nth-child(${rowIndex})`);

                    await kanaRow.set(recipe.kana.hiragana[KANA_ROW_ORDER[index]]);
                }

                // true is katakana
                await kanaSwitch.set(true);

                for (const {column, rowIndex, index} of kanaRowMatrix()) {
                    const kanaRow = new KanaRowElementReference(`div[data-walkthrough="kana-characters"] > div.grid > div.card:nth-child(${column}) > div.card-body > div.grid > div.card:nth-child(${rowIndex})`);

                    await kanaRow.set(recipe.kana.katakana[KANA_ROW_ORDER[index]]);
                }
            })(),
        ]);

        button.enable();
    });
}

/**
 * ingame:
 *   div.kana-practice-page
 *   // active-system="katakana" selected-rows="あ,あ" game-count="1" current-streak="0" show-type-indicator="true" listen-mode="false"
 *
 *   div.card-body > div.flex > div:nth-child(1) -- div.kana-display
 *   div.card-body > div.flex > div:nth-child(1) -- div.kana-display + div > button // i don't know button
 *   div.card-body > div.flex > div.grid
 *      --> button > span:first-child --> index
 *      --> button > span:last-child --> character
 *
 * results:
 *   div.kana-practice-page > div > div > div.flex > h2 -- Lesosn complete label, can we use as indicator
 *   div.kana-practice-page > div > div > div.flex > div.grid -- stats overview
 *   div.kana-practice-page > div > div > div.flex > div > button -- show details button
 *   div.kana-practice-page > div > div > div.flex > div > button -- show details button
 *   div.kana-practice-page > div > div > div.flex > div > button + div > div -- details container
 *   div.kana-practice-page > div > div > div.flex > div > button + div > div > div > div:nth-child(2) -- chars + timings
 */

function unloadPracticeKana() {
    for (const buttonReference of BUTTON_STORE) {
        const button = buttonReference.get();

        button.remove()
    }

    BUTTON_STORE.length = 0;

    document.removeEventListener('click', onStartPractice, {capture: true});

    enableAnimations();

    kanaGame?.stop();
    kanaGame = null;
}

const EVENTS = [
    'keydown',
    'keyup',
    'compositionstart',
    'compositionupdate',
    'compositionend',
    'focusin',
    'focusout',
    'click',
    'pointermove',
    'pointerdown',
    'pointerup',
    'pointercancel',
    'pointerenter',
    'pointerleave',
    'visibilitychange',
];

const selectorCache = new WeakMap();

function getCandidates(element) {
    const tag = element.localName;
    const classes = [...element.classList].map((name) => `.${CSS.escape(name)}`);
    const candidates = [tag];

    if (element.id !== '') {
        candidates.push(`#${CSS.escape(element.id)}`);
    }

    for (const [index, className] of classes.entries()) {
        candidates.push(className, `${tag}${className}`);

        for (const other of classes.slice(index + 1)) {
            candidates.push(`${className}${other}`, `${tag}${className}${other}`);
        }
    }

    const parent = element.parentElement;

    if (parent !== null) {
        const index = [...parent.children].indexOf(element) + 1;

        candidates.push(`${tag}:nth-child(${index})`);
    }

    return candidates.sort((a, b) => a.length - b.length);
}

function matchesOnly(selector, element) {
    const matches = document.querySelectorAll(selector);

    return matches.length === 1 && matches[0] === element;
}

function getPath(element) {
    const path = [];

    for (let current = element; current !== null; current = current.parentElement) {
        const parent = current.parentElement;

        if (parent === null) {
            path.unshift(current.localName);

            break;
        }

        const index = [...parent.children].indexOf(current) + 1;

        path.unshift(`${current.localName}:nth-child(${index})`);
    }

    return path.join('>');
}

function findSelector(element) {
    const candidates = getCandidates(element);

    for (const candidate of candidates) {
        if (matchesOnly(candidate, element)) {
            return candidate;
        }
    }

    for (let ancestor = element.parentElement; ancestor !== null; ancestor = ancestor.parentElement) {
        const prefix = getUniqueSelector(ancestor);

        for (const candidate of candidates) {
            const selector = `${prefix} ${candidate}`;

            if (matchesOnly(selector, element)) {
                return selector;
            }
        }
    }

    return getPath(element);
}

function getUniqueSelector(element) {
    if (!(element instanceof Element)) {
        return '';
    }

    if (selectorCache.has(element)) {
        return selectorCache.get(element);
    }

    const selector = findSelector(element);

    selectorCache.set(element, selector);

    return selector;
}

const POINTER_STATE = [
    'pointermove',
    'pointerdown',
    'pointerup',
    'pointerenter',
];

const DOCUMENT_ONLY = [
    'pointerenter',
    'pointerleave',
];

class InputTracker extends EventTarget {

    constructor() {
        super();

        this.pointer = null;

        for (const type of EVENTS) {
            document.addEventListener(type, (event) => {
                if (DOCUMENT_ONLY.includes(type) && event.target !== document.documentElement) {
                    return;
                }

                if (POINTER_STATE.includes(type)) {
                    this.pointer = event;
                }

                this.dispatchEvent(new CustomEvent('tracking', {
                    detail: {
                        type,
                        time: event.timeStamp,
                        source: event,
                    },
                }));
            }, {
                capture: true,
                passive: true,
            });
        }
    }
}

class TrackingCollector extends EventTarget {
    static BUTTONS = ['left', 'middle', 'right'];

    static MODIFIERS = [
        ['ctrlKey', 'ctrl'],
        ['altKey', 'alt'],
        ['shiftKey', 'shift'],
        ['metaKey', 'meta'],
    ];

    static button(event) {
        return TrackingCollector.BUTTONS[event.button] ?? String(event.button);
    }

    static modifiers(event) {
        return TrackingCollector.MODIFIERS
            .filter(([property]) => event[property])
            .map(([, name]) => name);
    }

    constructor(tracker) {
        super();

        this.tracker = tracker;
        this.log = [];
        this.startTime = null;
        this.handler = (event) => this.log.push(...this.lines(event.detail));
    }

    isRunning() {
        return this.startTime !== null;
    }

    start(time = performance.now()) {
        if (this.isRunning()) {
            return;
        }

        this.log = [];
        this.startTime = time;
        this.log.push(this.line('start', this.startTime, this.tracker.pointer));
        this.tracker.addEventListener('tracking', this.handler);
    }

    stop() {
        if (!this.isRunning()) {
            return this.log;
        }

        this.tracker.removeEventListener('tracking', this.handler);
        this.log.push(this.line('end', performance.now(), this.tracker.pointer));
        this.startTime = null;

        return this.log;
    }

    lines({ type, time, source }) {
        if (type === 'pointermove') {
            const samples = source.getCoalescedEvents();

            const fresh = samples.filter((sample) => sample.timeStamp >= this.startTime);

            if (fresh.length > 0) {
                return fresh.map((sample) => this.line(type, sample.timeStamp, sample));
            }
        }

        return [this.line(type, time, source)];
    }

    line(type, time, source) {
        const record = {
            time: Math.round(time - this.startTime),
            type,
        };

        switch (type) {
            case 'click':
                Object.assign(record, {
                    x: Math.round(source.clientX),
                    y: Math.round(source.clientY),
                    button: TrackingCollector.button(source),
                    target: getUniqueSelector(source.target),
                });
                break;

            case 'pointermove':
            case 'pointercancel':
            case 'pointerenter':
            case 'pointerleave':
                Object.assign(record, {
                    x: Math.round(source.clientX),
                    y: Math.round(source.clientY),
                    pointerType: source.pointerType,
                    target: getUniqueSelector(source.target),
                });
                break;

            case 'pointerdown':
            case 'pointerup':
                Object.assign(record, {
                    x: Math.round(source.clientX),
                    y: Math.round(source.clientY),
                    button: TrackingCollector.button(source),
                    pointerType: source.pointerType,
                    target: getUniqueSelector(source.target),
                });
                break;

            case 'compositionstart':
            case 'compositionupdate':
            case 'compositionend':
                Object.assign(record, {
                    data: source.data,
                    target: getUniqueSelector(source.target),
                });
                break;

            case 'focusin':
            case 'focusout':
                Object.assign(record, {
                    target: getUniqueSelector(source.target),
                    related: getUniqueSelector(source.relatedTarget),
                });
                break;

            case 'start':
            case 'end':
                if (source !== null) {
                    Object.assign(record, {
                        x: Math.round(source.clientX),
                        y: Math.round(source.clientY),
                        pointerType: source.pointerType,
                        target: getUniqueSelector(source.target),
                    });
                }
                break;

            case 'visibilitychange':
                Object.assign(record, {
                    state: document.visibilityState,
                });
                break;

            case 'keydown':
            case 'keyup':
                Object.assign(record, {
                    code: source.code,
                    key: source.key,
                    modifiers: TrackingCollector.modifiers(source),
                    target: getUniqueSelector(source.target),
                });
                break;
        }

        this.dispatchEvent(new CustomEvent('line', {
            detail: { type, time, source, record },
        }));

        return JSON.stringify(record);
    }
}

class TrackingProcessor {
    static MOVEMENT_GAP = 100;

    static FIELDS = [
        'time',
        'type',
        'x',
        'y',
        'button',
        'pointerType',
        'target',
        'related',
        'code',
        'key',
        'modifiers',
        'data',
        'state',
    ];

    static custom(records) {
        return records
            .map((record) => Object.entries(record).filter(([field]) => !TrackingProcessor.FIELDS.includes(field)))
            .map((entries, index) => [records[index].time, entries])
            .filter(([, entries]) => entries.length > 0)
            .map(([time, entries]) => Object.fromEntries([['time', time], ...entries]));
    }

    static withCustom(entry, records) {
        const custom = TrackingProcessor.custom(records);

        return custom.length === 0 ? entry : { ...entry, custom };
    }

    static BOUNDARIES = [
        'pointerdown',
        'pointerup',
        'pointercancel',
        'pointerenter',
        'pointerleave',
    ];

    static distance(from, to) {
        return Math.hypot(to.x - from.x, to.y - from.y);
    }

    static angleBetween(previous, current) {
        const delta = current - previous;

        return Math.abs(Math.atan2(Math.sin(delta), Math.cos(delta)));
    }

    constructor(log) {
        this.records = log
            .map((line) => JSON.parse(line))
            .sort((a, b) => a.time - b.time);
    }

    select(...types) {
        return this.records.filter((record) => types.includes(record.type));
    }

    process() {
        return [
            ...this.movements(),
            ...this.hovers(),
            ...this.typing(),
            ...this.visibility(),
            ...this.select('start', 'end', 'click', ...TrackingProcessor.BOUNDARIES, 'focusin', 'focusout'),
        ].sort((a, b) => a.time - b.time);
    }

    movements() {
        const groups = [];

        let current = null;

        for (const event of this.select('pointermove', ...TrackingProcessor.BOUNDARIES)) {
            if (event.type !== 'pointermove') {
                current = null;

                continue;
            }

            if (current === null || event.time - current[current.length - 1].time > TrackingProcessor.MOVEMENT_GAP) {
                current = [event];
                groups.push(current);

                continue;
            }

            current.push(event);
        }

        return groups
            .filter((points) => points.length > 1)
            .map((points) => this.describeMovement(points))
            .filter((movement) => movement.distance > 0);
    }

    describeMovement(points) {
        const first = points[0];
        const last = points[points.length - 1];

        let distance = 0;
        let peakSpeed = 0;
        let directionChanges = 0;
        let previousAngle = null;

        for (let index = 1; index < points.length; index += 1) {
            const from = points[index - 1];
            const to = points[index];
            const step = TrackingProcessor.distance(from, to);
            const elapsed = to.time - from.time;

            distance += step;

            if (elapsed > 0) {
                peakSpeed = Math.max(peakSpeed, step / elapsed);
            }

            if (step === 0) {
                continue;
            }

            const angle = Math.atan2(to.y - from.y, to.x - from.x);

            if (previousAngle !== null && TrackingProcessor.angleBetween(previousAngle, angle) > Math.PI / 2) {
                directionChanges += 1;
            }

            previousAngle = angle;
        }

        const displacement = TrackingProcessor.distance(first, last);

        const movement = {
            time: first.time,
            type: 'movement',
            end: last.time,
            duration: last.time - first.time,
            samples: points.length,
            from: { x: first.x, y: first.y },
            to: { x: last.x, y: last.y },
            distance: Math.round(distance),
            displacement: Math.round(displacement),
            efficiency: distance === 0 ? 1 : displacement / distance,
            peakSpeed,
            directionChanges,
            targets: [...new Set(points.map((point) => point.target))],
        };

        return TrackingProcessor.withCustom(movement, points);
    }

    hovers() {
        const groups = [];

        for (const move of this.select('pointermove')) {
            const current = groups[groups.length - 1];

            if (current !== undefined && current[0].target === move.target) {
                current.push(move);

                continue;
            }

            groups.push([move]);
        }

        return groups.map((points) => {
            const first = points[0];
            const last = points[points.length - 1];

            return TrackingProcessor.withCustom({
                time: first.time,
                type: 'hover',
                end: last.time,
                duration: last.time - first.time,
                target: first.target,
            }, points);
        });
    }

    typing() {
        const events = this.select(
            'keydown',
            'keyup',
            'compositionstart',
            'compositionupdate',
            'compositionend',
            'focusin',
            'focusout',
        );

        const groups = [];

        let current = null;

        for (const event of events) {
            if (event.type === 'focusout') {
                current = null;

                continue;
            }

            if (event.type === 'focusin') {
                current = [];
                groups.push(current);

                continue;
            }

            if (current === null) {
                current = [];
                groups.push(current);
            }

            current.push(event);
        }

        return groups
            .filter((group) => group.length > 0)
            .map((group) => this.describeTyping(group));
    }

    describeTyping(events) {
        const characters = [];
        const intervals = [];
        const dwells = [];
        const compositions = [];
        const pressed = new Map();

        let keys = 0;
        let backspaces = 0;
        let previousKeydown = null;
        let composing = null;

        for (const event of events) {
            switch (event.type) {
                case 'keydown':
                    keys += 1;
                    pressed.set(event.code, event.time);

                    if (previousKeydown !== null) {
                        intervals.push(event.time - previousKeydown);
                    }

                    previousKeydown = event.time;

                    if (composing !== null) {
                        break;
                    }

                    if (event.key === 'Backspace') {
                        backspaces += 1;
                        characters.pop();
                    } else if ([...event.key].length === 1) {
                        characters.push(event.key);
                    }

                    break;

                case 'keyup': {
                    const down = pressed.get(event.code);

                    if (down !== undefined) {
                        dwells.push(event.time - down);
                        pressed.delete(event.code);
                    }

                    break;
                }

                case 'compositionstart':
                    composing = { start: event.time, updates: 0, data: '' };

                    break;

                case 'compositionupdate':
                    if (composing !== null) {
                        composing.updates += 1;
                        composing.data = event.data;
                    }

                    break;

                case 'compositionend':
                    if (composing !== null) {
                        composing.end = event.time;
                        composing.duration = event.time - composing.start;
                        composing.data = event.data;
                        compositions.push(composing);
                        composing = null;
                    }

                    characters.push(...event.data);

                    break;
            }
        }

        const first = events[0];
        const last = events[events.length - 1];

        const run = {
            time: first.time,
            type: 'typing',
            end: last.time,
            duration: last.time - first.time,
            target: first.target,
            text: characters.join(''),
            keys,
            backspaces,
            intervals,
            dwells,
            compositions,
        };

        return TrackingProcessor.withCustom(run, events);
    }

    visibility() {
        const changes = this.select('visibilitychange');
        const last = this.records[this.records.length - 1];
        const end = last === undefined ? 0 : last.time;

        return changes.map((change, index) => {
            const next = changes[index + 1];
            const until = next === undefined ? end : next.time;

            return {
                ...change,
                end: until,
                duration: until - change.time,
            };
        });
    }
}

class KanaGame {
    start() {
    }

    stop() {
    }
}

let kanaGame = null;

async function main() {

    /**
     * @param {URL} url
     */
    function onNavigation(url) {
        if (url.pathname === PRACTICE_KANA_PATH) {
            loadPracticeKana();
        } else {
            unloadPracticeKana();
        }
    }

    for (const method of ['pushState', 'replaceState']) {
        window.history[method] = new Proxy(window.history[method], {
            apply: (target, thisArg, argArray) => {
                const result = target.apply(thisArg, argArray);

                onNavigation(new URL(window.location.href));

                return result;
            },
        });
    }

    window.addEventListener('popstate', () => {
        onNavigation(new URL(window.location.href));
    });

    onNavigation(new URL(window.location.href));
}

(() => {
    main()
        .catch((error) => {
            console.error(error);
        });
})();
