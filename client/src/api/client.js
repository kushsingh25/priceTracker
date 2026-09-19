import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const api = axios.create({ baseURL: BASE_URL });

export async function searchCatalog(query) {
  const res = await api.get('/api/products/search', { params: { q: query } });
  return res.data;
}

export async function getTrackedProducts() {
  const res = await api.get('/api/products');
  return res.data;
}

export async function trackProduct(storeProductId) {
  const res = await api.post('/api/products', { storeProductId });
  return res.data;
}

export async function getHistory(productId) {
  const res = await api.get(`/api/products/${productId}/history`);
  return res.data;
}

export async function getLogs(productId) {
  const res = await api.get(`/api/products/${productId}/logs`);
  return res.data;
}
