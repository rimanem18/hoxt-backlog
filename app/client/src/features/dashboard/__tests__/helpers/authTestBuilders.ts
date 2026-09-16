import type { User } from '@hoxt-backlog/shared-schemas/auth';
import type { AuthState } from '@/features/auth/store/authSlice';

export function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: '11111111-1111-1111-1111-111111111111',
    externalId: 'external-id',
    provider: 'google',
    email: 'test@example.com',
    name: 'テストユーザー',
    avatarUrl: null,
    createdAt: '2026-01-01T00:00:00.000Z',
    updatedAt: '2026-01-01T00:00:00.000Z',
    lastLoginAt: null,
    ...overrides,
  };
}

export function buildAuthState(overrides: Partial<AuthState> = {}): AuthState {
  return {
    isAuthenticated: false,
    user: null,
    isLoading: false,
    isAuthRestoring: false,
    error: null,
    authError: null,
    ...overrides,
  };
}
