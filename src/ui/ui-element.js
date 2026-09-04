export class UiElement {
    constructor() {
        this.element = this.render();
    }

    render() {
        return document.createElement('div');
    }

    mount(parent) {
        parent.append(this.element);
    }

    unmount() {
        this.element.remove();
    }
}
