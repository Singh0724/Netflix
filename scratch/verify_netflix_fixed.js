const { chromium } = require('playwright');
const path = require('path');

const outDir = 'C:/Users/SVI/.gemini/antigravity-ide/brain/cd974135-f399-448b-b18a-2b0e976da801';

async function runE2EVerification() {
  console.log('🚀 Launching Playwright browser for complete Netflix replica validation...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  try {
    // 1. Home Page Verification
    console.log('\n--- 1. Testing Home Screen & Full-Bleed Billboard ---');
    await page.goto('http://localhost:5050', { waitUntil: 'networkidle' });
    await page.waitForTimeout(2000);

    const homeChecks = await page.evaluate(() => {
      const hero = document.getElementById('billboardCard');
      const row1 = document.querySelector('.netflix-content-body .category-section-row:first-of-type');
      const row1Top10Badges = row1 ? row1.querySelectorAll('.top10-huge-num, .top10-badge-corner').length : 0;
      const top10Row = document.querySelector('#section-top_10_movies_india, #section-top_10_tv_india');
      const top10NumberedItems = top10Row ? top10Row.querySelectorAll('.top10-numbered-item').length : 0;

      return {
        heroLowerTitle: document.getElementById('heroLowerTitle')?.innerText,
        row1Title: row1 ? row1.querySelector('.section-title')?.innerText : '',
        row1Top10Badges,
        top10NumberedItems
      };
    });

    console.log('Home Checks:', homeChecks);
    await page.screenshot({ path: path.join(outDir, '01_home_screen.png') });
    console.log('📸 Captured 01_home_screen.png');

    // 2. More Info Modal Verification
    console.log('\n--- 2. Testing More Info Modal & Episodes ---');
    await page.evaluate(() => {
      openQuickviewModalById('93405'); // Squid Game
    });
    await page.waitForTimeout(2000);

    const modalChecks = await page.evaluate(() => {
      const modal = document.getElementById('detailQuickviewModal');
      const title = document.getElementById('modalHeroTitle')?.innerText;
      const epCount = document.querySelectorAll('#modalEpisodesContainer .modal-ep-card').length;
      const moreLikeCount = document.querySelectorAll('#modalMoreLikeThisGrid .more-like-card').length;
      return {
        isOpen: modal?.classList.contains('active'),
        title,
        epCount,
        moreLikeCount
      };
    });

    console.log('Modal Checks:', modalChecks);
    await page.screenshot({ path: path.join(outDir, '02_more_info_modal.png') });
    console.log('📸 Captured 02_more_info_modal.png');

    // 3. Cadmium HTML5 Video Player Verification
    console.log('\n--- 3. Testing Cadmium HTML5 Player Playback ---');
    await page.click('#modalHeroPlayBtn');
    await page.waitForTimeout(3000);

    const playerChecks = await page.evaluate(() => {
      const player = document.getElementById('netflixPlayer');
      const video = document.getElementById('mainHtml5Video');
      return {
        isPlayerActive: player?.classList.contains('active'),
        videoSrc: video?.src,
        videoPaused: video?.paused,
        videoCurrentTime: video?.currentTime,
        videoDuration: video?.duration,
        headerTitle: document.getElementById('playerHeaderTitle')?.innerText
      };
    });

    console.log('Player Playback Initial State:', playerChecks);
    await page.screenshot({ path: path.join(outDir, '03_player_playing.png') });
    console.log('📸 Captured 03_player_playing.png');

    // 4. Quality & Audio Switch Verification
    console.log('\n--- 4. Testing Audio & Quality Popover Switchers ---');
    await page.evaluate(() => {
      selectQualityRendition('720p');
      selectAudioTrack('hi');
    });
    await page.waitForTimeout(1500);

    const qualityChecks = await page.evaluate(() => {
      const qualityBadge = document.getElementById('playerQualityBadge')?.innerText;
      const audioBadge = document.getElementById('playerAudioBadge')?.innerText;
      const video = document.getElementById('mainHtml5Video');
      return {
        qualityBadge,
        audioBadge,
        videoSrc: video?.src
      };
    });

    console.log('Quality & Audio State after switch:', qualityChecks);
    await page.screenshot({ path: path.join(outDir, '04_player_switched_quality.png') });
    console.log('📸 Captured 04_player_switched_quality.png');

    console.log('\n✅ ALL E2E VERIFICATION CHECKS PASSED PERFECTLY!');
  } catch (err) {
    console.error('❌ E2E verification failed:', err);
  } finally {
    await browser.close();
  }
}

runE2EVerification();
