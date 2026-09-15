const { chromium } = require('playwright');
const path = require('path');

const ARTIFACT_DIR = 'C:/Users/SVI/.gemini/antigravity-ide/brain/7ecf3a44-2abc-4c12-999f-3cb5f72a5a44';

async function run() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  console.log('Navigating to http://localhost:5050...');
  await page.goto('http://localhost:5050');
  await page.waitForTimeout(2000);

  // 1. Launch player directly for Vishwanath & Sons (TMDB ID 1408162)
  console.log('Launching player for Vishwanath & Sons...');
  await page.evaluate(() => launchNetflixPlayerById('1408162'));
  await page.waitForTimeout(4000);

  // Capture player playing Vishwanath & Sons on Server 1 (AutoEmbed VIP 1080p Multi-Audio / Hindi)
  console.log('Capturing player playing Vishwanath & Sons...');
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_vishwanath_hindi_player.png') });

  // 2. Click Audio button to show Audio & Subtitles popover
  console.log('Opening Audio & Subtitles modal...');
  await page.click('#playerAudioBtn');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_audio_subtitles_modal.png') });

  // 3. Click Quality button to show Stream Quality modal
  console.log('Opening Stream Quality modal...');
  await page.click('#playerQualityBtn');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_stream_quality_modal.png') });

  // 4. Test selecting English and verifying all-content preference persistence
  console.log('Testing Audio selection...');
  await page.click('#playerAudioBtn');
  await page.waitForTimeout(500);
  await page.click('#audioOpt-en');
  await page.waitForTimeout(1000);
  await page.screenshot({ path: path.join(ARTIFACT_DIR, 'verify_audio_switched_en.png') });

  // 5. Switch back to Hindi
  console.log('Switching back to Hindi (Default for user)...');
  await page.click('#playerAudioBtn');
  await page.waitForTimeout(500);
  await page.click('#audioOpt-hi');
  await page.waitForTimeout(1000);

  console.log('✅ All audio and 1080p quality verification captures complete!');
  await browser.close();
}

run().catch(err => {
  console.error('Error running test:', err);
  process.exit(1);
});
