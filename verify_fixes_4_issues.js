const { chromium } = require('playwright');
const path = require('path');

const outDir = 'C:/Users/SVI/.gemini/antigravity-ide/brain/263a7679-3c1d-4c2a-8d35-18119fdc0422';

async function verifyAllFourFixes() {
  console.log('🚀 Starting end-to-end verification of the 4 reported issues...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    // 1. Browse UI: Edge-to-Edge Billboard & Clean Badging
    console.log('\n--- 1. Testing Browse Screen & Badging ---');
    await page.goto('http://localhost:5050', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2500);

    // Verify row 1 does not have Top 10 badges
    const row1Badges = await page.evaluate(() => {
      const row1 = document.querySelector('.netflix-content-body .netflix-row:first-of-type');
      if (!row1) return 0;
      const top10Badges = row1.querySelectorAll('.top10-badge, .badge-top10');
      return top10Badges.length;
    });
    console.log('Row 1 Top 10 badges count (expected 0):', row1Badges);

    // Scroll slightly to view billboard + row 1 bleed
    await page.evaluate(() => window.scrollTo(0, 200));
    await page.waitForTimeout(1000);
    const browseCleanPath = path.join(outDir, 'fix_02_browse_clean.png');
    await page.screenshot({ path: browseCleanPath });
    console.log('📸 Captured fix_02_browse_clean.png');

    // 2. Real TMDb Cast and Director in More Info Modal
    console.log('\n--- 2. Testing More Info Modal Real Credits ---');
    await page.evaluate(async () => {
      await openQuickviewModalById('1408162'); // Suriya's Movie
    });
    await page.waitForTimeout(2500);

    const castText = await page.evaluate(() => {
      const castEl = document.getElementById('modalCastText');
      const dirEl = document.getElementById('modalDirectorText');
      const aboutCastEl = document.getElementById('modalAboutCastText');
      return {
        cast: castEl ? castEl.innerText : '',
        director: dirEl ? dirEl.innerText : '',
        aboutCast: aboutCastEl ? aboutCastEl.innerText : ''
      };
    });
    console.log('Modal Cast retrieved:', castText.cast);
    console.log('Modal Director retrieved:', castText.director);

    const modalCreditsPath = path.join(outDir, 'fix_04_real_credits.png');
    await page.screenshot({ path: modalCreditsPath });
    console.log('📸 Captured fix_04_real_credits.png');

    // 3. Test Clicking "Play" in Modal
    console.log('\n--- 3. Testing Modal Play Button ---');
    await page.click('#modalHeroPlayBtn');
    await page.waitForTimeout(3000);

    const playerStateAfterModalPlay = await page.evaluate(() => {
      const player = document.getElementById('netflixCadmiumPlayer');
      const iframe = document.getElementById('mainEmbedIframe');
      const modal = document.getElementById('detailQuickviewModal');
      return {
        isPlayerActive: player && player.classList.contains('active'),
        isModalActive: modal && modal.classList.contains('active'),
        iframeSrc: iframe ? iframe.src : '',
        currentHash: window.location.hash
      };
    });
    console.log('State after modal play button click:', playerStateAfterModalPlay);

    const modalPlayPath = path.join(outDir, 'fix_03_modal_play.png');
    await page.screenshot({ path: modalPlayPath });
    console.log('📸 Captured fix_03_modal_play.png');

    // 4. Test Player UI Cleanliness and Stream Quality on a Released Movie (e.g. Moana 2: 1241982)
    console.log('\n--- 4. Testing Player UI & Clean Video on Moana 2 ---');
    await page.evaluate(() => {
      launchNetflixPlayer({
        id: '1241982',
        title: 'Moana 2',
        type: 'movie',
        tmdbId: 1241982
      });
    });
    await page.waitForTimeout(5000);

    const playerUiChecks = await page.evaluate(() => {
      const devControls = document.getElementById('playerDevControls');
      const devDisplay = devControls ? window.getComputedStyle(devControls).display : 'none';
      const toast = document.getElementById('netflixToast');
      const toastVisible = toast ? toast.classList.contains('visible') : false;
      const iframe = document.getElementById('mainEmbedIframe');
      return {
        devControlsHidden: devDisplay === 'none',
        noAlertToast: !toastVisible,
        isVidLink: iframe ? iframe.src.includes('vidlink.pro') : false,
        iframeSrc: iframe ? iframe.src : ''
      };
    });
    console.log('Player UI Cleanliness Checks:', playerUiChecks);

    const playerCleanPath = path.join(outDir, 'fix_01_player_clean.png');
    await page.screenshot({ path: playerCleanPath });
    console.log('📸 Captured fix_01_player_clean.png');

    console.log('\n✅ All 4 Issue Verifications Complete!');
  } catch (err) {
    console.error('❌ Verification failed:', err);
    throw err;
  } finally {
    await browser.close();
  }
}

verifyAllFourFixes().catch(err => {
  console.error(err);
  process.exit(1);
});
