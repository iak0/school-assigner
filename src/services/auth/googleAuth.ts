/// <reference types="vite/client" />
/// <reference types="@types/google.accounts" />

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '';
const GIS_SCRIPT_URL = 'https://accounts.google.com/gsi/client';
const TOKEN_CLIENT_CONFIG = {
  scope: 'openid email profile https://www.googleapis.com/auth/drive.appdata',
};

interface GoogleUserProfile {
  name: string;
  email: string;
  picture: string;
  sub: string;
}

let tokenClient: google.accounts.oauth2.TokenClient | null = null;
let currentAccessToken: string | null = null;
let tokenExpiry: number = 0;
let profileCache: GoogleUserProfile | null = null;

const PROFILE_STORAGE_KEY = 'google_user_profile_v1';
const TOKEN_STORAGE_KEY = 'google_auth_token_v1';

interface StoredToken {
  access_token: string;
  expiry: number;
}

function saveProfileToStorage(profile: GoogleUserProfile): void {
  try {
    localStorage.setItem(PROFILE_STORAGE_KEY, JSON.stringify(profile));
  } catch {
    // Storage might be full or blocked
  }
}

function loadProfileFromStorage(): GoogleUserProfile | null {
  try {
    const raw = localStorage.getItem(PROFILE_STORAGE_KEY);
    if (raw) return JSON.parse(raw) as GoogleUserProfile;

    // Check legacy storage format (where profile was inside TOKEN_STORAGE_KEY)
    const legacyRaw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (legacyRaw) {
      const parsed = JSON.parse(legacyRaw);
      if (parsed.profile) {
        saveProfileToStorage(parsed.profile);
        return parsed.profile;
      }
    }
    return null;
  } catch {
    return null;
  }
}

function clearProfileFromStorage(): void {
  localStorage.removeItem(PROFILE_STORAGE_KEY);
}

function saveTokenToStorage(token: string, expiry: number): void {
  try {
    const stored: StoredToken = { access_token: token, expiry };
    localStorage.setItem(TOKEN_STORAGE_KEY, JSON.stringify(stored));
  } catch {
    // Storage might be full or blocked
  }
}

function loadTokenFromStorage(): StoredToken | null {
  try {
    const raw = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (!raw) return null;
    const stored = JSON.parse(raw) as StoredToken;
    if (Date.now() >= stored.expiry - 60000) return null;
    return stored;
  } catch {
    return null;
  }
}

function clearTokenFromStorage(): void {
  localStorage.removeItem(TOKEN_STORAGE_KEY);
}

/**
 * On app mount, restore the persistent user session.
 * Profile stays remembered permanently until user signs out.
 * Token is restored if still valid (< 1 hour).
 */
export function restoreSession(): GoogleUserProfile | null {
  const profile = loadProfileFromStorage();
  if (!profile) return null;

  profileCache = profile;

  const storedToken = loadTokenFromStorage();
  if (storedToken) {
    currentAccessToken = storedToken.access_token;
    tokenExpiry = storedToken.expiry;
  } else {
    currentAccessToken = null;
    tokenExpiry = 0;
  }

  return profileCache;
}

export function hasValidToken(): boolean {
  return Boolean(currentAccessToken && Date.now() < tokenExpiry - 60000);
}

function loadGISScript(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.google?.accounts?.oauth2) {
      resolve();
      return;
    }

    const existingScript = document.querySelector(`script[src="${GIS_SCRIPT_URL}"]`);
    if (existingScript) {
      existingScript.addEventListener('load', () => resolve());
      existingScript.addEventListener('error', () =>
        reject(new Error('Failed to load GIS script'))
      );
      return;
    }

    const script = document.createElement('script');
    script.src = GIS_SCRIPT_URL;
    script.async = true;
    script.defer = true;
    script.onload = () => resolve();
    script.onerror = () => reject(new Error('Failed to load GIS script'));
    document.head.appendChild(script);
  });
}

async function initializeTokenClient(): Promise<void> {
  await loadGISScript();

  if (!window.google?.accounts?.oauth2) {
    throw new Error('Google Identity Services not loaded');
  }

  if (!tokenClient) {
    tokenClient = window.google.accounts.oauth2.initTokenClient({
      client_id: GOOGLE_CLIENT_ID,
      scope: TOKEN_CLIENT_CONFIG.scope,
      callback: () => {
        // Default callback - will be overridden per-call
      },
    });
  }
}

