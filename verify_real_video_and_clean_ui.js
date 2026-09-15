const { chromium } = require('playwright');
const path = require('path');

const outDir = 'C:/Users/SVI/.gemini/antigravity-ide/brain/7ecf3a44-2abc-4c12-999f-3cb5f72a5a44';

async function testRealVideoAndCleanUI() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('Navigating to http://localhost:5050...');
  await page.goto('http://localhost:5050', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // 1. Capture clean Home screen showing Row 1 and Row 2
  console.log('Capturing clean Home view...');
  await page.evaluate(() => window.scrollTo(0, 320));
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, 'verify_clean_home_badges.png') });

  // 2. Play "Gandhari" (Movie)
  console.log('Testing video playback for Gandhari...');
  await page.evaluate(() => {
    // Gandhari TMDB ID is 1355228
    launchNetflixPlayerById('1355228');
  });
  await page.waitForTimeout(3000);

  const gandhariIframeSrc = await page.evaluate(() => {
    const iframe = document.getElementById('mainEmbedIframe');
    return iframe ? iframe.src : 'none';
  });
  console.log('Gandhari active stream URL:', gandhariIframeSrc);

  await page.screenshot({ path: path.join(outDir, 'verify_real_stream_gandhari.png') });

  // 3. Exit player
  await page.evaluate(() => exitNetflixPlayer());
  await page.waitForTimeout(600);

  // 4. Play "Chumbak" (TV Show Episode 1)
  console.log('Testing video playback for Chumbak...');
  await page.evaluate(() => {
    launchNetflixPlayerById('313172');
  });
  await page.waitForTimeout(3000);

  const chumbakIframeSrc = await page.evaluate(() => {
    const iframe = document.getElementById('mainEmbedIframe');
    return iframe ? iframe.src : 'none';
  });
  console.log('Chumbak active stream URL:', chumbakIframeSrc);

  await page.screenshot({ path: path.join(outDir, 'verify_real_stream_chumbak.png') });

  await browser.close();
  console.log('Finished testing real video stream and clean UI!');
}

testRealVideoAndCleanUI().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
