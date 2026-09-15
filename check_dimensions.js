const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

async function testScreenshots() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();
  
  const files = [
    'media_1789386576375.png',
    'media_1789386583807.png',
    'media_1789386591405.png'
  ];
  const userDir = 'C:/Users/SVI/.gemini/antigravity-ide/brain/7ecf3a44-2abc-4c12-999f-3cb5f72a5a44/.user_uploaded';

  for (const f of files) {
    const fullPath = path.join(userDir, f).replace(/\\/g, '/');
    await page.goto('file:///' + fullPath);
    const dimensions = await page.evaluate(() => {
      const img = document.querySelector('img');
      return { width: img.naturalWidth, height: img.naturalHeight };
    });
    console.log(`${f}: ${dimensions.width} x ${dimensions.height}`);
  }
  await browser.close();
}

testScreenshots().catch(console.error);
