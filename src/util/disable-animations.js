export const NO_ANIMATIONS_CLASS = 'nihondex-plus-no-animations';

export function disableAnimations() {
    const style = document.createElement('style');

    style.textContent = `
        .${NO_ANIMATIONS_CLASS},
        .${NO_ANIMATIONS_CLASS} *,
        .${NO_ANIMATIONS_CLASS} *::before,
        .${NO_ANIMATIONS_CLASS} *::after {
            transition: none !important;
            animation: none !important;
        }

        .animate-fade-in {
            opacity: 1 !important;
        }
    `;

    document.head.append(style);
}
