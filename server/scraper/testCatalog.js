const { fetchAllProducts, searchProducts } = require('./fetchCatalog');

(async () => {
  const all = await fetchAllProducts();
  console.log('total products fetched:', all.length);
  console.log('sample:', all[0]);

  const results = await searchProducts('watch');
  console.log('search "watch" results:', results.length);
  console.log(results.slice(0, 3));
})();
