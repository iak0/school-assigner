import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  attemptSilentRefresh,
  getCachedProfile,
  hasValidToken,
  isSignedIn,
  restoreSession,
  signOut,
} from './googleAuth';

describe('Google Auth Session Persistence', () => {
  beforeEach(() => {
    localStorage.clear();
    signOut();
    vi.restoreAllMocks();
  });

  it('returns null and isSignedIn=false when storage is empty', () => {
    const profile = restoreSession();
    expect(profile).toBeNull();
    expect(isSignedIn()).toBe(false);
    expect(hasValidToken()).toBe(false);
    expect(getCachedProfile()).toBeNull();
  });

  it('restores user profile and valid token from storage', () => {
    const mockProfile = {
      name: 'Ms. Teacher',
      email: 'teacher@school.org',
      picture: 'https://example.com/avatar.jpg',
      sub: 'google-12345',
    };
    const validExpiry = Date.now() + 3600 * 1000; // 1 hour in future

    localStorage.setItem('google_user_profile_v1', JSON.stringify(mockProfile));
    localStorage.setItem(
      'google_auth_token_v1',
      JSON.stringify({ access_token: 'mock-token-abc', expiry: validExpiry })
    );

    const restored = restoreSession();
    expect(restored).toEqual(mockProfile);
    expect(isSignedIn()).toBe(true);
    expect(hasValidToken()).toBe(true);
    expect(getCachedProfile()).toEqual(mockProfile);
  });

  it('keeps user profile remembered across refresh even when 1-hour token has expired', () => {
    const mockProfile = {
      name: 'Mr. Davis',
      email: 'davis@school.org',
      picture: 'https://example.com/davis.jpg',
      sub: 'google-67890',
    };
    const expiredTime = Date.now() - 5000; // Expired 5 seconds ago

    localStorage.setItem('google_user_profile_v1', JSON.stringify(mockProfile));
    localStorage.setItem(
      'google_auth_token_v1',
      JSON.stringify({ access_token: 'expired-token', expiry: expiredTime })
    );

    const restored = restoreSession();
    // User profile is preserved!
    expect(restored).toEqual(mockProfile);
    expect(isSignedIn()).toBe(true);
    // Token is recognized as expired so app knows to refresh
    expect(hasValidToken()).toBe(false);
  });

  it('migrates legacy token storage format containing profile field', () => {
    const legacyProfile = {
      name: 'Legacy Teacher',
      email: 'legacy@school.org',
      picture: 'https://example.com/legacy.jpg',
      sub: 'google-legacy-1',
    };

    localStorage.setItem(
      'google_auth_token_v1',
      JSON.stringify({
        access_token: 'legacy-token',
        expiry: Date.now() + 1800 * 1000,
        profile: legacyProfile,
      })
    );

    const restored = restoreSession();
    expect(restored).toEqual(legacyProfile);
    expect(isSignedIn()).toBe(true);
    // Should have written to modern PROFILE_STORAGE_KEY
    expect(localStorage.getItem('google_user_profile_v1')).toBeTruthy();
  });

  it('completely wipes profile and tokens on signOut', () => {
    const mockProfile = {
      name: 'Temp Teacher',
      email: 'temp@school.org',
      picture: 'https://example.com/temp.jpg',
      sub: 'google-temp',
    };

    localStorage.setItem('google_user_profile_v1', JSON.stringify(mockProfile));
    localStorage.setItem(
      'google_auth_token_v1',
      JSON.stringify({ access_token: 'temp-token', expiry: Date.now() + 3600000 })
    );

    restoreSession();
    expect(isSignedIn()).toBe(true);

    signOut();

    expect(isSignedIn()).toBe(false);
    expect(hasValidToken()).toBe(false);
    expect(getCachedProfile()).toBeNull();
    expect(localStorage.getItem('google_user_profile_v1')).toBeNull();
    expect(localStorage.getItem('google_auth_token_v1')).toBeNull();
  });

  it('attemptSilentRefresh stores token on successful response and passes email hint', async () => {
    const mockProfile = {
      name: 'Silent Teacher',
      email: 'silent@school.org',
      picture: 'https://example.com/silent.jpg',
      sub: 'google-silent',
    };
    localStorage.setItem('google_user_profile_v1', JSON.stringify(mockProfile));
    restoreSession();

    let capturedConfig: any = null;
    let registeredCallback: any = null;

    const mockTokenClient = {
      requestAccessToken: vi.fn((config: any) => {
        capturedConfig = config;
        setTimeout(() => {
          if (registeredCallback) {
            registeredCallback({
              access_token: 'refreshed-token-xyz',
              expires_in: '3600',
            });
          }
        }, 10);
      }),
      set callback(cb: any) {
        registeredCallback = cb;
      },
      get callback() {
        return registeredCallback;
      },
    };

    (window as any).google = {
      accounts: {
        oauth2: {
          initTokenClient: vi.fn(() => mockTokenClient),
        },
      },
    };

    const token = await attemptSilentRefresh('silent@school.org');

    expect(token).toBe('refreshed-token-xyz');
    expect(capturedConfig).toEqual({ prompt: '', hint: 'silent@school.org' });
    expect(hasValidToken()).toBe(true);

    // Verify token was saved to storage
    const stored = JSON.parse(localStorage.getItem('google_auth_token_v1') || '{}');
    expect(stored.access_token).toBe('refreshed-token-xyz');
  });
});
