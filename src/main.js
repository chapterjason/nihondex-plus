import {Router} from './core/router.js';
import {panel} from './ui/panel.js';
import {PracticeKanaPage} from './page/practice-kana/practice-kana-page.js';
import {disableAnimations} from './util/disable-animations.js';
import {UiInput} from './ui/ui-input.js';
import {UiModal} from './ui/ui-modal.js';
import {UiButton} from './ui/ui-button.js';
import {UiCheckbox} from './ui/ui-checkbox.js';
import {UiTextarea} from './ui/ui-textarea.js';
import {settings} from './util/settings.js';
import {post} from './util/post.js';
import {RESULTS, SERVER} from './settings.js';

function toggle(element, enabled) {
    if (enabled) {
        element.enable();

        return;
    }

    element.disable();
}

async function onSession(session, output, results) {
    if (settings.get(SERVER.name, SERVER.value)) {
        await post(settings.get(RESULTS.name, RESULTS.value), session);

        return;
    }

    output.set(JSON.stringify(session, null, 4));

    results.open();
    output.select();
}

async function main() {
    disableAnimations();

    panel.mount(document.body);

    const modal = new UiModal('Settings');

    const server = settings.get(SERVER.name, SERVER.value);

    const url = new UiInput(
        RESULTS.label,
        settings.get(RESULTS.name, RESULTS.value),
        (value) => settings.set(RESULTS.name, value),
    );

    modal.add(new UiCheckbox(SERVER.label, server, (value) => {
        settings.set(SERVER.name, value);

        toggle(url, value);
    }));

    modal.add(url);

    toggle(url, server);

    modal.mount(document.body);

    panel.add(new UiButton('Settings', () => modal.open()));

    const output = new UiTextarea('Session');
    const results = new UiModal('Results');

    results.add(output);
    results.mount(document.body);

    const page = new PracticeKanaPage();

    page.addEventListener('session', (event) => onSession(event.detail, output, results));

    const router = new Router();

    router.add("/practice/kana", page);
    router.start();
}

(() => {
    main()
        .catch((error) => {
            console.error(error);
        });
})();
