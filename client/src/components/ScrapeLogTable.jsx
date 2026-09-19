import React from 'react';

export default function ScrapeLogTable({ logs }) {
  if (!logs.length) return <p>No scrape attempts yet.</p>;

  return (
    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
      <thead>
        <tr>
          <th style={cellStyle}>Time</th>
          <th style={cellStyle}>Status</th>
          <th style={cellStyle}>Attempts</th>
          <th style={cellStyle}>Duration (ms)</th>
          <th style={cellStyle}>Error</th>
        </tr>
      </thead>
      <tbody>
        {logs.map((log) => (
          <tr key={log.id}>
            <td style={cellStyle}>{new Date(log.attempted_at).toLocaleString()}</td>
            <td style={{ ...cellStyle, color: log.status === 'failed' ? '#c53030' : '#2f855a' }}>{log.status}</td>
            <td style={cellStyle}>{log.attempt_count}</td>
            <td style={cellStyle}>{log.duration_ms}</td>
            <td style={cellStyle}>{log.error_message || '-'}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
}

const cellStyle = { border: '1px solid #ddd', padding: 6, textAlign: 'left' };
