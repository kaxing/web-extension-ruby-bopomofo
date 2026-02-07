#!/usr/bin/env node

const fs = require('fs');
const path = require('path');
const https = require('https');
const { execSync } = require('child_process');

const DATA_DIR = path.join(__dirname, '..', 'data');
const UNIHAN_URL = 'https://www.unicode.org/Public/UCD/latest/ucd/Unihan.zip';
const UNIHAN_ZIP = path.join(DATA_DIR, 'Unihan.zip');
const UNIHAN_READINGS = path.join(DATA_DIR, 'Unihan_Readings.txt');

const PINYIN_TO_BOPOMOFO = {
  'b': 'ㄅ', 'p': 'ㄆ', 'm': 'ㄇ', 'f': 'ㄈ',
  'd': 'ㄉ', 't': 'ㄊ', 'n': 'ㄋ', 'l': 'ㄌ',
  'g': 'ㄍ', 'k': 'ㄎ', 'h': 'ㄏ',
  'j': 'ㄐ', 'q': 'ㄑ', 'x': 'ㄒ',
  'zh': 'ㄓ', 'ch': 'ㄔ', 'sh': 'ㄕ', 'r': 'ㄖ',
  'z': 'ㄗ', 'c': 'ㄘ', 's': 'ㄙ',

  'a': 'ㄚ', 'o': 'ㄛ', 'e': 'ㄜ', 'ê': 'ㄝ',
  'ai': 'ㄞ', 'ei': 'ㄟ', 'ao': 'ㄠ', 'ou': 'ㄡ',
  'an': 'ㄢ', 'en': 'ㄣ', 'ang': 'ㄤ', 'eng': 'ㄥ',
  'er': 'ㄦ',
  'i': 'ㄧ', 'u': 'ㄨ', 'ü': 'ㄩ', 'v': 'ㄩ',

  'ia': 'ㄧㄚ', 'ie': 'ㄧㄝ', 'iao': 'ㄧㄠ', 'iu': 'ㄧㄡ', 'iou': 'ㄧㄡ',
  'ian': 'ㄧㄢ', 'in': 'ㄧㄣ', 'iang': 'ㄧㄤ', 'ing': 'ㄧㄥ',
  'ua': 'ㄨㄚ', 'uo': 'ㄨㄛ', 'uai': 'ㄨㄞ', 'ui': 'ㄨㄟ', 'uei': 'ㄨㄟ',
  'uan': 'ㄨㄢ', 'un': 'ㄨㄣ', 'uen': 'ㄨㄣ', 'uang': 'ㄨㄤ', 'ong': 'ㄨㄥ', 'ueng': 'ㄨㄥ',
  'üe': 'ㄩㄝ', 've': 'ㄩㄝ', 'ue': 'ㄩㄝ',
  'üan': 'ㄩㄢ', 'van': 'ㄩㄢ', 'yuan': 'ㄩㄢ',
  'ün': 'ㄩㄣ', 'vn': 'ㄩㄣ', 'yun': 'ㄩㄣ',
  'iong': 'ㄩㄥ',

  'ng': 'ㄥ',
};

const TONE_MARKS = {
  '1': '', '2': 'ˊ', '3': 'ˇ', '4': 'ˋ', '5': '˙'
};

const TONE_VOWELS = {
  'ā': 'a1', 'á': 'a2', 'ǎ': 'a3', 'à': 'a4',
  'ē': 'e1', 'é': 'e2', 'ě': 'e3', 'è': 'e4',
  'ī': 'i1', 'í': 'i2', 'ǐ': 'i3', 'ì': 'i4',
  'ō': 'o1', 'ó': 'o2', 'ǒ': 'o3', 'ò': 'o4',
  'ū': 'u1', 'ú': 'u2', 'ǔ': 'u3', 'ù': 'u4',
  'ǖ': 'ü1', 'ǘ': 'ü2', 'ǚ': 'ü3', 'ǜ': 'ü4',
  'ü': 'ü', 'ń': 'n2', 'ň': 'n3', 'ǹ': 'n4',
};

