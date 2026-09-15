const { chromium } = require('playwright');
const path = require('path');
const fs = require('fs');

const userDir = 'C:/Users/SVI/.gemini/antigravity-ide/brain/7ecf3a44-2abc-4c12-999f-3cb5f72a5a44/.user_uploaded';
const targetDir = 'C:/Project/netflix/public/assets/exact';

if (!fs.existsSync(targetDir)) {
  fs.mkdirSync(targetDir, { recursive: true });
}

async function extract() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const page = await browser.newPage();

  // Helper to load image and extract regions
  async function cropRegions(fileName, crops) {
    const fullPath = path.join(userDir, fileName).replace(/\\/g, '/');
    await page.goto('file:///' + fullPath);
    for (const crop of crops) {
      const base64 = await page.evaluate(({ x, y, w, h }) => {
        const img = document.querySelector('img');
        const canvas = document.createElement('canvas');
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, x, y, w, h, 0, 0, w, h);
        return canvas.toDataURL('image/jpeg', 0.95);
      }, crop);

      const data = base64.replace(/^data:image\/jpeg;base64,/, '');
      const outFile = path.join(targetDir, crop.name + '.jpg');
      fs.writeFileSync(outFile, Buffer.from(data, 'base64'));
      console.log(`Saved: ${outFile} (${crop.w}x${crop.h})`);
    }
  }

  // 1. Screenshot 1: Hero Billboard
  await cropRegions('media_1789386576375.png', [
    { name: 'turning_point_hero', x: 32, y: 138, w: 960, h: 395 }
  ]);

  // 2. Screenshot 2: Row 1 & Row 2
  await cropRegions('media_1789386583807.png', [
    { name: 'vishwanath_and_sons', x: 32, y: 218, w: 185, h: 105 },
    { name: 'gdn', x: 222, y: 218, w: 185, h: 105 },
    { name: 'early_spring', x: 412, y: 218, w: 185, h: 105 },
    { name: 'gandhari_popover', x: 558, y: 136, w: 280, h: 160 },
    { name: 'gandhari', x: 602, y: 218, w: 185, h: 105 }, // card under or popover
    { name: 'gentlemen', x: 836, y: 218, w: 185, h: 105 },
    { name: 'tudors', x: 32, y: 376, w: 185, h: 105 },
    { name: 'indias_got_latent', x: 222, y: 376, w: 185, h: 105 },
    { name: 'chumbak', x: 412, y: 376, w: 185, h: 105 },
    { name: 'strong_girl_nam_soon', x: 602, y: 376, w: 185, h: 105 },
    { name: 'wwe_raw', x: 794, y: 376, w: 185, h: 105 }
  ]);

  // 3. Screenshot 3: Row 3 & Row 4
  await cropRegions('media_1789386591405.png', [
    { name: 'top10_1_vishwanath', x: 122, y: 232, w: 93, h: 133 },
    { name: 'top10_2_dhamaal_4', x: 308, y: 232, w: 93, h: 133 },
    { name: 'top10_3_gdn', x: 494, y: 232, w: 93, h: 133 },
    { name: 'top10_4_gandhari', x: 680, y: 232, w: 93, h: 133 },
    { name: 'top10_5_korean_kanakaraju', x: 866, y: 232, w: 93, h: 133 },
    { name: 'crew_girl', x: 32, y: 420, w: 185, h: 105 },
    { name: 'fauda_popover', x: 172, y: 340, w: 280, h: 160 },
    { name: 'genie_make_a_wish', x: 450, y: 420, w: 145, h: 105 },
    { name: 'queen_of_tears', x: 602, y: 420, w: 185, h: 105 },
    { name: 'avatar_airbender', x: 794, y: 420, w: 185, h: 105 }
  ]);

  console.log('Successfully cropped all exact screenshot assets!');
  await browser.close();
}

extract().catch(console.error);
