import { createServer } from 'node:http';
import { createWriteStream, mkdirSync, readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const PORT = Number(process.env.PORT ?? 8787);
const DIRECTORY = join(process.cwd(), 'recordings');

const CORS = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
};

mkdirSync(DIRECTORY, { recursive: true });

const streams = new Map();

function getStream(session) {
    const name = session.replaceAll(/[^a-zA-Z0-9._-]/g, '');

    if (name === '') {
        return null;
    }

    if (!streams.has(name)) {
        streams.set(name, createWriteStream(join(DIRECTORY, `${name}.jsonl`), { flags: 'a' }));
    }

    return streams.get(name);
}

function listRecordings() {
    return readdirSync(DIRECTORY)
        .filter((name) => name.endsWith('.jsonl'))
        .map((name) => {
            const { size, mtime } = statSync(join(DIRECTORY, name));

            return { name, size, modified: mtime.toISOString() };
        })
        .sort((a, b) => b.modified.localeCompare(a.modified));
}

const server = createServer((request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === 'OPTIONS') {
        response.writeHead(204, CORS).end();

        return;
    }

    if (request.method === 'POST' && url.pathname === '/ingest') {
        const stream = getStream(url.searchParams.get('session') ?? '');

        if (stream === null) {
            response.writeHead(400, CORS).end('missing session');

            return;
        }

        let bytes = 0;

        request.on('data', (chunk) => {
            bytes += chunk.length;
        });

        request.pipe(stream, { end: false });

        request.on('end', () => {
            stream.write('\n');

            console.log(`${url.searchParams.get('session')} +${(bytes / 1024).toFixed(1)} kB`);

            response.writeHead(204, CORS).end();
        });

        return;
    }

    if (request.method === 'GET' && url.pathname === '/recordings') {
        response.writeHead(200, { ...CORS, 'content-type': 'application/json' });
        response.end(JSON.stringify(listRecordings(), null, 2));

        return;
    }

    response.writeHead(404, CORS).end('not found');
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`change-tracking sink: http://localhost:${PORT}`);
    console.log(`writing to ${DIRECTORY}`);
});

for (const signal of ['SIGINT', 'SIGTERM']) {
    process.on(signal, () => {
        for (const stream of streams.values()) {
            stream.end();
        }

        server.close(() => process.exit(0));
    });
}
