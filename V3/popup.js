const COLORS = {
  red: '#E91E63',
  yellow: '#F59E0B',
  green: '#10B981',
  blue: '#3B82F6',
  black: '#000000',
  grey: '#6B7280'
};

async function init() {
  const { annotationColor = 'red' } = await browser.storage.local.get('annotationColor');

  document.querySelector(`[data-color="${annotationColor}"]`)?.classList.add('active');

  document.querySelectorAll('.color-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const color = btn.dataset.color;

      await browser.storage.local.set({ annotationColor: color });

      document.querySelectorAll('.color-btn').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');

      const tabs = await browser.tabs.query({});
      for (const tab of tabs) {
        browser.tabs.sendMessage(tab.id, { type: 'colorChange', color: COLORS[color] }).catch(() => {});
      }
    });
  });
}

init();
