import { useState } from 'react';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000/api';

export default function Admin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');

    try {
      const response = await fetch(`${API_URL}/admin/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok) throw new Error(result.error || `Login failed (${response.status})`);
      if (result.token) localStorage.setItem('admin_token', result.token);
      window.location.reload();
    } catch (err) {
      setError(err.message || 'Unable to login');
    }
  }

  return (
    <main>
      <form onSubmit={handleSubmit}>
        <h1>Admin login</h1>
        <input type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Admin password" />
        <button type="submit">Login</button>
        {error && <p>{error}</p>}
      </form>
    </main>
  );
}