function pinyinToBopomofo(pinyin) {
  if (!pinyin) return null;

  let py = pinyin.toLowerCase();

  let tone = '1';
  for (const [marked, base] of Object.entries(TONE_VOWELS)) {
    if (py.includes(marked)) {
      const parts = base.match(/([a-züü])([1-4])?/);
      py = py.replace(marked, parts[1]);
      if (parts[2]) tone = parts[2];
      break;
    }
  }

  py = py.replace(/u:/g, 'ü').replace(/v/g, 'ü');

  const toneMatch = py.match(/([1-5])$/);
  if (toneMatch) {
    tone = toneMatch[1];
    py = py.slice(0, -1);
  }

  const standaloneMap = {
    'a': 'ㄚ', 'o': 'ㄛ', 'e': 'ㄜ',
    'ai': 'ㄞ', 'ei': 'ㄟ', 'ao': 'ㄠ', 'ou': 'ㄡ',
    'an': 'ㄢ', 'en': 'ㄣ', 'ang': 'ㄤ', 'eng': 'ㄥ',
    'er': 'ㄦ',
    'yi': 'ㄧ', 'ya': 'ㄧㄚ', 'ye': 'ㄧㄝ', 'yao': 'ㄧㄠ', 'you': 'ㄧㄡ',
    'yan': 'ㄧㄢ', 'yin': 'ㄧㄣ', 'yang': 'ㄧㄤ', 'ying': 'ㄧㄥ',
    'wu': 'ㄨ', 'wa': 'ㄨㄚ', 'wo': 'ㄨㄛ', 'wai': 'ㄨㄞ', 'wei': 'ㄨㄟ',
    'wan': 'ㄨㄢ', 'wen': 'ㄨㄣ', 'wang': 'ㄨㄤ', 'weng': 'ㄨㄥ',
    'yu': 'ㄩ', 'yue': 'ㄩㄝ', 'yuan': 'ㄩㄢ', 'yun': 'ㄩㄣ', 'yong': 'ㄩㄥ',
  };

  if (standaloneMap[py]) {
    return standaloneMap[py] + TONE_MARKS[tone];
  }

  let initial = '';
  let final = py;

  const twoCharInitials = ['zh', 'ch', 'sh'];
  for (const init of twoCharInitials) {
    if (py.startsWith(init)) {
      initial = PINYIN_TO_BOPOMOFO[init];
      final = py.slice(2);
      break;
    }
  }

  if (!initial) {
    const singleInitials = ['b', 'p', 'm', 'f', 'd', 't', 'n', 'l', 'g', 'k', 'h', 'j', 'q', 'x', 'r', 'z', 'c', 's'];
    for (const init of singleInitials) {
      if (py.startsWith(init)) {
        initial = PINYIN_TO_BOPOMOFO[init];
        final = py.slice(1);
        break;
      }
    }
  }

  if (['ㄐ', 'ㄑ', 'ㄒ'].includes(initial)) {
    if (final === 'u') final = 'ü';
    else if (final.startsWith('u') && !final.startsWith('ua') && !final.startsWith('uo')) {
      final = 'ü' + final.slice(1);
    }
  }

  if (['ㄓ', 'ㄔ', 'ㄕ', 'ㄖ', 'ㄗ', 'ㄘ', 'ㄙ'].includes(initial) && final === 'i') {
    return initial + TONE_MARKS[tone];
  }

  let bopomofoFinal = '';

  const finals = Object.keys(PINYIN_TO_BOPOMOFO)
    .filter(k => k.length > 1)
    .sort((a, b) => b.length - a.length);

  let remaining = final;
  while (remaining.length > 0) {
    let matched = false;
    for (const f of finals) {
      if (remaining.startsWith(f)) {
        bopomofoFinal += PINYIN_TO_BOPOMOFO[f];
        remaining = remaining.slice(f.length);
        matched = true;
        break;
      }
    }
    if (!matched) {
      if (PINYIN_TO_BOPOMOFO[remaining[0]]) {
        bopomofoFinal += PINYIN_TO_BOPOMOFO[remaining[0]];
        remaining = remaining.slice(1);
      } else {
        remaining = remaining.slice(1);
      }
    }
  }

  const result = initial + bopomofoFinal + TONE_MARKS[tone];
  return result || null;
}

function download(url, dest) {
  return new Promise((resolve, reject) => {
    console.log(`Downloading ${url}...`);
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 302 || response.statusCode === 301) {
        download(response.headers.location, dest).then(resolve).catch(reject);
        return;
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close();
        resolve();
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => {});
      reject(err);
    });
  });
}

function parseUnihanReadings(filepath) {
  const content = fs.readFileSync(filepath, 'utf-8');
  const chars = {};

  for (const line of content.split('\n')) {
    if (line.startsWith('#') || !line.trim()) continue;

    const parts = line.split('\t');
    if (parts.length < 3) continue;

    const [codepoint, field, value] = parts;

    if (field === 'kMandarin') {
      const code = parseInt(codepoint.replace('U+', ''), 16);
      const char = String.fromCodePoint(code);

      const readings = value.split(' ');
      const pinyin = readings[0];

      const bopomofo = pinyinToBopomofo(pinyin);
      if (bopomofo) {
        chars[char] = bopomofo;
      }
    }
  }

  return chars;
}

async function main() {
  fs.mkdirSync(DATA_DIR, { recursive: true });

  if (!fs.existsSync(UNIHAN_READINGS)) {
    if (!fs.existsSync(UNIHAN_ZIP)) {
      await download(UNIHAN_URL, UNIHAN_ZIP);
    }

    console.log('Extracting Unihan_Readings.txt...');
    execSync(`unzip -o "${UNIHAN_ZIP}" Unihan_Readings.txt -d "${DATA_DIR}"`);
  }

  console.log('Parsing Unihan readings...');
  const chars = parseUnihanReadings(UNIHAN_READINGS);

  console.log(`Found ${Object.keys(chars).length} character readings`);

  const existingPath = path.join(DATA_DIR, 'characters.tsv');
  const existing = {};
  if (fs.existsSync(existingPath)) {
    const content = fs.readFileSync(existingPath, 'utf-8');
    for (const line of content.split('\n')) {
      if (line.startsWith('#') || !line.trim()) continue;
      const [char, bopomofo] = line.split('\t');
      if (char && bopomofo) {
        existing[char] = bopomofo;
      }
    }
  }

  const merged = { ...chars, ...existing };

  console.log(`Total characters after merge: ${Object.keys(merged).length}`);

  let output = `# Single character bopomofo readings\n`;
  output += `# Auto-imported from Unihan + manually curated\n`;
  output += `# Format: character<TAB>bopomofo\n\n`;

  const sortedChars = Object.keys(merged).sort();
  for (const char of sortedChars) {
    output += `${char}\t${merged[char]}\n`;
  }

  fs.writeFileSync(existingPath, output, 'utf-8');
  console.log(`Written to ${existingPath}`);

  console.log('\nSample conversions:');
  const testChars = ['台', '灣', '獨', '立', '就', '是', '讚'];
  for (const char of testChars) {
    console.log(`  ${char}: ${merged[char] || 'NOT FOUND'}`);
  }
}

main().catch(console.error);
