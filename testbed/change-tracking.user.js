// ==UserScript==
// @name        nihondex-plus-change-tracking
// @namespace   chapterjason
// @version     1.0.0
// @run-at      document-idle
// @match       https://nihondex.com/*
// @grant       GM_xmlhttpRequest
// @connect     localhost
//
// @author      -
// @description
// ==/UserScript==

const INPUT_EVENTS = [
    'pointerdown',
    'pointerup',
    'click',
    'keydown',
    'keyup',
];

const OBSERVE = {
    subtree: true,
    childList: true,
    attributes: true,
    characterData: true,
    attributeOldValue: true,
    characterDataOldValue: true,
};

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

function describeNode(node) {
    if (node instanceof Element) {
        return node.outerHTML;
    }

    return node.textContent;
}

class ChangeTracker extends EventTarget {
    constructor(root = document.documentElement) {
        super();

        this.root = root;
        this.pending = [];
        this.frame = null;
        this.observer = new MutationObserver((mutations) => this.queue(mutations));

        for (const type of INPUT_EVENTS) {
            document.addEventListener(type, (event) => {
                this.emit(type, event.timeStamp, event);
            }, {
                capture: true,
                passive: true,
            });
        }

        this.url = location.href;

        window.addEventListener('popstate', (event) => {
            this.emit('route', event.timeStamp, null);
        });

        this.observer.observe(this.root, OBSERVE);
    }

    emit(type, time, source) {
        this.dispatchEvent(new CustomEvent('tracking', {
            detail: { type, time, source },
        }));
    }

    queue(mutations) {
        this.pending.push(...mutations);

        if (this.frame !== null) {
            return;
        }

        this.frame = requestAnimationFrame(() => requestAnimationFrame((time) => {
            this.flush(time);
        }));
    }

    flush(time) {
        const mutations = this.pending;

        this.pending = [];
        this.frame = null;

        if (location.href !== this.url) {
            this.url = location.href;

            this.emit('route', time, null);
        }

        this.emit('mutation', time, mutations);
        this.emit('snapshot', time, null);
    }
}

class ChangeCollector extends EventTarget {
    constructor(tracker) {
        super();

        this.tracker = tracker;
        this.log = [];
        this.startTime = null;
        this.handler = (event) => this.log.push(this.line(event.detail));
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
        this.log.push(this.line({ type: 'snapshot', time, source: null }));
        this.tracker.addEventListener('tracking', this.handler);
    }

    stop() {
        if (!this.isRunning()) {
            return this.log;
        }

        this.tracker.removeEventListener('tracking', this.handler);
        this.log.push(this.line({ type: 'snapshot', time: performance.now(), source: null }));
        this.startTime = null;

        return this.log;
    }

    changes(mutations) {
        return mutations.map((mutation) => {
            const change = {
                kind: mutation.type,
                target: getUniqueSelector(mutation.target),
            };

            if (mutation.type === 'attributes') {
                change.attribute = mutation.attributeName;
                change.before = mutation.oldValue;
                change.after = mutation.target.getAttribute(mutation.attributeName);
            }

            if (mutation.type === 'characterData') {
                change.before = mutation.oldValue;
                change.after = mutation.target.textContent;
            }

            if (mutation.type === 'childList') {
                change.added = [...mutation.addedNodes].map(describeNode);
                change.removed = [...mutation.removedNodes].map(describeNode);
            }

            return change;
        });
    }

    line({ type, time, source }) {
        const record = {
            time: Math.round(time - this.startTime),
            type,
        };

        switch (type) {
            case 'snapshot':
                record.url = location.href;
                record.html = this.tracker.root.outerHTML;
                break;

            case 'mutation':
                record.changes = this.changes(source);
                break;

            case 'route':
                record.url = location.href;
                break;

            case 'click':
            case 'pointerdown':
            case 'pointerup':
                Object.assign(record, {
                    x: Math.round(source.clientX),
                    y: Math.round(source.clientY),
                    button: source.button,
                    target: getUniqueSelector(source.target),
                });
                break;

            case 'keydown':
            case 'keyup':
                Object.assign(record, {
                    code: source.code,
                    key: source.key,
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

class ChangeUploader {
    static ENDPOINT = 'http://localhost:8787/ingest';

    static INTERVAL = 1000;

    constructor(collector, session = new Date().toISOString().replaceAll(':', '-')) {
        this.collector = collector;
        this.session = session;
        this.timer = null;
        this.busy = false;
    }

    start() {
        if (this.timer !== null) {
            return;
        }

        this.timer = setInterval(() => this.flush(), ChangeUploader.INTERVAL);
    }

    async stop() {
        clearInterval(this.timer);
        this.timer = null;

        await this.flush();
    }

    async flush() {
        if (this.busy || this.collector.log.length === 0) {
            return;
        }

        this.busy = true;

        const lines = this.collector.log;

        this.collector.log = [];

        try {
            await this.send(lines.join('\n'));
        } catch (error) {
            this.collector.log = lines.concat(this.collector.log);

            console.error('change-tracking upload failed:', error);
        } finally {
            this.busy = false;
        }
    }

    send(body) {
        return new Promise((resolve, reject) => {
            GM_xmlhttpRequest({
                method: 'POST',
                url: `${ChangeUploader.ENDPOINT}?session=${encodeURIComponent(this.session)}`,
                headers: { 'content-type': 'text/plain' },
                data: body,
                onload: (response) => {
                    if (response.status >= 200 && response.status < 300) {
                        resolve(response);

                        return;
                    }

                    reject(new Error(`${response.status} ${response.statusText}`));
                },
                onerror: () => reject(new Error('request failed')),
                ontimeout: () => reject(new Error('request timed out')),
            });
        });
    }
}

class ChangePanel {
    constructor(collector, uploader) {
        this.collector = collector;
        this.uploader = uploader;

        this.button = document.createElement('button');
        this.button.textContent = 'Start';
        this.button.style.position = 'fixed';
        this.button.style.right = '0';
        this.button.style.bottom = '0';
        this.button.style.zIndex = '2147483647';
        this.button.addEventListener('click', () => this.onClick());
    }

    mount() {
        document.body.append(this.button);
    }

    onClick() {
        if (this.collector.isRunning()) {
            this.collector.stop();
            this.uploader.stop();

            this.button.textContent = 'Start';

            return;
        }

        this.collector.start();
        this.uploader.start();

        this.button.textContent = 'Stop';
    }
}

async function main() {
    const tracker = new ChangeTracker();
    const collector = new ChangeCollector(tracker);
    const uploader = new ChangeUploader(collector);
    const panel = new ChangePanel(collector, uploader);

    panel.mount();
}

(function () {
    main()
        .catch((error) => {
            console.error('Error in change-tracking.user.js:', error);
        });
})();
