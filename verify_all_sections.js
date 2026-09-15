const { chromium } = require('playwright');
const path = require('path');

const outDir = 'C:/Users/SVI/.gemini/antigravity-ide/brain/7ecf3a44-2abc-4c12-999f-3cb5f72a5a44';

async function run() {
  const browser = await chromium.launch({
    channel: 'msedge',
    headless: true
  });
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 }
  });
  const page = await context.newPage();

  console.log('Navigating to http://localhost:5050...');
  await page.goto('http://localhost:5050', { waitUntil: 'networkidle' });
  await page.waitForTimeout(2000);

  // 1. Home view with official desert soldiers billboard & cards
  console.log('Capturing Home view...');
  await page.screenshot({ path: path.join(outDir, 'verify_01_home_official.png'), fullPage: false });

  // 2. Notification tray with 11 notifications
  console.log('Opening Notifications...');
  const bell = await page.$('.bell-btn-wrap');
  if (bell) {
    await bell.click();
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, 'verify_02_notifications_tray.png') });
    await bell.click(); // close
    await page.waitForTimeout(400);
  }

  // 3. Hover popover card over Gandhari or Vishwanath
  console.log('Hovering card...');
  const cards = await page.$$('.standard-media-card');
  if (cards.length > 3) {
    await cards[3].hover(); // Gandhari
    await page.waitForTimeout(800);
    await page.screenshot({ path: path.join(outDir, 'verify_03_hover_popover.png') });
  }

  // 4. TV Shows view
  console.log('Navigating to Shows...');
  const showsLink = await page.$('#nav-tv');
  if (showsLink) {
    await showsLink.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, 'verify_04_shows_tab.png') });
  }

  // 5. Movies view
  console.log('Navigating to Movies...');
  const moviesLink = await page.$('#nav-movie');
  if (moviesLink) {
    await moviesLink.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, 'verify_05_movies_tab.png') });
  }

  // 6. Games view
  console.log('Navigating to Games...');
  const gamesLink = await page.$('#nav-games');
  if (gamesLink) {
    await gamesLink.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, 'verify_06_games_tab.png') });
  }

  // 7. New & Popular view
  console.log('Navigating to New & Popular...');
  const newLink = await page.$('#nav-new');
  if (newLink) {
    await newLink.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, 'verify_07_new_popular_tab.png') });
  }

  // 8. Browse by Languages view
  console.log('Navigating to Languages...');
  const langLink = await page.$('#nav-languages');
  if (langLink) {
    await langLink.click();
    await page.waitForTimeout(1500);
    await page.screenshot({ path: path.join(outDir, 'verify_08_languages_tab.png') });
  }

  // 9. Full Netflix Player
  console.log('Testing video player with Chumbak E1...');
  await page.evaluate(() => {
    if (typeof launchNetflixPlayerById === 'function') {
      launchNetflixPlayerById('313172'); // Chumbak E1 Episode 1
    }
  });
  await page.waitForTimeout(2000);
  await page.screenshot({ path: path.join(outDir, 'verify_09_player_experience.png') });

  console.log('Done capturing all screenshots!');
  await browser.close();
}

run().catch(err => {
  console.error('Error running verification:', err);
  process.exit(1);
});
