const express = require('express');
const supabase = require('../db/supabaseClient');
const { searchProducts, fetchAllProducts } = require('../scraper/fetchCatalog');

const router = express.Router();

router.get('/search', async (req, res) => {
  const q = req.query.q || '';
  if (!q.trim()) {
    return res.json([]);
  }
  const results = await searchProducts(q);
  res.json(results.slice(0, 20));
});

router.get('/', async (req, res) => {
  const { data, error } = await supabase.from('products').select('*').order('added_at', { ascending: false });
  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.post('/', async (req, res) => {
  const { storeProductId } = req.body;
  if (!storeProductId) {
    return res.status(400).json({ error: 'storeProductId is required' });
  }

  const { data: existing } = await supabase
    .from('products')
    .select('id')
    .eq('store_product_id', storeProductId)
    .maybeSingle();

  if (existing) {
    return res.json(existing);
  }

  const catalog = await fetchAllProducts();
  const match = catalog.find((p) => p.id === Number(storeProductId));
  if (!match) {
    return res.status(404).json({ error: 'product not found in catalog' });
  }

  const { data, error } = await supabase
    .from('products')
    .insert({
      store_product_id: match.id,
      name: match.name,
      slug: match.slug,
      brand: match.brand,
      category: match.category,
      sku: match.sku,
    })
    .select()
    .single();

  if (error) return res.status(500).json({ error: error.message });
  res.status(201).json(data);
});

router.get('/:id/history', async (req, res) => {
  const { data, error } = await supabase
    .from('price_history')
    .select('*')
    .eq('product_id', req.params.id)
    .order('scraped_at', { ascending: true });

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

router.get('/:id/logs', async (req, res) => {
  const { data, error } = await supabase
    .from('scrape_log')
    .select('*')
    .eq('product_id', req.params.id)
    .order('attempted_at', { ascending: false })
    .limit(100);

  if (error) return res.status(500).json({ error: error.message });
  res.json(data);
});

module.exports = router;
