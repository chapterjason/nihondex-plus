import {date} from './date.js';
import {time} from './time.js';

export function stamp(value = new Date()) {
    const milliseconds = String(value.getMilliseconds()).padStart(3, '0');

    return `${date(value)} ${time(value)}.${milliseconds}`;
}
