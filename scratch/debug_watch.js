const { chromium } = require('playwright');
const path = require('path');

const outDir = 'C:/Users/SVI/.gemini/antigravity-ide/brain/263a7679-3c1d-4c2a-8d35-18119fdc0422';

async function inspectWatch() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('Testing http://localhost:5050/#/watch/1355228 (Gandhari)...');
  await page.goto('http://localhost:5050/#/watch/1355228', { waitUntil: 'networkidle' });
  await page.waitForTimeout(6000);

  const info1 = await page.evaluate(() => {
    const iframe = document.getElementById('mainEmbedIframe');
    const player = document.getElementById('netflixPlayer');
    const video = document.getElementById('mainHtml5Video');
    return {
      iframeSrc: iframe ? iframe.src : null,
      iframeDisplay: iframe ? window.getComputedStyle(iframe).display : null,
      videoDisplay: video ? window.getComputedStyle(video).display : null,
      playerActive: player ? player.classList.contains('active') : null,
      playerBg: player ? window.getComputedStyle(player).backgroundImage : null
    };
  });
  console.log('Gandhari watch state:', info1);
  await page.screenshot({ path: path.join(outDir, 'debug_gandhari_watch.png') });

  console.log('\nTesting http://localhost:5050/#/watch/1489543 (G.D.N)...');
  await page.goto('http://localhost:5050/#/watch/1489543', { waitUntil: 'networkidle' });
  await page.waitForTimeout(6000);

  const info2 = await page.evaluate(() => {
    const iframe = document.getElementById('mainEmbedIframe');
    return {
      iframeSrc: iframe ? iframe.src : null
    };
  });
  console.log('GDN watch state:', info2);
  await page.screenshot({ path: path.join(outDir, 'debug_gdn_watch.png') });

  await browser.close();
}

inspectWatch();
