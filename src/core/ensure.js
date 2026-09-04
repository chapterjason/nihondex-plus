import {now} from './now.js';
import {sleep} from './sleep.js';

export async function ensure(predicate, {timeout = 1000, interval = 20, action, message = 'Condition not met'} = {}) {
    const deadline = now() + timeout;

    while (!predicate()) {
        if (now() >= deadline) {
            throw new Error(`${message} after ${timeout}ms`);
        }

        action?.();
        await sleep(interval);
    }
}
