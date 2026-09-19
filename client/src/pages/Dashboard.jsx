import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { getTrackedProducts } from '../api/client';

export default function Dashboard() {
  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getTrackedProducts().then((data) => {
      setProducts(data);
      setLoading(false);
    });
  }, []);

  if (loading) return <p>Loading...</p>;

  if (!products.length) {
    return (
      <div>
        <h2>Tracked products</h2>
        <p>Nothing tracked yet. Go to Search to add a product.</p>
      </div>
    );
  }

  return (
    <div>
      <h2>Tracked products</h2>
      <ul style={{ listStyle: 'none', padding: 0 }}>
        {products.map((p) => (
          <li key={p.id} style={{ padding: 10, borderBottom: '1px solid #ddd' }}>
            <Link to={`/product/${p.id}`}>
              <strong>{p.name}</strong>
            </Link>
            <div style={{ fontSize: 13, color: '#666' }}>{p.brand} · {p.category} · {p.sku}</div>
          </li>
        ))}
      </ul>
    </div>
  );
}
