import React from 'react';
import { Clock, RefreshCw, LogOut, Shield, Cloud, CloudOff, Loader2 } from 'lucide-react';
import { signIn, signOut, getCachedProfile, isSignedIn } from '../services/auth/googleAuth';
import { fetchCloudWorkspace, saveCloudWorkspace } from '../services/sync/googleDriveSync';
import { getWorkspace, saveWorkspace } from '../services/storage/indexedDb';

interface AccountModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSyncStatusChange?: (status: SyncStatus) => void;
  onProfileChange?: (profile: { name: string; email: string; picture: string } | null) => void;
}

type SyncStatus = 'synced' | 'syncing' | 'local' | 'offline' | 'error';

const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  synced: 'Synced with Google Drive',
  syncing: 'Syncing...',
  local: 'Saved to this device',
  offline: 'Offline (Saved locally)',
  error: 'Sync failed',
};

const SYNC_STATUS_ICONS: Record<SyncStatus, React.ReactNode> = {
  synced: <Cloud className="w-4 h-4 text-emerald-600" />,
  syncing: <Loader2 className="w-4 h-4 text-blue-600 animate-spin" />,
  local: <Cloud className="w-4 h-4 text-slate-500" />,
  offline: <CloudOff className="w-4 h-4 text-amber-600" />,
  error: <CloudOff className="w-4 h-4 text-rose-600" />,
};

const SYNC_STATUS_COLORS: Record<SyncStatus, string> = {
  synced: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  syncing: 'bg-blue-50 text-blue-700 border-blue-200',
  local: 'bg-slate-50 text-slate-700 border-slate-200',
  offline: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-rose-50 text-rose-700 border-rose-200',
};

