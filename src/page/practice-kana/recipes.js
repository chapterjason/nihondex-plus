import {PRACTICE_KANA, KANA_ROW_ORDER, KANA_DAKUTEN_OFFSET, KANA_COMBINATIONS_OFFSET} from './constants.js';

const MODES = ['selectRomanji', 'selectKana', 'typeRomanji'];

const GROUPS = [
    {id: 'basics', name: 'Basics', rows: KANA_ROW_ORDER.slice(0, KANA_DAKUTEN_OFFSET), size: 20},
    {id: 'dakuten', name: 'Dakuten', rows: KANA_ROW_ORDER.slice(KANA_DAKUTEN_OFFSET, KANA_COMBINATIONS_OFFSET), size: 20},
    {id: 'combinations', name: 'Combinations', rows: KANA_ROW_ORDER.slice(KANA_COMBINATIONS_OFFSET), size: 20},
    {id: 'all', name: 'All', rows: KANA_ROW_ORDER, size: 40},
];

const SCRIPTS = [
    {id: 'hiragana', name: 'Hiragana', scripts: ['hiragana']},
    {id: 'katakana', name: 'Katakana', scripts: ['katakana']},
    {id: 'kana', name: 'Kana', scripts: ['hiragana', 'katakana']},
];

function rows(enabled) {
    return Object.fromEntries(KANA_ROW_ORDER.map((row) => [row, enabled.includes(row)]));
}

function create(script, group) {
    return {
        id: `${script.id}-${group.id}`,
        module: PRACTICE_KANA,
        name: `${script.name} ${group.name}`,
        settings: {
            drawKana: false,
            selectRomanji: false,
            selectKana: false,
            typeRomanji: false,
            listenType: false,
            listenDraw: false,
            wordToKana: false,
            ...Object.fromEntries(MODES.map((mode) => [mode, true])),
            order: 'random',
            size: group.size,
            learningCards: false,
            randomFont: true,
            kana: {
                hiragana: rows(script.scripts.includes('hiragana') ? group.rows : []),
                katakana: rows(script.scripts.includes('katakana') ? group.rows : []),
            },
        },
    };
}

export const recipes = SCRIPTS.flatMap((script) => GROUPS.map((group) => create(script, group)));
