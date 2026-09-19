import React from 'react';
import { LineChart, Line, XAxis, YAxis, Tooltip, CartesianGrid, ResponsiveContainer } from 'recharts';

export default function PriceChart({ history }) {
  if (!history.length) return <p>No price history yet.</p>;

  const data = history.map((h) => ({
    time: new Date(h.scraped_at).toLocaleString(),
    price: Number(h.price),
    stock: h.stock,
  }));

  return (
    <ResponsiveContainer width="100%" height={300}>
      <LineChart data={data}>
        <CartesianGrid strokeDasharray="3 3" />
        <XAxis dataKey="time" tick={{ fontSize: 10 }} />
        <YAxis />
        <Tooltip />
        <Line type="monotone" dataKey="price" stroke="#2f855a" dot={false} />
      </LineChart>
    </ResponsiveContainer>
  );
}
