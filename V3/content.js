(function() {
  'use strict';

  const COLORS = {
    red: '#E91E63',
    yellow: '#F59E0B',
    green: '#10B981',
    blue: '#3B82F6',
    black: '#000000',
    grey: '#6B7280'
  };

  const SKIP_TAGS = new Set([
    'SCRIPT', 'STYLE', 'TEXTAREA', 'INPUT', 'SELECT', 'OPTION',
    'NOSCRIPT', 'IFRAME', 'CANVAS', 'SVG', 'MATH', 'CODE', 'PRE',
    'RUBY', 'RT', 'RP', 'HEAD', 'TITLE', 'META', 'LINK'
  ]);

  const processedNodes = new WeakSet();
  let styleEl = null;

  function shouldSkip(el) {
    return !el || !el.tagName || SKIP_TAGS.has(el.tagName) ||
           el.isContentEditable || el.closest('[contenteditable="true"]');
  }

  function createRuby(char, bopomofo) {
    const ruby = document.createElement('ruby');
    ruby.textContent = char;
    const rt = document.createElement('rt');
    rt.textContent = bopomofo;
    ruby.appendChild(rt);
    return ruby;
  }

  function processText(text) {
    if (!Segmenter.containsChinese(text)) return null;

    const segments = Segmenter.segment(text, BOPOMOFO_DICT);
    if (!segments.some(s => s.bopomofo)) return null;

    const frag = document.createDocumentFragment();
    let buf = '';

    for (const seg of segments) {
      if (seg.bopomofo) {
        if (buf) { frag.appendChild(document.createTextNode(buf)); buf = ''; }
        frag.appendChild(createRuby(seg.text, seg.bopomofo));
      } else {
        buf += seg.text;
      }
    }
    if (buf) frag.appendChild(document.createTextNode(buf));
    return frag;
  }

  function processNode(node) {
    if (!node || processedNodes.has(node)) return;

    if (node.nodeType === Node.ELEMENT_NODE) {
      if (shouldSkip(node)) return;
      Array.from(node.childNodes).forEach(processNode);
    }

    if (node.nodeType === Node.TEXT_NODE && node.textContent.trim()) {
      processedNodes.add(node);
      const frag = processText(node.textContent);
      if (frag && node.parentNode) {
        node.parentNode.replaceChild(frag, node);
      }
    }
  }

  function addStyles(color) {
    styleEl = document.createElement('style');
    styleEl.id = 'bopomofo-ruby-styles';
    styleEl.textContent = `
      ruby { ruby-align: center; }
      ruby rt {
        font-size: 0.4em;
        color: ${color};
        font-weight: 500;
        user-select: none;
      }
    `;
    document.head.appendChild(styleEl);
  }

  function updateColor(color) {
    if (styleEl) {
      styleEl.textContent = `
        ruby { ruby-align: center; }
        ruby rt {
          font-size: 0.4em;
          color: ${color};
          font-weight: 500;
          user-select: none;
        }
      `;
    }
  }

  async function init() {
    if (typeof BOPOMOFO_DICT === 'undefined' || typeof Segmenter === 'undefined') return;

    // Load color preference
    let color = COLORS.red;
    try {
      const { annotationColor = 'red' } = await browser.storage.local.get('annotationColor');
      color = COLORS[annotationColor] || COLORS.red;
    } catch (e) {
    }

    addStyles(color);
    processNode(document.body);

    new MutationObserver(mutations => {
      mutations.forEach(m => m.addedNodes.forEach(processNode));
    }).observe(document.body, { childList: true, subtree: true });

    try {
      browser.runtime.onMessage.addListener((msg) => {
        if (msg.type === 'colorChange') {
          updateColor(msg.color);
        }
      });
    } catch (e) {
    }
  }

  if (document.body) init();
  else document.addEventListener('DOMContentLoaded', init);
})();
