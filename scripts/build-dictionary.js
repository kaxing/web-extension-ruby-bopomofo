#!/usr/bin/env node

const fs = require('fs');
const path = require('path');

const ROOT_DIR = path.join(__dirname, '..');
const DATA_DIR = path.join(ROOT_DIR, 'data');
const OUTPUT_FILE = path.join(ROOT_DIR, 'V3', 'dictionary.js');

function parseTSV(filepath) {
  if (!fs.existsSync(filepath)) {
    console.warn(`Warning: ${filepath} not found, skipping`);
    return {};
  }

  const content = fs.readFileSync(filepath, 'utf-8');
  const dict = {};
  const lines = content.split('\n');

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();

    if (!line || line.startsWith('#')) continue;

    const parts = line.split('\t');
    if (parts.length >= 2) {
      const word = parts[0].trim();
      const bopomofo = parts[1].trim();

      if (word && bopomofo) {
        dict[word] = bopomofo;
      }
    } else {
      console.warn(`Line ${i + 1}: Invalid format: ${line}`);
    }
  }

  return dict;
}

function sortDictionary(dict) {
  const entries = Object.entries(dict);

  entries.sort((a, b) => {
    if (b[0].length !== a[0].length) {
      return b[0].length - a[0].length;
    }
    return a[0].localeCompare(b[0]);
  });

  return Object.fromEntries(entries);
}

function generateDictionaryJS(dict) {
  const sortedDict = sortDictionary(dict);

  let output = `const BOPOMOFO_DICT = {
`;

  const entries = Object.entries(sortedDict);
  entries.forEach(([word, bopomofo], index) => {
    const comma = index < entries.length - 1 ? ',' : '';
    output += `  "${word}": "${bopomofo}"${comma}\n`;
  });

  output += `};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = BOPOMOFO_DICT;
}
`;

  return output;
}

function build() {
  console.log('Building dictionary.js...\n');

  const words = parseTSV(path.join(DATA_DIR, 'words.tsv'));
  const characters = parseTSV(path.join(DATA_DIR, 'characters.tsv'));

  console.log(`Loaded ${Object.keys(words).length} words`);
  console.log(`Loaded ${Object.keys(characters).length} characters`);

  const dict = { ...characters, ...words };

  console.log(`Total unique entries: ${Object.keys(dict).length}`);

  const output = generateDictionaryJS(dict);
  fs.writeFileSync(OUTPUT_FILE, output, 'utf-8');

  console.log(`\nWritten to: ${OUTPUT_FILE}`);
}

build();
