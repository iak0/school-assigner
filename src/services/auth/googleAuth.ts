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
        fetchProfile().then(resolve).catch(reject);
      } else if (response.error) {
        reject(new Error(response.error));
      }
    });

    tokenClient.requestAccessToken({ prompt: 'consent' });
  });
}

export async function signInSilent(): Promise<GoogleUserProfile | null> {
  if (!GOOGLE_CLIENT_ID) return null;

  await initializeTokenClient();

  return new Promise(resolve => {
    if (!tokenClient) {
      resolve(null);
      return;
    }

    setTokenCallback((response: google.accounts.oauth2.TokenResponse) => {
      if (response.access_token) {
        currentAccessToken = response.access_token;
        tokenExpiry = Date.now() + parseInt(response.expires_in || '3600', 10) * 1000;
        fetchProfile()
          .then(resolve)
          .catch(() => resolve(null));
      } else {
        resolve(null);
      }
    });

    tokenClient.requestAccessToken({ prompt: '' });
  });
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
  return profileCache;
}

export async function getAccessToken(): Promise<string | null> {
  if (currentAccessToken && Date.now() < tokenExpiry - 60000) {
    return currentAccessToken;
  }

  try {
    await initializeTokenClient();
    return new Promise(resolve => {
      if (!tokenClient) {
        resolve(null);
        return;
      }
      setTokenCallback((response: google.accounts.oauth2.TokenResponse) => {
        if (response.access_token) {
          currentAccessToken = response.access_token;
          tokenExpiry = Date.now() + parseInt(response.expires_in || '3600', 10) * 1000;
          resolve(currentAccessToken);
        } else {
          resolve(null);
        }
      });
      tokenClient.requestAccessToken({ prompt: '' });
    });
  } catch {
    return null;
  }
}

export function getCachedProfile(): GoogleUserProfile | null {
  return profileCache;
}

export function isSignedIn(): boolean {
  return !!currentAccessToken && Date.now() < tokenExpiry;
}

export function signOut(): void {
  currentAccessToken = null;
  tokenExpiry = 0;
  profileCache = null;
}

export function getClientId(): string {
  return GOOGLE_CLIENT_ID;
}
