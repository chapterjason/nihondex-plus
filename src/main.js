import {Router} from './core/router.js';
import {observer} from './core/observer.js';
import {panel} from './ui/panel.js';
import {UiButton} from './ui/ui-button.js';
import {PracticeKanaPage} from './page/practice-kana/practice-kana-page.js';
import {PRACTICE_KANA} from './page/practice-kana/constants.js';
import {SettingsModal} from './settings-modal.js';
import {ResultsModal} from './results-modal.js';
import {disableAnimations} from './util/disable-animations.js';
import {settings} from './util/settings.js';
import {post} from './util/post.js';
import {RESULTS, SERVER} from './settings.js';

async function onSession(session, results) {
    if (settings.get(SERVER.name, SERVER.value)) {
        await post(settings.get(RESULTS.name, RESULTS.value), session);

        return;
    }

    results.show(session);
}

async function main() {
    disableAnimations();

    panel.mount(document.body);

    const configuration = new SettingsModal();
    const results = new ResultsModal();

    configuration.mount(document.body);
    results.mount(document.body);

    const button = new UiButton('Settings');

    button.addEventListener('click', () => configuration.open());

    panel.add(button);

    const page = new PracticeKanaPage();

    page.addEventListener('session', (event) => onSession(event.detail, results));

    const router = new Router();

    router.add(`/${PRACTICE_KANA}`, page);
    router.start();

    observer.notify();
}

(() => {
    main()
        .catch((error) => {
            console.error(error);
        });
})();
