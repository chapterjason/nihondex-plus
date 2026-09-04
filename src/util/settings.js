const KEY = 'nihondex-plus';

class Settings {
    constructor() {
        this.values = Settings.load();
    }

    static load() {
        const stored = localStorage.getItem(KEY);

        if (stored === null) {
            return {};
        }

        try {
            return JSON.parse(stored);
        } catch {
            return {};
        }
    }

    get(name, fallback) {
        return this.values[name] ?? fallback;
    }

    set(name, value) {
        this.values[name] = value;

        localStorage.setItem(KEY, JSON.stringify(this.values));
    }
}

export const settings = new Settings();
