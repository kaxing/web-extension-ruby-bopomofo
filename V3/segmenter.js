const Segmenter = {
  MAX_WORD_LENGTH: 6,

  isChinese(char) {
    const code = char.charCodeAt(0);
    return (
      (code >= 0x4E00 && code <= 0x9FFF) ||
      (code >= 0x3400 && code <= 0x4DBF) ||
      (code >= 0x20000 && code <= 0x2A6DF) ||
      (code >= 0xF900 && code <= 0xFAFF) ||
      (code >= 0x2F800 && code <= 0x2FA1F)
    );
  },

  segment(text, dictionary) {
    const result = [];
    let i = 0;

    while (i < text.length) {
      const char = text[i];

      if (!this.isChinese(char)) {
        result.push({ text: char, bopomofo: null });
        i++;
        continue;
      }

      let matched = false;
      const maxLen = Math.min(this.MAX_WORD_LENGTH, text.length - i);

      for (let len = maxLen; len >= 1; len--) {
        const word = text.substring(i, i + len);
        const bopomofo = dictionary[word];

        if (bopomofo) {
          const bopomofoParts = bopomofo.split(' ');

          if (bopomofoParts.length === word.length) {
            for (let j = 0; j < word.length; j++) {
              result.push({ text: word[j], bopomofo: bopomofoParts[j] });
            }
          } else {
            for (let j = 0; j < word.length; j++) {
              const charBopomofo = bopomofoParts[j] || dictionary[word[j]] || null;
              result.push({ text: word[j], bopomofo: charBopomofo });
            }
          }

          i += len;
          matched = true;
          break;
        }
      }

      if (!matched) {
        result.push({ text: char, bopomofo: null });
        i++;
      }
    }

    return result;
  },

  containsChinese(text) {
    for (let i = 0; i < text.length; i++) {
      if (this.isChinese(text[i])) {
        return true;
      }
    }
    return false;
  }
};

if (typeof module !== 'undefined' && module.exports) {
  module.exports = Segmenter;
}
