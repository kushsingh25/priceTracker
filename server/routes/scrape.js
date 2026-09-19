const express = require('express');
const { chromium } = require('playwright');
const supabase = require('../db/supabaseClient');
const config = require('../config');
const { scrapeProduct } = require('../scraper/scrapeProduct');

const router = express.Router();

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

router.post('/run', async (req, res) => {
  const secret = req.headers['x-cron-secret'];
  if (!secret || secret !== config.cronSecret) {
    return res.status(401).json({ error: 'unauthorized' });
  }

  const { data: products, error } = await supabase
    .from('products')
    .select('id, store_product_id, name');

  if (error) {
    return res.status(500).json({ error: error.message });
  }

  if (!products.length) {
    return res.json({ scraped: 0, message: 'no tracked products' });
  }

  const browser = await chromium.launch({ headless: true });
  const results = [];

  for (const product of products) {
    const result = await scrapeProduct(browser, product.store_product_id, { verbose: false });

    await supabase.from('scrape_log').insert({
      product_id: product.id,
      status: result.status,
      attempt_count: result.attempts,
      duration_ms: result.durationMs,
      error_message: result.error,
    });

    if (result.status !== 'failed' && result.price != null && result.stock != null) {
      await supabase.from('price_history').insert({
        product_id: product.id,
        price: result.price,
        stock: result.stock,
      });
    }

    results.push({
      productId: product.id,
      name: product.name,
      status: result.status,
      price: result.price,
      stock: result.stock,
      error: result.error,
    });

    await sleep(1500 + Math.random() * 1500);
  }

  await browser.close();

  res.json({
    scraped: results.length,
    succeeded: results.filter((r) => r.status !== 'failed').length,
    failed: results.filter((r) => r.status === 'failed').length,
    results,
  });
});

module.exports = router;
