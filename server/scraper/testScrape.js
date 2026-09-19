const { chromium } = require('playwright');
const { scrapeProduct } = require('./scrapeProduct');

const productId = process.argv[2] || '822';

(async () => {
  const browser = await chromium.launch({ headless: false, slowMo: 150 });
  const result = await scrapeProduct(browser, productId);
  console.log(result);
  await browser.close();
})();
