export function hideElements(selector) {
    const style = document.createElement('style');

    style.textContent = `
        ${selector} {
            display: none !important;
        }
    `;

    document.head.append(style);

    return style;
}
