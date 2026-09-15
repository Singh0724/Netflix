const { chromium } = require('playwright');

async function testStreamsForTitles() {
  const browser = await chromium.launch({ channel: 'msedge', headless: true });
  const ids = [
    { name: 'Gandhari', id: '1355228' },
    { name: 'GDN', id: '1489543' }
  ];

  const providers = [
    { name: 'vidlink', url: (id) => `https://vidlink.pro/movie/${id}` },
    { name: 'vidsrc_pm', url: (id) => `https://vidsrc.pm/embed/movie/${id}` },
    { name: 'vidsrc_to', url: (id) => `https://vidsrc.to/embed/movie/${id}` },
    { name: 'vidsrc_cc', url: (id) => `https://vidsrc.cc/v2/embed/movie/${id}` },
    { name: 'vidsrc_xyz', url: (id) => `https://vidsrc.xyz/embed/movie/${id}` },
    { name: 'twoembed', url: (id) => `https://2embed.skin/embed/${id}` },
    { name: 'multiembed', url: (id) => `https://multiembed.mov/directstream.php?video_id=${id}&tmdb=1` },
    { name: 'autoembed', url: (id) => `https://autoembed.co/movie/tmdb/${id}` },
    { name: 'smashystream', url: (id) => `https://embed.smashystream.com/playere.php?tmdb=${id}` }
  ];

  for (const title of ids) {
    console.log(`\n=== Testing for ${title.name} (TMDb: ${title.id}) ===`);
    for (const p of providers) {
      const page = await browser.newPage();
      const target = p.url(title.id);
      try {
        const resp = await page.goto(target, { waitUntil: 'domcontentloaded', timeout: 8000 });
        await page.waitForTimeout(2000);
        const text = await page.evaluate(() => document.body ? document.body.innerText.slice(0, 200) : '');
        const titleText = await page.title();
        console.log(`[${p.name}] status: ${resp ? resp.status() : 'null'} | title: "${titleText}" | text: "${text.replace(/\n/g, ' ')}"`);
      } catch (err) {
        console.log(`[${p.name}] FAILED / TIMEOUT: ${err.message.slice(0, 60)}`);
      } finally {
        await page.close();
      }
    }
  }

  await browser.close();
}

testStreamsForTitles();
