import { useState } from 'react';
import { Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import styles from '../styles/Auth.module.css';

export const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [message, setMessage] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setStatus('loading');
    setMessage('');

    try {
      const data = await authApi.requestPasswordReset(email);
      setStatus('success');
      setMessage(data.message || 'Reset link sent. Please check your email.');
    } catch (err: any) {
      setStatus('error');
      setMessage(err.message || 'An error occurred');
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Forgot Password</h1>
        <p className={styles.subtitle}>Enter your email to receive a reset link</p>

        {status === 'error' && <div className={styles.error}>{message}</div>}
        {status === 'success' && <div style={{ color: '#10b981', marginBottom: '1rem', textAlign: 'center' }}>{message}</div>}

        <form className={styles.form} onSubmit={handleSubmit}>
          <div className={styles.inputGroup}>
            <label className={styles.label} htmlFor="email">Email Address</label>
            <input
              id="email"
              type="email"
              className={styles.input}
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="you@example.com"
            />
          </div>

          <button type="submit" className={styles.button} disabled={status === 'loading'}>
            {status === 'loading' ? 'Sending...' : 'Send Reset Link'}
          </button>
        </form>

        <p className={styles.linkText}>
          Remember your password? <Link to="/login" className={styles.link}>Sign in</Link>
        </p>
      </div>
    </div>
  );
};
