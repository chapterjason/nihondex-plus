const selectorCache = new WeakMap();

function getCandidates(element) {
    const tag = element.localName;
    const classes = [...element.classList].map((name) => `.${CSS.escape(name)}`);
    const candidates = [tag];

    if (element.id !== '') {
        candidates.push(`#${CSS.escape(element.id)}`);
    }

    for (const [index, className] of classes.entries()) {
        candidates.push(className, `${tag}${className}`);

        for (const other of classes.slice(index + 1)) {
            candidates.push(`${className}${other}`, `${tag}${className}${other}`);
        }
    }

    const parent = element.parentElement;

    if (parent !== null) {
        const index = [...parent.children].indexOf(element) + 1;

        candidates.push(`${tag}:nth-child(${index})`);
    }

    return candidates.sort((a, b) => a.length - b.length);
}

function matchesOnly(selector, element) {
    const matches = document.querySelectorAll(selector);

    return matches.length === 1 && matches[0] === element;
}

function getPath(element) {
    const path = [];

    for (let current = element; current !== null; current = current.parentElement) {
        const parent = current.parentElement;

        if (parent === null) {
            path.unshift(current.localName);

            break;
        }

        const index = [...parent.children].indexOf(current) + 1;

        path.unshift(`${current.localName}:nth-child(${index})`);
    }

    return path.join('>');
}

function findSelector(element) {
    const candidates = getCandidates(element);

    for (const candidate of candidates) {
        if (matchesOnly(candidate, element)) {
            return candidate;
        }
    }

    for (let ancestor = element.parentElement; ancestor !== null; ancestor = ancestor.parentElement) {
        const prefix = getUniqueSelector(ancestor);

        for (const candidate of candidates) {
            const selector = `${prefix} ${candidate}`;

            if (matchesOnly(selector, element)) {
                return selector;
            }
        }
    }

    return getPath(element);
}

export function getUniqueSelector(element) {
    if (!(element instanceof Element)) {
        return '';
    }

    if (selectorCache.has(element)) {
        return selectorCache.get(element);
    }

    const selector = findSelector(element);

    selectorCache.set(element, selector);

    return selector;
}
