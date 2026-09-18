import {
  Backpack,
  Briefcase,
  Check,
  ChevronDown,
  Cloud,
  CloudOff,
  Download,
  Edit2,
  HardDrive,
  History,
  Link,
  Loader2,
  Menu,
  PlusCircle,
  Printer,
  Settings,
  Target,
  Trash2,
  Upload,
  User,
  Users,
  X,
} from 'lucide-react';
import React from 'react';

export type ActiveTab = 'board' | 'students' | 'roles' | 'print' | 'history';
export type SyncStatus = 'synced' | 'syncing' | 'local' | 'offline' | 'error';

const SYNC_STATUS_LABELS: Record<SyncStatus, string> = {
  synced: 'Synced with Google Drive',
  syncing: 'Syncing...',
  local: 'Saved to this device',
  offline: 'Offline (Saved locally)',
  error: 'Sync failed',
};

const SYNC_STATUS_COLORS: Record<SyncStatus, string> = {
  synced: 'bg-emerald-50 text-emerald-700 border-emerald-200',
  syncing: 'bg-blue-50 text-blue-700 border-blue-200',
  local: 'bg-slate-50 text-slate-700 border-slate-200',
  offline: 'bg-amber-50 text-amber-700 border-amber-200',
  error: 'bg-rose-50 text-rose-700 border-rose-200',
};

const SYNC_STATUS_ICONS = {
  synced: Cloud,
  syncing: Loader2,
  local: HardDrive,
  offline: CloudOff,
  error: CloudOff,
};

const TABS: { id: ActiveTab; label: string; icon: typeof Target }[] = [
  { id: 'board', label: 'Matching Board', icon: Target },
  { id: 'students', label: 'Students', icon: Users },
  { id: 'roles', label: 'Jobs & Slots', icon: Briefcase },
  { id: 'print', label: 'Poster', icon: Printer },
  { id: 'history', label: 'Rotations', icon: History },
];

const EditableClassTitle: React.FC<{
  classTitle: string;
  onUpdate: (title: string) => void;
}> = ({ classTitle, onUpdate }) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(classTitle);
  const inputRef = React.useRef<HTMLInputElement>(null);
  const buttonRef = React.useRef<HTMLButtonElement>(null);
  const finishedRef = React.useRef(false);
  const restoreFocusRef = React.useRef(false);

  React.useEffect(() => {
    if (isEditing) {
      inputRef.current?.focus();
      inputRef.current?.select();
    } else if (restoreFocusRef.current) {
      restoreFocusRef.current = false;
      buttonRef.current?.focus();
    }
  }, [isEditing]);

  const finishEditing = (save: boolean, restoreFocus: boolean) => {
    if (finishedRef.current) return;
    finishedRef.current = true;
    restoreFocusRef.current = restoreFocus;
    const trimmed = editValue.trim();
    if (save && trimmed && trimmed !== classTitle) onUpdate(trimmed);
    setIsEditing(false);
  };

  if (isEditing) {
    return (
      <span
        className="flex min-w-0 w-full sm:w-64 items-center gap-2"
        onBlur={event => {
          if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
            finishEditing(true, false);
          }
        }}
      >
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={event => setEditValue(event.target.value)}
          onKeyDown={event => {
            if (event.key === 'Enter' || event.key === 'Escape') {
              event.preventDefault();
              event.stopPropagation();
              finishEditing(event.key === 'Enter', true);
            }
          }}
          className="min-w-0 w-full min-h-11 rounded-lg border border-blue-400 bg-white px-2 text-base text-slate-900"
          maxLength={30}
          aria-label="Edit class name"
        />
        <button
          type="button"
          onClick={() => finishEditing(true, true)}
          className="flex w-11 shrink-0 items-center justify-center rounded-lg text-blue-700 hover:bg-blue-50"
          aria-label="Save class name"
        >
          <Check className="w-4 h-4" aria-hidden="true" />
        </button>
      </span>
    );
  }

  return (
    <button
      ref={buttonRef}
      type="button"
      className="flex min-w-0 max-w-full items-center gap-2 rounded-xl border border-blue-200 bg-blue-50 px-3 py-2 text-left text-sm font-semibold text-blue-800 hover:bg-blue-100"
      onClick={() => {
        finishedRef.current = false;
        setEditValue(classTitle);
        setIsEditing(true);
      }}
      title="Click to edit class name"
    >
      <span className="min-w-0 [overflow-wrap:anywhere]">{classTitle || 'My Class'}</span>
      <Edit2 className="w-3.5 h-3.5 shrink-0" aria-hidden="true" />
    </button>
  );
};

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isSaving: boolean;
  lastSavedAt: Date | null;
  onSaveToDisk: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  onCopyShareLink: () => void;
  onLoadDefaultRoles: () => void;
  onClearAllData: () => void;
  onUpdateClassTitle: (title: string) => void;
  classTitle: string;
  hasRoles: boolean;
  syncStatus: SyncStatus;
  onOpenAccountModal: () => void;
  userProfile?: { name: string; email: string; picture: string } | null;
}