export const AccountModal: React.FC<AccountModalProps> = ({
  isOpen,
  onClose,
  onSyncStatusChange,
  onProfileChange,
}) => {
  const [profile, setProfile] = React.useState<{
    name: string;
    email: string;
    picture: string;
  } | null>(null);
  const [isLoading, setIsLoading] = React.useState(false);
  const [syncStatus, setSyncStatus] = React.useState<SyncStatus>('local');
  const [lastSyncedAt, setLastSyncedAt] = React.useState<Date | null>(null);
  const [error, setError] = React.useState<string | null>(null);

  const updateSyncStatus = (status: SyncStatus) => {
    setSyncStatus(status);
    onSyncStatusChange?.(status);
  };

  const syncNow = async () => {
    if (!isSignedIn()) return;

    updateSyncStatus('syncing');
    setError(null);

    try {
      const localEnvelope = await getWorkspace();
      if (!localEnvelope) {
        updateSyncStatus('local');
        return;
      }

      const cloudResult = await fetchCloudWorkspace();

      if (cloudResult.success && cloudResult.data) {
        const cloudRevision = cloudResult.data.revision || 0;
        const localRevision = localEnvelope.revision || 0;

        if (cloudRevision > localRevision) {
          await saveWorkspace(cloudResult.data.data);
          setLastSyncedAt(new Date(cloudResult.data.lastModified));
          updateSyncStatus('synced');
          return;
        }
      }

      const saveResult = await saveCloudWorkspace(localEnvelope);
      if (saveResult.success) {
        setLastSyncedAt(new Date());
        updateSyncStatus('synced');
        return;
      }

      updateSyncStatus('local');
    } catch {
      updateSyncStatus('error');
    }
  };

  const setupOnlineListener = () => {
    const handleOnline = () => {
      if (isSignedIn()) {
        updateSyncStatus('syncing');
        syncNow();
      }
    };
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', () => updateSyncStatus('offline'));
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', () => updateSyncStatus('offline'));
    };
  };

  React.useEffect(() => {
    if (isOpen) {
      // Only show cached profile, don't auto-fetch from cloud (avoids popups)
      const cached = getCachedProfile();
      if (cached && isSignedIn()) {
        setProfile(cached);
        updateSyncStatus('synced');
      } else if (!navigator.onLine) {
        updateSyncStatus('offline');
      } else {
        updateSyncStatus('local');
      }
      setupOnlineListener();
    }
  }, [isOpen]);

  const handleSignIn = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const userProfile = await signIn();
      setProfile(userProfile);
      onProfileChange?.(userProfile);
      updateSyncStatus('syncing');
      await syncNow();
    } catch (e) {
      const message = e instanceof Error ? e.message : 'Sign in failed';
      setError(message);
      updateSyncStatus('error');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSignOut = async () => {
    signOut();
    setProfile(null);
    onProfileChange?.(null);
    updateSyncStatus('local');
    setLastSyncedAt(null);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl border border-slate-200 overflow-hidden animate-slide-up">
        <div className="flex items-center justify-between px-5 py-4 border-b border-slate-100">
          <h2 className="text-lg font-bold text-slate-900">Account</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        <div className="p-5 space-y-4">
          {profile ? (
            <>
              <div className="flex items-center gap-3">
                <img
                  src={profile.picture}
                  alt={profile.name}
                  className="w-14 h-14 rounded-full bg-slate-100"
                />
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-slate-900 truncate">{profile.name}</p>
                  <p className="text-sm text-slate-500 truncate">{profile.email}</p>
                </div>
              </div>

              <div
                className={`flex items-center gap-2 px-3 py-2 rounded-xl border ${SYNC_STATUS_COLORS[syncStatus]}`}
              >
                {SYNC_STATUS_ICONS[syncStatus]}
                <span className="text-sm font-medium">{SYNC_STATUS_LABELS[syncStatus]}</span>
              </div>

              {lastSyncedAt && (
                <p className="text-xs text-slate-500 flex items-center gap-1">
                  <Clock className="w-3.5 h-3.5" />
                  Last synced: {lastSyncedAt.toLocaleString()}
                </p>
              )}

              {error && (
                <p className="text-xs text-rose-600 flex items-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {error}
                </p>
              )}

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={syncNow}
                  disabled={syncStatus === 'syncing' || !navigator.onLine}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {syncStatus === 'syncing' ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <RefreshCw className="w-4 h-4" />
                  )}
                  <span>{syncStatus === 'syncing' ? 'Syncing...' : 'Sync Now'}</span>
                </button>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="flex-1 flex items-center justify-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </>
          ) : (
            <>
              <div className="text-center py-4">
                <div className="w-16 h-16 rounded-full bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-2xl mx-auto mb-4">
                  🎒
                </div>
                <h3 className="text-lg font-bold text-slate-900">Sign in with Google</h3>
                <p className="text-sm text-slate-500 mt-1">
                  Sync your classroom data across devices
                </p>
              </div>

              <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-100 rounded-xl">
                <Shield className="w-5 h-5 text-blue-600 flex-shrink-0" />
                <p className="text-xs text-blue-800">
                  Your data stays private — stored in your personal Google Drive app folder. We
                  never see student names, preferences, or assignments.
                </p>
              </div>

              {error && (
                <p className="text-xs text-rose-600 text-center flex items-center justify-center gap-1">
                  <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                    <path
                      fillRule="evenodd"
                      d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z"
                      clipRule="evenodd"
                    />
                  </svg>
                  {error}
                </p>
              )}

              <button
                type="button"
                onClick={handleSignIn}
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 px-4 py-3 bg-white hover:bg-slate-50 border border-slate-300 rounded-xl font-semibold text-slate-700 transition-colors disabled:opacity-50"
              >
                <svg className="w-5 h-5" viewBox="0 0 24 24">
                  <path
                    fill="currentColor"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="currentColor"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
                  />
                  <path
                    fill="currentColor"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
                  />
                </svg>
                <span>{isLoading ? 'Signing in...' : 'Continue with Google'}</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
