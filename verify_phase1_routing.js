const { chromium } = require('playwright');
const path = require('path');

async function testPhase1() {
  console.log('--- Starting Phase 1 Router & Deep-Link Verification ---');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  // Test 1: Home load
  console.log('1. Loading http://localhost:5050/#/browse...');
  await page.goto('http://localhost:5050/#/browse', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // Test 2: Click card -> modal opens and URL becomes #/title/:id
  console.log('2. Clicking card to test #/title/:id routing...');
  const card = await page.$('.standard-media-card');
  if (card) {
    await card.click();
    await page.waitForTimeout(1000);
    const hash = await page.evaluate(() => window.location.hash);
    console.log('Current hash after card click:', hash);
    if (!hash.startsWith('#/title/')) {
      throw new Error('Hash did not update to #/title/:id, got: ' + hash);
    }
  }

  // Test 3: Browser Back button -> modal closes and URL returns to #/browse
  console.log('3. Testing browser back button when modal is open...');
  await page.goBack();
  await page.waitForTimeout(1000);
  const hashAfterBack = await page.evaluate(() => window.location.hash);
  const isModalActive = await page.evaluate(() => document.getElementById('detailQuickviewModal').classList.contains('active'));
  console.log('Hash after back:', hashAfterBack, 'Modal active:', isModalActive);
  if (isModalActive) {
    throw new Error('Modal did not close on browser Back');
  }

  // Test 4: Direct deep-link to #/browse?category=tv
  console.log('4. Testing direct category deep-link to #/browse?category=tv...');
  await page.goto('http://localhost:5050/#/browse?category=tv', { waitUntil: 'networkidle' });
  await page.waitForTimeout(1500);
  const isSubheaderActive = await page.evaluate(() => document.getElementById('genreSubheader').classList.contains('active'));
  console.log('TV subheader active on deep-link:', isSubheaderActive);
  if (!isSubheaderActive) {
    throw new Error('TV subheader was not activated by category deep link');
  }

  // Test 5: Deep-link directly into player: #/watch/66732 (Stranger Things)
  console.log('5. Testing direct player deep-link to #/watch/66732...');
  await page.goto('http://localhost:5050/#/watch/66732', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);
  const isPlayerActive = await page.evaluate(() => document.getElementById('netflixPlayer').classList.contains('active'));
  console.log('Player active on direct deep link:', isPlayerActive);
  if (!isPlayerActive) {
    throw new Error('Streaming player did not launch on direct #/watch/:id deep link');
  }

  console.log('✅ Phase 1 Router, Deep-Linking & History tests PASSED completely!');
  await browser.close();
}

testPhase1().catch(err => {
  console.error('❌ Phase 1 test failed:', err);
  process.exit(1);
});
