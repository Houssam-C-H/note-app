import { useState, useEffect, useRef } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { authApi } from '../api/auth';
import styles from '../styles/Auth.module.css';

export const VerifyEmail = () => {
  const [status, setStatus] = useState<'loading' | 'success' | 'error'>('loading');
  const [message, setMessage] = useState('Verifying your email...');
  const [searchParams] = useSearchParams();
  const effectRan = useRef(false);

  useEffect(() => {
    if (effectRan.current) return;
    effectRan.current = true;

    const token = searchParams.get('token');
    
    if (!token) {
      setStatus('error');
      setMessage('Invalid or missing verification token.');
      return;
    }

    const verify = async () => {
      try {
        await authApi.verifyEmail(token);
        setStatus('success');
        setMessage('Your email has been successfully verified! You can now login.');
      } catch (err: any) {
        setStatus('error');
        setMessage(err.message || 'An error occurred during verification');
      }
    };

    verify();
  }, [searchParams]);

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Email Verification</h1>
        
        {status === 'loading' && <p className={styles.subtitle}>{message}</p>}
        {status === 'error' && <div className={styles.error} style={{ marginTop: '1rem' }}>{message}</div>}
        {status === 'success' && <div style={{ color: '#10b981', margin: '1rem 0', textAlign: 'center' }}>{message}</div>}

        <div style={{ marginTop: '2rem', textAlign: 'center' }}>
          <Link to="/login" className={styles.button} style={{ textDecoration: 'none', display: 'inline-block' }}>
            Go to Login
          </Link>
        </div>
      </div>
    </div>
  );
};
