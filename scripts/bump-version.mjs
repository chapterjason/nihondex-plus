import {readFileSync, writeFileSync} from 'node:fs';

const HEADER = 'src/header.js';
const PACKAGE = 'package.json';
const VERSION = /^(\/\/ @version\s+)(\d+)\.(\d+)\.(\d+)$/m;

const header = readFileSync(HEADER, 'utf8');
const match = header.match(VERSION);

if (match === null) {
    throw new Error(`No version found in ${HEADER}`);
}

const version = `${match[2]}.${match[3]}.${Number(match[4]) + 1}`;

writeFileSync(HEADER, header.replace(VERSION, `$1${version}`));

const manifest = JSON.parse(readFileSync(PACKAGE, 'utf8'));

manifest.version = version;

writeFileSync(PACKAGE, `${JSON.stringify(manifest, null, 2)}\n`);

console.log(version);
