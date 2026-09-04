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