export const Navbar: React.FC<NavbarProps> = ({
  activeTab,
  onSelectTab,
  isSaving,
  lastSavedAt,
  onSaveToDisk,
  onExportJson,
  onImportJson,
  onCopyShareLink,
  onLoadDefaultRoles,
  onClearAllData,
  onUpdateClassTitle,
  classTitle,
  hasRoles,
  syncStatus,
  onOpenAccountModal,
  userProfile,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const settingsButtonRef = React.useRef<HTMLButtonElement>(null);
  const navigationButtonRef = React.useRef<HTMLButtonElement>(null);
  const dropdownRef = React.useRef<HTMLDivElement>(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const [navigationOpen, setNavigationOpen] = React.useState(false);
  const navigationId = React.useId();
  const settingsId = React.useId();
  const SyncIcon = SYNC_STATUS_ICONS[syncStatus];
  const activeLabel = TABS.find(tab => tab.id === activeTab)?.label;

  React.useEffect(() => {
    if (!settingsOpen) return;
    const handleOutside = (event: MouseEvent) => {
      if (!dropdownRef.current?.contains(event.target as Node)) setSettingsOpen(false);
    };
    document.addEventListener('mousedown', handleOutside);
    return () => document.removeEventListener('mousedown', handleOutside);
  }, [settingsOpen]);

  const closeSettings = () => {
    setSettingsOpen(false);
    settingsButtonRef.current?.focus();
  };

  const handleAction = (action: () => void) => {
    closeSettings();
    action();
  };

  const handleClearAllData = () => {
    if (
      window.confirm(
        'This will permanently delete ALL class data (roles, students, assignments) from this browser.\n\nThis cannot be undone. Export first if you want a backup.\n\nAre you sure?'
      )
    ) {
      handleAction(onClearAllData);
    }
  };

  const actionClass =
    'flex w-full items-center gap-3 px-4 py-2 text-left text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50';

  return (
    <header
      className="app-navbar no-print relative z-40 bg-white shadow-xs sm:sticky sm:top-0"
      onKeyDown={event => {
        if (event.key !== 'Escape') return;
        if (settingsOpen) {
          event.stopPropagation();
          closeSettings();
        } else if (navigationOpen) {
          setNavigationOpen(false);
          navigationButtonRef.current?.focus();
        }
      }}
    >
      <input
        type="file"
        ref={fileInputRef}
        accept=".json"
        disabled={isSaving}
        onChange={event => {
          const file = event.target.files?.[0];
          event.target.value = '';
          if (file) handleAction(() => onImportJson(file));
        }}
        className="hidden"
        tabIndex={-1}
      />
      <div className="max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-[minmax(0,1fr)_auto] items-start gap-3 py-3 sm:items-center">
          <div className="flex min-w-0 items-center gap-3">
            <div className="hidden sm:flex w-10 h-10 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white">
              <Backpack className="w-6 h-6" aria-hidden="true" />
            </div>
            <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
              <h1 className="text-lg font-extrabold tracking-tight text-slate-900">Happy Roles</h1>
              <EditableClassTitle classTitle={classTitle} onUpdate={onUpdateClassTitle} />
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-2">
            <div
              className={`sr-only md:not-sr-only md:flex md:items-center md:gap-2 md:rounded-xl md:border md:px-3 md:py-2 md:text-xs ${SYNC_STATUS_COLORS[syncStatus]}`}
              role="status"
              aria-atomic="true"
            >
              <SyncIcon
                className={`w-4 h-4 shrink-0 ${syncStatus === 'syncing' ? 'motion-safe:animate-spin' : ''}`}
                aria-hidden="true"
              />
              <span>{SYNC_STATUS_LABELS[syncStatus]}</span>
            </div>
            <button
              type="button"
              onClick={() => {
                setSettingsOpen(false);
                onOpenAccountModal();
              }}
              className="flex w-11 shrink-0 items-center justify-center rounded-xl border border-slate-200 bg-slate-50 text-slate-700 hover:bg-slate-100"
              title="Account & Sync"
              aria-label="Account & Sync"
            >
              {userProfile ? (
                <img
                  src={userProfile.picture}
                  alt=""
                  width={28}
                  height={28}
                  className="w-7 h-7 rounded-full"
                />
              ) : (
                <User className="w-5 h-5" aria-hidden="true" />
              )}
            </button>
            <div
              className="relative"
              ref={dropdownRef}
              onBlur={event => {
                if (!event.currentTarget.contains(event.relatedTarget as Node | null)) {
                  setSettingsOpen(false);
                }
              }}
            >
              <button
                ref={settingsButtonRef}
                type="button"
                onClick={() => {
                  setSettingsOpen(open => !open);
                  setNavigationOpen(false);
                }}
                className="flex min-w-11 items-center justify-center gap-2 rounded-xl border border-slate-200 bg-slate-50 px-3 text-sm font-semibold text-slate-700 hover:bg-slate-100"
                title="Settings & Data"
                aria-label="Settings & Data"
                aria-expanded={settingsOpen}
                aria-controls={settingsId}
              >
                <Settings className="w-4 h-4" aria-hidden="true" />
                <span className="hidden sm:inline">Settings</span>
                <ChevronDown className="hidden sm:block w-4 h-4" aria-hidden="true" />
              </button>
              {settingsOpen && (
                <div
                  id={settingsId}
                  className="absolute right-0 top-full z-50 mt-2 w-72 max-w-[calc(100vw-2rem)] max-h-[60dvh] overflow-y-auto rounded-xl border border-slate-200 bg-white py-2 shadow-lg"
                >
                  <div className="px-4 py-2 border-b border-slate-100 mb-1">
                    <p className="text-sm font-semibold text-slate-900">Data & Sync</p>
                    <p className="mt-1 text-xs text-slate-600">{SYNC_STATUS_LABELS[syncStatus]}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleAction(onExportJson)}
                    disabled={isSaving}
                    className={actionClass}
                  >
                    <Download className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Export Class File (.json)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={isSaving}
                    className={actionClass}
                  >
                    <Upload className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Import Class File (.json)</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(onCopyShareLink)}
                    disabled={isSaving}
                    className={actionClass}
                  >
                    <Link className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>Copy Share / Sync Link</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => handleAction(onSaveToDisk)}
                    disabled={isSaving}
                    className={actionClass}
                  >
                    <HardDrive className="w-4 h-4 shrink-0" aria-hidden="true" />
                    <span>{isSaving ? 'Saving...' : 'Save Now'}</span>
                  </button>
                  <div className="mt-2 border-t border-slate-200 pt-2">
                    <button
                      type="button"
                      onClick={handleClearAllData}
                      disabled={isSaving}
                      className="flex w-full items-center gap-3 px-4 py-2 text-left text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-50"
                    >
                      <Trash2 className="w-4 h-4 shrink-0" aria-hidden="true" />
                      <span>Clear All Data (Reset)</span>
                    </button>
                  </div>
                  {lastSavedAt && (
                    <p className="px-4 pt-2 text-xs text-slate-600">
                      Last saved{' '}
                      {lastSavedAt.toLocaleTimeString([], {
                        hour: '2-digit',
                        minute: '2-digit',
                        second: '2-digit',
                      })}
                    </p>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
        <button
          ref={navigationButtonRef}
          type="button"
          onClick={() => {
            setNavigationOpen(open => !open);
            setSettingsOpen(false);
          }}
          className="flex sm:hidden w-full items-center justify-between gap-2 rounded-xl bg-slate-100 px-3 text-sm font-semibold text-slate-700 mb-2"
          aria-expanded={navigationOpen}
          aria-controls={navigationId}
          aria-label={navigationOpen ? 'Close navigation menu' : 'Open navigation menu'}
        >
          <span>{activeLabel}</span>
          {navigationOpen ? (
            <X className="w-5 h-5" aria-hidden="true" />
          ) : (
            <Menu className="w-5 h-5" aria-hidden="true" />
          )}
        </button>
        <nav
          id={navigationId}
          aria-label="Main navigation"
          className={`${navigationOpen ? 'grid' : 'hidden'} sm:grid grid-cols-1 sm:grid-cols-5 gap-0 bg-white sm:border-none border-b border-slate-200`}
        >
          {TABS.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              aria-label={label}
              aria-current={activeTab === id ? 'page' : undefined}
              onClick={() => {
                onSelectTab(id);
                if (navigationOpen) navigationButtonRef.current?.focus();
                setNavigationOpen(false);
              }}
              className={`flex min-w-0 items-center justify-center gap-2 rounded-t-lg px-3 py-2.5 text-sm font-semibold transition-all relative ${
                activeTab === id
                  ? 'bg-white text-blue-700 sm:bg-slate-100 sm:before:absolute sm:before:top-0 sm:before:left-0 sm:before:right-0 sm:before:h-[calc(100%-2px)] sm:before:border-l-2 sm:before:border-r-2 sm:before:border-t-2 sm:before:border-blue-500 sm:before:rounded-t-lg'
                  : 'bg-white text-slate-600 sm:after:absolute sm:after:bottom-[1px] sm:after:left-0 sm:after:right-0 sm:after:h-0.5 sm:after:bg-blue-500'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>{label}</span>
            </button>
          ))}
        </nav>
        {activeTab === 'roles' && !hasRoles && (
          <div className="border-t border-slate-100 py-2">
            <button
              type="button"
              onClick={onLoadDefaultRoles}
              className="flex items-center gap-2 rounded-xl bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
              title="Load common 4th-grade classroom jobs template"
            >
              <PlusCircle className="w-4 h-4 shrink-0" aria-hidden="true" />
              <span>Load Default Jobs</span>
            </button>
          </div>
        )}
      </div>
    </header>
  );
};
