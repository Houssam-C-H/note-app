import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import App from '../src/App';
import { describe, it, expect, vi } from 'vitest';
import { authApi } from '../src/api/auth';

// Mock the auth API
vi.mock('../src/api/auth', () => ({
  authApi: {
    refresh: vi.fn().mockRejectedValue(new Error('Not authenticated')),
    getCurrentUser: vi.fn(),
  },
  initCsrf: vi.fn().mockResolvedValue(undefined),
}));

describe('App', () => {
  it('renders the loading state initially and then redirects to login', async () => {
    render(
      <MemoryRouter>
        <App />
      </MemoryRouter>
    );
    
    // It should show loading initially
    expect(screen.getByText(/Loading.../i)).toBeInTheDocument();
    
    // Since refresh fails (unauthenticated), it should eventually render the Login page (Welcome Back)
    await waitFor(() => {
      expect(screen.getByText(/Welcome Back/i)).toBeInTheDocument();
    });
  });
});

