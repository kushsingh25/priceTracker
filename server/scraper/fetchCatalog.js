const axios = require('axios');

const BASE = 'https://demo.inelabteamdev.com/api/catalog';

let cache = null;
let cachedAt = 0;
const TTL = 10 * 60 * 1000;

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchPage(page, pageSize, attempts = 4) {
  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      const res = await axios.get(BASE, { params: { page, pageSize }, timeout: 15000 });
      return res.data;
    } catch (err) {
      if (attempt === attempts) throw err;
      await sleep(500 * attempt);
    }
  }
}

async function fetchAllProducts() {
  if (cache && Date.now() - cachedAt < TTL) return cache;

  const first = await fetchPage(1, 20);
  const pages = first.pages;
  let items = [...first.items];

  for (let page = 2; page <= pages; page++) {
    const data = await fetchPage(page, 20);
    items = items.concat(data.items);
  }

  const seen = new Set();
  const deduped = [];
  for (const item of items) {
    if (!seen.has(item.id)) {
      seen.add(item.id);
      deduped.push(item);
    }
  }

  cache = deduped;
  cachedAt = Date.now();
  return deduped;
}

async function searchProducts(query) {
  const all = await fetchAllProducts();
  const q = query.toLowerCase();
  return all.filter(p => p.name.toLowerCase().includes(q));
}

module.exports = { fetchAllProducts, searchProducts };