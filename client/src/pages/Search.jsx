import React, { useState } from 'react';
import { searchCatalog, trackProduct } from '../api/client';

export default function Search() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [trackedIds, setTrackedIds] = useState([]);

  async function runSearch(e) {
    e.preventDefault();
    if (!query.trim()) return;
    setLoading(true);
    const data = await searchCatalog(query);
    setResults(data);
    setLoading(false);
  }

  async function handleTrack(id) {
    await trackProduct(id);
    setTrackedIds((prev) => [...prev, id]);
  }

  return (
    <div>
      <h2>Search products</h2>
      <form onSubmit={runSearch}>
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="e.g. watch, headphones"
          style={{ padding: 8, width: 300, marginRight: 8 }}
        />
        <button type="submit">Search</button>
      </form>

      {loading && <p>Searching...</p>}

      <ul style={{ listStyle: 'none', padding: 0, marginTop: 20 }}>
        {results.map((p) => (
          <li key={p.id} style={{ padding: 10, borderBottom: '1px solid #ddd', display: 'flex', justifyContent: 'space-between' }}>
            <div>
              <strong>{p.name}</strong>
              <div style={{ fontSize: 13, color: '#666' }}>{p.brand} · {p.category} · {p.sku}</div>
            </div>
            <button onClick={() => handleTrack(p.id)} disabled={trackedIds.includes(p.id)}>
              {trackedIds.includes(p.id) ? 'Tracked' : 'Track'}
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
