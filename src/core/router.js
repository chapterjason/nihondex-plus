export class Router {
    constructor() {
        this.pages = new Map();
        this.current = null;
        this.originals = new Map();
        this.frame = null;
        this.onPopState = () => this.schedule();
    }

    add(path, page) {
        this.pages.set(path, page);
    }

    start() {
        for (const method of ['pushState', 'replaceState']) {
            const original = window.history[method];

            this.originals.set(method, original);

            window.history[method] = new Proxy(original, {
                apply: (target, thisArg, argArray) => {
                    const result = target.apply(thisArg, argArray);

                    this.schedule();

                    return result;
                },
            });
        }

        window.addEventListener('popstate', this.onPopState);

        this.schedule();
    }

    stop() {
        for (const [method, original] of this.originals) {
            window.history[method] = original;
        }

        this.originals.clear();

        window.removeEventListener('popstate', this.onPopState);

        if (this.frame !== null) {
            cancelAnimationFrame(this.frame);

            this.frame = null;
        }
    }

    schedule() {
        if (this.frame !== null) {
            return;
        }

        this.frame = requestAnimationFrame(() => {
            this.frame = null;

            this.navigate();
        });
    }

    navigate() {
        const page = this.pages.get(window.location.pathname) ?? null;

        if (page === this.current) {
            return;
        }

        if (this.current !== null) {
            this.current.unload();
        }

        this.current = page;

        if (page !== null) {
            page.load();
        }
    }
}
