import React from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Search from './pages/Search';
import ProductDetail from './pages/ProductDetail';

export default function App() {
  return (
    <div style={{ maxWidth: 900, margin: '0 auto', padding: 20, fontFamily: 'sans-serif' }}>
      <nav style={{ marginBottom: 20 }}>
        <Link to="/" style={{ marginRight: 16 }}>Dashboard</Link>
        <Link to="/search">Search</Link>
      </nav>
      <Routes>
        <Route path="/" element={<Dashboard />} />
        <Route path="/search" element={<Search />} />
        <Route path="/product/:id" element={<ProductDetail />} />
      </Routes>
    </div>
  );
}
