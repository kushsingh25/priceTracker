import React, { useEffect, useState } from 'react';
import { useParams } from 'react-router-dom';
import { getHistory, getLogs, getTrackedProducts } from '../api/client';
import PriceChart from '../components/PriceChart';
import ScrapeLogTable from '../components/ScrapeLogTable';

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState(null);
  const [history, setHistory] = useState([]);
  const [logs, setLogs] = useState([]);

  useEffect(() => {
    getTrackedProducts().then((all) => {
      setProduct(all.find((p) => String(p.id) === id));
    });
    getHistory(id).then(setHistory);
    getLogs(id).then(setLogs);
  }, [id]);

  if (!product) return <p>Loading...</p>;

  const latest = history[history.length - 1];

  return (
    <div>
      <h2>{product.name}</h2>
      <p style={{ color: '#666' }}>{product.brand} · {product.category} · {product.sku}</p>

      {latest && (
        <p>
          Latest: ₹{Number(latest.price).toLocaleString()} · {latest.stock} in stock ·{' '}
          {new Date(latest.scraped_at).toLocaleString()}
        </p>
      )}

      <h3>Price history</h3>
      <PriceChart history={history} />

      <h3>Scrape log</h3>
      <ScrapeLogTable logs={logs} />
    </div>
  );
}
