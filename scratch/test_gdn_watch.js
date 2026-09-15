const { chromium } = require('playwright');
const path = require('path');

const outDir = 'C:/Users/SVI/.gemini/antigravity-ide/brain/263a7679-3c1d-4c2a-8d35-18119fdc0422';

async function testGDNWatch() {
  console.log('Testing G.D.N (#/watch/1489543)...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:5050/#/watch/1489543', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(8000); // Wait 8s for VidLink to resolve GDN

  const state = await page.evaluate(() => {
    const iframe = document.getElementById('mainEmbedIframe');
    const hud = document.getElementById('streamBufferingHUD');
    const srvBadge = document.getElementById('playerServerBadge');
    return {
      iframeSrc: iframe ? iframe.src : null,
      hudHidden: hud ? hud.classList.contains('hidden') : null,
      srvBadge: srvBadge ? srvBadge.innerText : null
    };
  });
  console.log('GDN state after 8s:', state);
  await page.screenshot({ path: path.join(outDir, 'test_gdn_resolved.png') });

  await browser.close();
  console.log('Done testing GDN!');
}

testGDNWatch();
