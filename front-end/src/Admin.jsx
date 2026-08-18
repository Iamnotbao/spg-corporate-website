import { useState } from 'react';
import './admin.css';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:10000/api';

export default function Admin() {
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setLoading(true);

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
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="admin-page">
      <section className="admin-login-card" aria-label="Admin login">
        <div className="admin-brand-mark">SPG</div>
        <p className="admin-eyebrow">Corporate portal</p>
        <h1>Admin login</h1>
        <p className="admin-subtitle">Sign in to manage your website content.</p>
        <form className="admin-login-form" onSubmit={handleSubmit}>
          <label htmlFor="admin-password">Password</label>
          <input id="admin-password" type="password" value={password} onChange={(event) => setPassword(event.target.value)} placeholder="Enter admin password" autoComplete="current-password" required />
          <button type="submit" disabled={loading}>{loading ? 'Signing in...' : 'Sign in'}</button>
          {error && <p className="admin-error" role="alert">{error}</p>}
        </form>
      </section>
    </div>
  );
}
