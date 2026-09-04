import {readFileSync} from 'node:fs';
import {build, context} from 'esbuild';

const ENTRIES = [
    {entry: 'src/main.js', header: 'src/header.js', outfile: 'dist/nihondex-plus.user.js'},
];

const targets = ENTRIES.map(({entry, header, outfile}) => ({
    entryPoints: [entry],
    outfile,
    bundle: true,
    format: 'iife',
    target: 'firefox115',
    charset: 'utf8',
    legalComments: 'none',
    banner: {js: readFileSync(header, 'utf8').trimEnd()},
}));

if (process.argv.includes('--watch')) {
    for (const options of targets) {
        const builder = await context(options);

        await builder.watch();

        console.log(`watching ${options.entryPoints[0]} -> ${options.outfile}`);
    }
} else {
    await Promise.all(targets.map((options) => build(options)));

    console.log(targets.map((options) => options.outfile).join('\n'));
}
