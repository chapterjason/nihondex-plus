export class UiElement extends EventTarget {
    constructor() {
        super();

        this.element = this.render();
    }

    render() {
        return document.createElement('div');
    }

    emit(type, detail = null) {
        this.dispatchEvent(new CustomEvent(type, {detail}));
    }

    mount(parent) {
        parent.append(this.element);
    }

    unmount() {
        this.element.remove();
    }
}
