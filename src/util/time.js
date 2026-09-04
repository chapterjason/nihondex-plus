export function time(value = new Date()) {
    const hours = String(value.getHours()).padStart(2, '0');
    const minutes = String(value.getMinutes()).padStart(2, '0');
    const seconds = String(value.getSeconds()).padStart(2, '0');

    return `${hours}:${minutes}:${seconds}`;
}
