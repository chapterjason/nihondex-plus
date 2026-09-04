import {PRACTICE_KANA_PATH} from './practice/constants.js';
import {loadPracticeKana, unloadPracticeKana} from './practice/practice-kana.js';

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
