const { chromium } = require('playwright');
const path = require('path');

const outDir = 'C:/Users/SVI/.gemini/antigravity-ide/brain/263a7679-3c1d-4c2a-8d35-18119fdc0422';

async function testScreenshots() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  // 1. VidSrc.pm for Gandhari
  const p1 = await browser.newPage();
  await p1.goto('https://vidsrc.pm/embed/movie/1355228', { waitUntil: 'networkidle', timeout: 15000 }).catch(e => console.log('vidsrc goto err:', e.message));
  await p1.waitForTimeout(3000);
  await p1.screenshot({ path: path.join(outDir, 'check_vidsrc_gandhari.png') });
  await p1.close();

  // 2. AutoEmbed for Gandhari
  const p2 = await browser.newPage();
  await p2.goto('https://autoembed.co/movie/tmdb/1355228', { waitUntil: 'networkidle', timeout: 15000 }).catch(e => console.log('autoembed goto err:', e.message));
  await p2.waitForTimeout(3000);
  await p2.screenshot({ path: path.join(outDir, 'check_autoembed_gandhari.png') });
  await p2.close();

  // 3. VidLink for Gandhari with longer wait to see if it resolves
  const p3 = await browser.newPage();
  await p3.goto('https://vidlink.pro/movie/1355228', { waitUntil: 'networkidle', timeout: 15000 }).catch(e => console.log('vidlink goto err:', e.message));
  await p3.waitForTimeout(10000);
  const vText = await p3.evaluate(() => document.body ? document.body.innerText : '');
  console.log('Vidlink after 10s wait:', vText.slice(0, 300));
  await p3.screenshot({ path: path.join(outDir, 'check_vidlink_gandhari.png') });
  await p3.close();

  await browser.close();
}

testScreenshots();
