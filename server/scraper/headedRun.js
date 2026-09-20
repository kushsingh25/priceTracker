const { chromium } = require('playwright');
const { scrapeProduct } = require('./scrapeProduct');

const productIds = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['822', '85', '37', '723', '856'];

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 200 });

  for (const id of productIds) {
    console.log(`\n=== scraping product ${id} ===`);
    const result = await scrapeProduct(browser, id, { verbose: true });
    console.log(`=== result for ${id} ===`, result);
    await new Promise((resolve) => setTimeout(resolve, 2000));
  }

  await browser.close();
})();
