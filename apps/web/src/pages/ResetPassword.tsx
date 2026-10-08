import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import styles from '../styles/Auth.module.css';

export const ResetPassword = () => {
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();

  const token = searchParams.get('token');

  useEffect(() => {
    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing reset token.');
    }
  }, [token]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!token) return;
    
    setStatus('loading');
    setMessage('');

    try {
      await authApi.resetPassword(token, password);
      setStatus('success');
      setMessage('Password has been reset successfully. You can now login.');
      setTimeout(() => navigate('/login'), 3000);
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'An error occurred while resetting password');
    }
  };

  if (!token) {
    return (
      <div className={styles.container}>
        <div className={styles.card}>
          <h1 className={styles.title}>Invalid Link</h1>
          <p className={styles.error}>{message}</p>
          <Link to="/forgot-password" className={styles.button} style={{ display: 'block', textAlign: 'center', textDecoration: 'none' }}>Request New Link</Link>
        </div>
      </div>
    );
  }

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Reset Password</h1>
        <p className={styles.subtitle}>Enter your new password below</p>

        {status === 'error' && <div className={styles.error}>{message}</div>}
        {status === 'success' && <div style={{ color: '#10b981', marginBottom: '1rem', textAlign: 'center' }}>{message}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="password">New Password</label>
            <input
              id="password"
              type="password"
              className={styles.input}
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={8}
              placeholder="••••••••"
            />
          </div>

          <button type="submit" className={styles.button} disabled={status === 'loading' || status === 'success'}>
            {status === 'loading' ? 'Resetting...' : 'Reset Password'}
          </button>
        </form>
      </div>
    </div>
  );
};
