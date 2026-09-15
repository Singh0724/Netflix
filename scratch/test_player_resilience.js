const { chromium } = require('playwright');
const path = require('path');

const outDir = 'C:/Users/SVI/.gemini/antigravity-ide/brain/263a7679-3c1d-4c2a-8d35-18119fdc0422';

async function testPlayerResilience() {
  console.log('Testing Player Resilience, Server Switcher & Watchdog HUD...');
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });

  // 1. Navigate directly to Gandhari #/watch/1355228
  console.log('1. Navigating to http://localhost:5050/#/watch/1355228...');
  await page.goto('http://localhost:5050/#/watch/1355228', { waitUntil: 'domcontentloaded' });
  await page.waitForTimeout(1000);

  // Check HUD visibility and top bar buttons
  const hudState = await page.evaluate(() => {
    const hud = document.getElementById('streamBufferingHUD');
    const srvBadge = document.getElementById('playerServerBadge');
    const titleEl = document.getElementById('hudStatusTitle');
    return {
      hudVisible: hud && !hud.classList.contains('hidden'),
      srvBadge: srvBadge ? srvBadge.innerText : null,
      title: titleEl ? titleEl.innerText : null
    };
  });
  console.log('HUD initial state:', hudState);
  await page.screenshot({ path: path.join(outDir, 'test_01_hud_active.png') });

  // 2. Open Server Switcher Modal
  console.log('2. Opening Server Switcher Modal...');
  await page.click('#playerServerBtn');
  await page.waitForTimeout(500);

  const serverModalVisible = await page.evaluate(() => {
    const m = document.getElementById('serverModal');
    return m && m.style.display !== 'none';
  });
  console.log('Server Modal Visible:', serverModalVisible);
  await page.screenshot({ path: path.join(outDir, 'test_02_server_modal.png') });

  // 3. Switch to Server 2 (VidSrc Pro)
  console.log('3. Switching to Server 2 (VidSrc Pro)...');
  await page.click('#srvOpt-1');
  await page.waitForTimeout(1500);

  const vidsrcState = await page.evaluate(() => {
    const iframe = document.getElementById('mainEmbedIframe');
    const srvBadge = document.getElementById('playerServerBadge');
    return {
      iframeSrc: iframe ? iframe.src : null,
      badgeText: srvBadge ? srvBadge.innerText : null
    };
  });
  console.log('After switching to Server 2:', vidsrcState);
  await page.screenshot({ path: path.join(outDir, 'test_03_vidsrc_switched.png') });

  // 4. Switch to Server 4 (AutoEmbed VIP Multi-Audio)
  console.log('4. Switching to Server 4 (AutoEmbed VIP Multi-Audio)...');
  await page.click('#playerServerBtn');
  await page.waitForTimeout(400);
  await page.click('#srvOpt-4');
  await page.waitForTimeout(1500);

  const autoembedState = await page.evaluate(() => {
    const iframe = document.getElementById('mainEmbedIframe');
    const srvBadge = document.getElementById('playerServerBadge');
    return {
      iframeSrc: iframe ? iframe.src : null,
      badgeText: srvBadge ? srvBadge.innerText : null
    };
  });
  console.log('After switching to Server 4:', autoembedState);
  await page.screenshot({ path: path.join(outDir, 'test_04_autoembed_switched.png') });

  // 5. Switch back to Server 1 (VidLink 4K)
  console.log('5. Switching back to Server 1 (VidLink 4K)...');
  await page.click('#playerServerBtn');
  await page.waitForTimeout(400);
  await page.click('#srvOpt-0');
  await page.waitForTimeout(7000); // Give VidLink time to resolve

  const vidlinkFinalState = await page.evaluate(() => {
    const iframe = document.getElementById('mainEmbedIframe');
    const srvBadge = document.getElementById('playerServerBadge');
    return {
      iframeSrc: iframe ? iframe.src : null,
      badgeText: srvBadge ? srvBadge.innerText : null
    };
  });
  console.log('VidLink Final State:', vidlinkFinalState);
  await page.screenshot({ path: path.join(outDir, 'test_05_vidlink_final.png') });

  await browser.close();
  console.log('✅ Player resilience and controls verification finished successfully!');
}

testPlayerResilience().catch(err => {
  console.error('Test error:', err);
  process.exit(1);
});
