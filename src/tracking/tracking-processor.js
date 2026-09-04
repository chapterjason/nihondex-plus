export class TrackingProcessor {
    static MOVEMENT_GAP = 100;

    static FIELDS = [
        'time',
        'type',
        'x',
        'y',
        'button',
        'pointerType',
        'code',
        'key',
        'modifiers',
        'data',
        'state',
    ];

    static custom(records) {
        return records
            .map((record) => Object.entries(record).filter(([field]) => !TrackingProcessor.FIELDS.includes(field)))
            .map((entries, index) => [records[index].time, entries])
            .filter(([, entries]) => entries.length > 0)
            .map(([time, entries]) => Object.fromEntries([['time', time], ...entries]));
    }

    static withCustom(entry, records) {
        const custom = TrackingProcessor.custom(records);

        return custom.length === 0 ? entry : { ...entry, custom };
    }

    static BOUNDARIES = [
        'pointerdown',
        'pointerup',
        'pointercancel',
        'pointerenter',
        'pointerleave',
    ];

    static distance(from, to) {
        return Math.hypot(to.x - from.x, to.y - from.y);
    }

    static angleBetween(previous, current) {
        const delta = current - previous;

        return Math.abs(Math.atan2(Math.sin(delta), Math.cos(delta)));
    }

    constructor(log) {
        this.records = log
            .map((line) => JSON.parse(line))
            .sort((a, b) => a.time - b.time);
    }

    select(...types) {
        return this.records.filter((record) => types.includes(record.type));
    }

    process() {
        return [
            ...this.movements(),
            ...this.typing(),
            ...this.visibility(),
            ...this.select('start', 'end', 'click', ...TrackingProcessor.BOUNDARIES, 'focusin', 'focusout'),
        ].sort((a, b) => a.time - b.time);
    }

    movements() {
        const groups = [];

        let current = null;

        for (const event of this.select('pointermove', ...TrackingProcessor.BOUNDARIES)) {
            if (event.type !== 'pointermove') {
                current = null;

                continue;
            }

            if (current === null || event.time - current[current.length - 1].time > TrackingProcessor.MOVEMENT_GAP) {
                current = [event];
                groups.push(current);

                continue;
            }

            current.push(event);
        }

        return groups
            .filter((points) => points.length > 1)
            .map((points) => this.describeMovement(points))
            .filter((movement) => movement.distance > 0);
    }

    describeMovement(points) {
        const first = points[0];
        const last = points[points.length - 1];

        let distance = 0;
        let peakSpeed = 0;
        let directionChanges = 0;
        let previousAngle = null;

        for (let index = 1; index < points.length; index += 1) {
            const from = points[index - 1];
            const to = points[index];
            const step = TrackingProcessor.distance(from, to);
            const elapsed = to.time - from.time;

            distance += step;

            if (elapsed > 0) {
                peakSpeed = Math.max(peakSpeed, step / elapsed);
            }

            if (step === 0) {
                continue;
            }

            const angle = Math.atan2(to.y - from.y, to.x - from.x);

            if (previousAngle !== null && TrackingProcessor.angleBetween(previousAngle, angle) > Math.PI / 2) {
                directionChanges += 1;
            }

            previousAngle = angle;
        }

        const displacement = TrackingProcessor.distance(first, last);

        const movement = {
            time: first.time,
            type: 'movement',
            end: last.time,
            duration: last.time - first.time,
            samples: points.length,
            from: { x: first.x, y: first.y },
            to: { x: last.x, y: last.y },
            distance: Math.round(distance),
            displacement: Math.round(displacement),
            efficiency: distance === 0 ? 1 : displacement / distance,
            peakSpeed,
            directionChanges,
        };

        return TrackingProcessor.withCustom(movement, points);
    }

    typing() {
        const events = this.select(
            'keydown',
            'keyup',
            'compositionstart',
            'compositionupdate',
            'compositionend',
            'focusin',
            'focusout',
        );

        const groups = [];

        let current = null;

        for (const event of events) {
            if (event.type === 'focusout') {
                current = null;

                continue;
            }

            if (event.type === 'focusin') {
                current = [];
                groups.push(current);

                continue;
            }

            if (current === null) {
                current = [];
                groups.push(current);
            }

            current.push(event);
        }

        return groups
            .filter((group) => group.length > 0)
            .map((group) => this.describeTyping(group));
    }

    describeTyping(events) {
        const characters = [];
        const intervals = [];
        const dwells = [];
        const compositions = [];
        const pressed = new Map();

        let keys = 0;
        let backspaces = 0;
        let previousKeydown = null;
        let composing = null;

        for (const event of events) {
            switch (event.type) {
                case 'keydown':
                    keys += 1;
                    pressed.set(event.code, event.time);

                    if (previousKeydown !== null) {
                        intervals.push(event.time - previousKeydown);
                    }

                    previousKeydown = event.time;

                    if (composing !== null) {
                        break;
                    }

                    if (event.key === 'Backspace') {
                        backspaces += 1;
                        characters.pop();
                    } else if ([...event.key].length === 1) {
                        characters.push(event.key);
                    }

                    break;

                case 'keyup': {
                    const down = pressed.get(event.code);

                    if (down !== undefined) {
                        dwells.push(event.time - down);
                        pressed.delete(event.code);
                    }

                    break;
                }

                case 'compositionstart':
                    composing = { start: event.time, updates: 0, data: '' };

                    break;

                case 'compositionupdate':
                    if (composing !== null) {
                        composing.updates += 1;
                        composing.data = event.data;
                    }

                    break;

                case 'compositionend':
                    if (composing !== null) {
                        composing.end = event.time;
                        composing.duration = event.time - composing.start;
                        composing.data = event.data;
                        compositions.push(composing);
                        composing = null;
                    }

                    characters.push(...event.data);

                    break;
            }
        }

        const first = events[0];
        const last = events[events.length - 1];

        const run = {
            time: first.time,
            type: 'typing',
            end: last.time,
            duration: last.time - first.time,
            text: characters.join(''),
            keys,
            backspaces,
            intervals,
            dwells,
            compositions,
        };

        return TrackingProcessor.withCustom(run, events);
    }

    visibility() {
        const changes = this.select('visibilitychange');
        const last = this.records[this.records.length - 1];
        const end = last === undefined ? 0 : last.time;

        return changes.map((change, index) => {
            const next = changes[index + 1];
            const until = next === undefined ? end : next.time;

            return {
                ...change,
                end: until,
                duration: until - change.time,
            };
        });
    }
}
