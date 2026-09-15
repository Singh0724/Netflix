const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/SVI/.gemini/antigravity-ide/brain/7ecf3a44-2abc-4c12-999f-3cb5f72a5a44';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  await page.goto('http://localhost:5050');
  await page.waitForTimeout(2000);

  // 1. Scroll down to show Top 10 Movies & TV Shows
  console.log('Scrolling to Top 10 sections...');
  await page.evaluate(() => window.scrollBy(0, 950));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_expanded_top10.png') });

  // 2. Scroll down further to show genre rows
  console.log('Scrolling down to genre rows...');
  await page.evaluate(() => window.scrollBy(0, 900));
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_expanded_genre_rows.png') });

  // 3. Navigate to Shows tab
  console.log('Navigating to Shows tab...');
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.click('#nav-tv');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_expanded_shows.png') });

  // 4. Navigate to Movies tab
  console.log('Navigating to Movies tab...');
  await page.click('#nav-movie');
  await page.waitForTimeout(1500);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_expanded_movies.png') });

  console.log('✅ Snapshots saved successfully!');
  await browser.close();
}

run().catch(err => {
  console.error('Error:', err);
  process.exit(1);
});
