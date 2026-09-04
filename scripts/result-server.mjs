import {createServer} from 'node:http';
import {mkdirSync, readdirSync, statSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';

const PORT = Number(process.env.PORT ?? 3001);
const DIRECTORY = join(process.cwd(), 'results');

const CORS = {
    'access-control-allow-origin': '*',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
    'access-control-allow-headers': 'content-type',
    'access-control-max-age': '86400',
};

mkdirSync(DIRECTORY, {recursive: true});

function listResults() {
    return readdirSync(DIRECTORY)
        .filter((name) => name.endsWith('.json'))
        .map((name) => {
            const {size, mtime} = statSync(join(DIRECTORY, name));

            return {name, size, modified: mtime.toISOString()};
        })
        .sort((a, b) => b.modified.localeCompare(a.modified));
}

const server = createServer((request, response) => {
    const url = new URL(request.url, `http://${request.headers.host}`);

    if (request.method === 'OPTIONS') {
        response.writeHead(204, CORS).end();

        return;
    }

    if (request.method === 'POST' && url.pathname === '/results') {
        const chunks = [];

        request.on('data', (chunk) => chunks.push(chunk));

        request.on('end', () => {
            const body = Buffer.concat(chunks).toString();
            const name = `${new Date().toISOString().replaceAll(':', '-')}.json`;

            writeFileSync(join(DIRECTORY, name), body);

            console.log(`${name} ${(body.length / 1024).toFixed(1)} kB`);

            response.writeHead(200, {...CORS, 'content-type': 'application/json'});
            response.end(JSON.stringify({name}));
        });

        return;
    }

    if (request.method === 'GET' && url.pathname === '/results') {
        response.writeHead(200, {...CORS, 'content-type': 'application/json'});
        response.end(JSON.stringify(listResults(), null, 2));

        return;
    }

    response.writeHead(404, CORS).end('not found');
});

server.listen(PORT, '127.0.0.1', () => {
    console.log(`nihondex-plus results: http://localhost:${PORT}`);
    console.log(`writing to ${DIRECTORY}`);
});
