import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, beforeEach } from 'vitest';
import { ThemeToggle } from './ThemeToggle';
import { useThemeStore } from '../store/themeStore';

describe('ThemeToggle', () => {
  beforeEach(() => {
    // Reset state before each test
    useThemeStore.setState({ theme: 'system' });
  });

  it('renders all three toggle buttons', () => {
    render(<ThemeToggle />);
    expect(screen.getByTitle('Light Mode')).toBeInTheDocument();
    expect(screen.getByTitle('Dark Mode')).toBeInTheDocument();
    expect(screen.getByTitle('System Preference')).toBeInTheDocument();
  });

  it('changes theme to light mode when light button is clicked', () => {
    render(<ThemeToggle />);
    const lightBtn = screen.getByTitle('Light Mode');
    fireEvent.click(lightBtn);
    expect(useThemeStore.getState().theme).toBe('light');
  });

  it('changes theme to dark mode when dark button is clicked', () => {
    render(<ThemeToggle />);
    const darkBtn = screen.getByTitle('Dark Mode');
    fireEvent.click(darkBtn);
    expect(useThemeStore.getState().theme).toBe('dark');
  });
});
