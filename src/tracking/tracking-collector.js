export class TrackingCollector extends EventTarget {
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
                });
                break;

            case 'pointerdown':
            case 'pointerup':
                Object.assign(record, {
                    x: Math.round(source.clientX),
                    y: Math.round(source.clientY),
                    button: TrackingCollector.button(source),
                    pointerType: source.pointerType,
                });
                break;

            case 'compositionstart':
            case 'compositionupdate':
            case 'compositionend':
                Object.assign(record, {
                    data: source.data,
                });
                break;

            case 'focusin':
            case 'focusout':
                Object.assign(record, {
                });
                break;

            case 'start':
            case 'end':
                if (source !== null) {
                    Object.assign(record, {
                        x: Math.round(source.clientX),
                        y: Math.round(source.clientY),
                        pointerType: source.pointerType,
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
                });
                break;
        }

        this.dispatchEvent(new CustomEvent('line', {
            detail: { type, time, source, record },
        }));

        return JSON.stringify(record);
    }
}
