#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const DICT_FILE = path.join(ROOT_DIR, 'V3', 'dictionary.js');
const DATA_DIR = path.join(ROOT_DIR, 'data');

const dictContent = fs.readFileSync(DICT_FILE, 'utf-8');

const entries = [];
const regex = /"([^"]+)":\s*"([^"]+)"/g;
let match;

while ((match = regex.exec(dictContent)) !== null) {
  entries.push([match[1], match[2]]);
}

const words = entries.filter(([word]) => word.length > 1);
const characters = entries.filter(([word]) => word.length === 1);

function toTSV(entries, header) {
  let content = `# ${header}\n`;
  content += `# Format: word<TAB>bopomofo\n`;
  content += `# Lines starting with # are comments\n\n`;

  for (const [word, bopomofo] of entries) {
    content += `${word}\t${bopomofo}\n`;
  }

  return content;
}

fs.mkdirSync(DATA_DIR, { recursive: true });

fs.writeFileSync(
  path.join(DATA_DIR, 'words.tsv'),
  toTSV(words, 'Multi-character words for 多音字 disambiguation'),
  'utf-8'
);

fs.writeFileSync(
  path.join(DATA_DIR, 'characters.tsv'),
  toTSV(characters, 'Single character bopomofo readings'),
  'utf-8'
);

console.log(`Exported ${words.length} words to data/words.tsv`);
console.log(`Exported ${characters.length} characters to data/characters.tsv`);
