import {Router} from './core/router.js';
import {panel} from './ui/panel.js';
import {PracticeKanaPage} from './page/practice-kana/practice-kana-page.js';
import {disableAnimations} from './util/disable-animations.js';

async function main() {
    disableAnimations();

    panel.mount(document.body);

    const router = new Router();

    router.add("/practice/kana", new PracticeKanaPage());
    router.start();
}

(() => {
    main()
        .catch((error) => {
            console.error(error);
        });
})();