function setTokenCallback(
  callback: (response: google.accounts.oauth2.TokenResponse) => void
): void {
  if (tokenClient) {
    // @ts-ignore - GIS allows setting callback on tokenClient
    tokenClient.callback = callback;
  }
}

export async function signIn(): Promise<GoogleUserProfile> {
  if (!GOOGLE_CLIENT_ID) {
    throw new Error('VITE_GOOGLE_CLIENT_ID not configured');
  }

  await initializeTokenClient();

  return new Promise((resolve, reject) => {
    if (!tokenClient) {
      reject(new Error('Token client not initialized'));
      return;
    }

    setTokenCallback((response: google.accounts.oauth2.TokenResponse) => {
      if (response.access_token) {
        currentAccessToken = response.access_token;
        tokenExpiry = Date.now() + parseInt(response.expires_in || '3600', 10) * 1000;
        saveTokenToStorage(currentAccessToken, tokenExpiry);
        fetchProfile().then(resolve).catch(reject);
      } else if (response.error) {
        reject(new Error(response.error));
      }
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

/**
 * Attempt silent background token refresh without showing a consent popup.
 * Uses login_hint when available so Google immediately selects the correct account.
 */
export async function attemptSilentRefresh(email?: string): Promise<string | null> {
  if (!GOOGLE_CLIENT_ID) return null;

  const targetEmail = email || profileCache?.email || loadProfileFromStorage()?.email;

  try {
    await initializeTokenClient();
    return new Promise(resolve => {
      if (!tokenClient) {
        resolve(null);
        return;
      }

      let settled = false;
      const timeout = setTimeout(() => {
        if (!settled) {
          settled = true;
          resolve(null);
        }
      }, 3500);

      setTokenCallback((response: google.accounts.oauth2.TokenResponse) => {
        if (settled) return;
        settled = true;
        clearTimeout(timeout);

        if (response.access_token) {
          currentAccessToken = response.access_token;
          tokenExpiry = Date.now() + parseInt(response.expires_in || '3600', 10) * 1000;
          saveTokenToStorage(currentAccessToken, tokenExpiry);
          resolve(currentAccessToken);
        } else {
          resolve(null);
        }
      });

      tokenClient.requestAccessToken({
        prompt: '',
        hint: targetEmail || undefined,
      });
    });
  } catch {
    return null;
  }
}

/**
 * Get a valid access token for API calls.
 * 1. Check in-memory cache first
 * 2. Check localStorage for persisted token
 * 3. Attempt silent refresh using known email hint
 * 4. Return null if all fail (requires user gesture)
 */
export async function getAccessToken(): Promise<string | null> {
  // 1. Check in-memory cache
  if (currentAccessToken && Date.now() < tokenExpiry - 60000) {
    return currentAccessToken;
  }

  // 2. Check localStorage for persisted token
  const stored = loadTokenFromStorage();
  if (stored) {
    currentAccessToken = stored.access_token;
    tokenExpiry = stored.expiry;
    return currentAccessToken;
  }

  // 3. Attempt silent refresh
  const refreshed = await attemptSilentRefresh();
  return refreshed;
}

async function fetchProfile(): Promise<GoogleUserProfile> {
  if (!currentAccessToken) throw new Error('No access token');

  const response = await fetch('https://www.googleapis.com/oauth2/v3/userinfo', {
    headers: { Authorization: `Bearer ${currentAccessToken}` },
  });

  if (!response.ok) {
    throw new Error('Failed to fetch user profile');
  }

  const profile = await response.json();
  profileCache = {
    name: profile.name,
    email: profile.email,
    picture: profile.picture,
    sub: profile.sub,
  };

  // Persist profile to localStorage permanently
  saveProfileToStorage(profileCache);

  return profileCache;
}

export function getCachedProfile(): GoogleUserProfile | null {
  return profileCache || loadProfileFromStorage();
}

/**
 * User is considered signed in if a user profile is remembered.
 */
export function isSignedIn(): boolean {
  return Boolean(profileCache || loadProfileFromStorage());
}

export function signOut(): void {
  if (currentAccessToken && window.google?.accounts?.oauth2) {
    try {
      window.google.accounts.oauth2.revoke(currentAccessToken, () => {});
    } catch {
      // Ignore revocation failure
    }
  }
  currentAccessToken = null;
  tokenExpiry = 0;
  profileCache = null;
  clearTokenFromStorage();
  clearProfileFromStorage();
}

export function getClientId(): string {
  return GOOGLE_CLIENT_ID;
}
