const { chromium } = require('playwright');
const path = require('path');

const outDir = 'C:/Users/SVI/.gemini/antigravity-ide/brain/263a7679-3c1d-4c2a-8d35-18119fdc0422';

async function testFastEmbeds() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });

  // 1. VidSrc.pm for Gandhari
  console.log('Testing vidsrc for Gandhari...');
  const p1 = await browser.newPage();
  await p1.goto('https://vidsrc.pm/embed/movie/1355228', { waitUntil: 'load', timeout: 10000 });
  await p1.waitForTimeout(3000);
  await p1.screenshot({ path: path.join(outDir, 'test_vidsrc_gandhari.png') });
  await p1.close();

  // 2. VidSrc.pm for GDN
  console.log('Testing vidsrc for GDN...');
  const p2 = await browser.newPage();
  await p2.goto('https://vidsrc.pm/embed/movie/1489543', { waitUntil: 'load', timeout: 10000 });
  await p2.waitForTimeout(3000);
  await p2.screenshot({ path: path.join(outDir, 'test_vidsrc_gdn.png') });
  await p2.close();

  // 3. Autoembed for Gandhari
  console.log('Testing autoembed for Gandhari...');
  const p3 = await browser.newPage();
  await p3.goto('https://autoembed.co/movie/tmdb/1355228', { waitUntil: 'load', timeout: 10000 });
  await p3.waitForTimeout(3000);
  await p3.screenshot({ path: path.join(outDir, 'test_autoembed_gandhari.png') });
  await p3.close();

  await browser.close();
  console.log('Done testing fast embeds!');
}

testFastEmbeds();
