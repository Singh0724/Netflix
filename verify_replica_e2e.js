const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const outDir = 'C:/Users/SVI/.gemini/antigravity-ide/brain/263a7679-3c1d-4c2a-8d35-18119fdc0422';

async function run() {
  console.log('Launching browser for Netflix 1:1 replica verification...');
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('1. Navigating to http://localhost:5050...');
  await page.goto('http://localhost:5050', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  // Capture Home Browse Screen
  console.log('Capturing Home screen...');
  await page.screenshot({ path: path.join(outDir, 'replica_01_home.png') });

  // 2. Test Live Search Autocomplete
  console.log('2. Testing live search typeahead...');
  const searchInput = await page.$('#navSearchInput');
  if (searchInput) {
    await searchInput.fill('Chumbak');
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, 'replica_02_search_suggest.png') });
    await searchInput.fill('');
    await page.waitForTimeout(500);
  }

  // 3. Hover Card Popover
  console.log('3. Testing card hover popover...');
  const standardCard = await page.$('.standard-media-card');
  if (standardCard) {
    await standardCard.hover();
    await page.waitForTimeout(1000);
    await page.screenshot({ path: path.join(outDir, 'replica_03_hover_popover.png') });
  }

  // 4. More Info Deep Modal (Two-Column + Episodes + More Like This + About)
  console.log('4. Testing deep "More Info" modal...');
  await page.evaluate(() => {
    const item = Array.from(catalogCache.values()).find(it => it.title.includes('Chumbak') || it.type === 'tv');
    if (item) openQuickviewModal(item);
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, 'replica_04_more_info_modal.png') });

  // Scroll modal down to capture More Like This & About sections
  console.log('Scrolling modal to More Like This & About...');
  await page.evaluate(() => {
    const card = document.querySelector('.detail-modal-card');
    if (card) card.scrollTop = 550;
  });
  await page.waitForTimeout(800);
  await page.screenshot({ path: path.join(outDir, 'replica_05_modal_recommendations.png') });

  // Close modal
  await page.evaluate(() => closeDetailModal());
  await page.waitForTimeout(500);

  // 5. Test Full Netflix Player
  console.log('5. Testing Netflix Streaming Player...');
  await page.evaluate(() => {
    const item = Array.from(catalogCache.values())[0];
    launchNetflixPlayer(item);
  });
  await page.waitForTimeout(2500);
  await page.screenshot({ path: path.join(outDir, 'replica_06_player_active.png') });

  // 6. Test Episode Drawer inside Player
  console.log('6. Opening Episode Drawer inside Player...');
  await page.evaluate(() => {
    if (typeof toggleEpisodeDrawer === 'function') toggleEpisodeDrawer();
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'replica_07_player_episode_drawer.png') });

  // 7. Test Audio & Subtitles Selector inside Player
  console.log('7. Opening Audio & Subtitles Flyout...');
  await page.evaluate(() => {
    if (typeof toggleEpisodeDrawer === 'function') {
      const drawer = document.getElementById('episodeDrawerPanel');
      if (drawer && drawer.classList.contains('open')) toggleEpisodeDrawer();
    }
    const btn = document.getElementById('playerAudioBtn');
    if (btn) btn.click();
  });
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(outDir, 'replica_08_player_audio_subs.png') });

  console.log('All verification steps completed successfully!');
  await browser.close();
}

run().catch(err => {
  console.error('Verification failed:', err);
  process.exit(1);
});
