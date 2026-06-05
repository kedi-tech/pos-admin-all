'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { login } from '@/lib/api';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    try {
      const data = await login(email.trim(), password);
      if (data?.user?.mustChangePassword) {
        router.replace('/change-password');
      } else {
        router.replace('/dashboard');
      }
    } catch (err) {
      setError(err.message || 'Login failed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{
      minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
      background: 'var(--bg)', padding: 24,
    }}>
      <div style={{ width: '100%', maxWidth: 380 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 40 }}>
          <div className="brand-mark" style={{ width: 40, height: 40, borderRadius: 10, background: 'var(--accent)', color: 'var(--accent-ink)', display: 'grid', placeItems: 'center', fontWeight: 800, fontSize: 18 }}>K</div>
          <div>
            <div style={{ fontWeight: 700, fontSize: 16, letterSpacing: -0.2 }}>Kedi-POS</div>
            <div style={{ fontSize: 12, color: 'var(--text-muted)' }}>Management portal</div>
          </div>
        </div>

        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, marginBottom: 6 }}>Sign in</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 }}>Use your store admin credentials.</p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="input-group">
            <label className="label">Email</label>
            <input
              className="input" type="email" value={email} autoFocus
              onChange={e => setEmail(e.target.value)}
              placeholder="admin@ags-pos.com"
            />
          </div>
          <div className="input-group">
            <label className="label">Password</label>
            <input
              className="input" type="password" value={password}
              onChange={e => setPassword(e.target.value)}
              placeholder="••••••••"
            />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: 'var(--danger-subtle, rgba(239,68,68,0.1))', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>
              {error}
            </div>
          )}

          <button
            className="btn primary" type="submit"
            disabled={loading || !email || !password}
            style={{ height: 48, fontSize: 15, marginTop: 4 }}
          >
            {loading ? 'Signing in…' : 'Sign in'}
          </button>
        </form>

        <p style={{ marginTop: 24, fontSize: 12, color: 'var(--text-subtle)', textAlign: 'center' }}>
          Default: admin@ags-pos.com / Admin@1234
        </p>
      </div>
    </div>
  );
}
