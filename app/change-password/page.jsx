'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { getToken, changePassword } from '@/lib/api';

export default function ChangePasswordPage() {
  const router = useRouter();
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!getToken()) router.replace('/login');
  }, [router]);

  const submit = async (e) => {
    e.preventDefault();
    if (newPassword.length < 8) {
      setError('Password must be at least 8 characters.');
      return;
    }
    if (newPassword !== confirmPassword) {
      setError('Passwords do not match.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await changePassword(newPassword);
      router.replace('/dashboard');
    } catch (err) {
      setError(err.message || 'Failed to update password.');
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

        <h1 style={{ fontSize: 26, fontWeight: 700, letterSpacing: -0.5, marginBottom: 6 }}>Set your password</h1>
        <p style={{ color: 'var(--text-muted)', fontSize: 14, marginBottom: 28 }}>
          You must change your temporary password before continuing.
        </p>

        <form onSubmit={submit} style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
          <div className="input-group">
            <label className="label">New password</label>
            <input
              className="input" type="password" value={newPassword} autoFocus
              onChange={e => setNewPassword(e.target.value)}
              placeholder="At least 8 characters"
              minLength={8}
            />
          </div>
          <div className="input-group">
            <label className="label">Confirm password</label>
            <input
              className="input" type="password" value={confirmPassword}
              onChange={e => setConfirmPassword(e.target.value)}
              placeholder="Repeat your new password"
              minLength={8}
            />
          </div>

          {error && (
            <div style={{ padding: '10px 14px', background: 'var(--danger-subtle, rgba(239,68,68,0.1))', borderRadius: 8, color: 'var(--danger)', fontSize: 13 }}>
              {error}
            </div>
          )}

          <button
            className="btn primary" type="submit"
            disabled={loading || !newPassword || !confirmPassword}
            style={{ height: 48, fontSize: 15, marginTop: 4 }}
          >
            {loading ? 'Saving…' : 'Set new password'}
          </button>
        </form>
      </div>
    </div>
  );
}
