const express = require('express');
const cors = require('cors');
const config = require('./config');
const scrapeRoutes = require('./routes/scrape');
const productRoutes = require('./routes/products');

const app = express();
app.use(cors());
app.use(express.json());

app.use('/api/scrape', scrapeRoutes);
app.use('/api/products', productRoutes);

app.get('/health', (req, res) => res.json({ ok: true }));

app.listen(config.port, '0.0.0.0', () => {
  console.log(`server listening on ${config.port}`);
});