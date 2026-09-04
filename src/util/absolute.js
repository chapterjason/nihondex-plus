import {stamp} from './stamp.js';

export function absolute(elapsed) {
    return stamp(new Date(performance.timeOrigin + elapsed));
}
