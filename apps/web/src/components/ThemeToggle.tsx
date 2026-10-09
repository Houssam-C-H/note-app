import React from 'react';
import { Moon, Sun, Monitor } from 'lucide-react';
import { useThemeStore } from '../store/themeStore';
import styles from './ThemeToggle.module.css';

export const ThemeToggle: React.FC = () => {
  const { theme, setTheme } = useThemeStore();

  return (
    <div className={styles.toggleGroup}>
      <button 
        className={`${styles.toggleBtn} ${theme === 'light' ? styles.active : ''}`} 
        onClick={() => setTheme('light')}
        title="Light Mode"
      >
        <Sun size={16} />
      </button>
      <button 
        className={`${styles.toggleBtn} ${theme === 'dark' ? styles.active : ''}`} 
        onClick={() => setTheme('dark')}
        title="Dark Mode"
      >
        <Moon size={16} />
      </button>
      <button 
        className={`${styles.toggleBtn} ${theme === 'system' ? styles.active : ''}`} 
        onClick={() => setTheme('system')}
        title="System Preference"
      >
        <Monitor size={16} />
      </button>
    </div>
  );
};
