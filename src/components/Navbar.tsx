import React from 'react';
import { Users, Briefcase, Target, Printer, Download, Upload, Link, PlusCircle, Settings, HardDrive, Trash2, AlertTriangle, Edit2, Check } from 'lucide-react';

export type ActiveTab = 'board' | 'students' | 'roles' | 'print';

// Inline editable class title component
const EditableClassTitle: React.FC<{ classTitle: string; onUpdate: (title: string) => void }> = ({
  classTitle,
  onUpdate,
}) => {
  const [isEditing, setIsEditing] = React.useState(false);
  const [editValue, setEditValue] = React.useState(classTitle);
  const inputRef = React.useRef<HTMLInputElement>(null);

  React.useEffect(() => {
    if (isEditing && inputRef.current) {
      inputRef.current.focus();
      inputRef.current.select();
    }
  }, [isEditing]);

  // Sync editValue when classTitle changes externally (e.g. on load from localStorage)
  React.useEffect(() => {
    if (!isEditing) {
      setEditValue(classTitle);
    }
  }, [classTitle, isEditing]);

  const handleSave = () => {
    const trimmed = editValue.trim();
    if (trimmed && trimmed !== classTitle) {
      onUpdate(trimmed);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSave();
    } else if (e.key === 'Escape') {
      setEditValue(classTitle);
      setIsEditing(false);
    }
  };

  const handleBlur = () => {
    // Small delay to allow click on save button to register
    setTimeout(handleSave, 100);
  };

  if (isEditing) {
    return (
      <span className="flex items-center gap-1">
        <input
          ref={inputRef}
          type="text"
          value={editValue}
          onChange={(e) => setEditValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={handleBlur}
          className="bg-white text-slate-900 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-400 w-24 focus:outline-none focus:ring-1 focus:ring-blue-500"
          maxLength={30}
        />
        <button
          type="button"
          onClick={handleSave}
          className="p-0.5 text-blue-600 hover:text-blue-800"
          title="Save"
        >
          <Check className="w-3.5 h-3.5" />
        </button>
      </span>
    );
  }

  return (
    <span
      className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200 cursor-pointer hover:bg-blue-200 transition-colors flex items-center gap-1"
      onClick={() => setIsEditing(true)}
      title="Click to edit class name"
    >
      {classTitle || 'My Class'}
      <Edit2 className="w-3 h-3 opacity-60 hover:opacity-100" />
    </span>
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
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [settingsOpen, setSettingsOpen] = React.useState(false);
  const dropdownRef = React.useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  React.useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setSettingsOpen(false);
      }
    };
    if (settingsOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [settingsOpen]);

  const triggerFileImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJson(file);
      e.target.value = '';
    }
    setSettingsOpen(false);
  };

  const handleDropdownAction = (action: () => void) => {
    action();
    setSettingsOpen(false);
  };

  const handleClearAllData = () => {
    if (window.confirm('⚠️ This will permanently delete ALL class data (roles, students, assignments) from this browser.\n\nThis cannot be undone. Export first if you want a backup.\n\nAre you sure?')) {
      onClearAllData();
      setSettingsOpen(false);
    }
  };

  return (
    <header className="no-print bg-white border-b border-slate-200/90 sticky top-0 z-40 shadow-xs">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16 flex-wrap gap-4">
          {/* Logo & Title */}
          <div className="flex items-center gap-3 flex-shrink-0">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center text-xl shadow-sm">
              🎒
            </div>
            <div>
              <div className="flex items-center gap-1.5">
                <h1 className="font-extrabold text-slate-900 text-base sm:text-lg tracking-tight">
                  Classroom Role Assigner
                </h1>
                <EditableClassTitle
                  classTitle={classTitle}
                  onUpdate={onUpdateClassTitle}
                />
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Preference-maximizing matching with teacher adjustments
              </p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-100/80 p-1 rounded-xl border border-slate-200/80 flex-shrink-0">
            <button
              type="button"
              onClick={() => onSelectTab('board')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'board'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Target className="w-3.5 h-3.5" />
              <span>Matching Board</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('students')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'students'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Students</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('roles')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'roles'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Briefcase className="w-3.5 h-3.5" />
              <span>Jobs & Slots</span>
            </button>

            <button
              type="button"
              onClick={() => onSelectTab('print')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                activeTab === 'print'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <Printer className="w-3.5 h-3.5" />
              <span>Poster</span>
            </button>
          </nav>

          {/* Right side: Contextual button + Settings dropdown */}
          <div className="flex items-center gap-2 flex-shrink-0">
            {/* Load Default Roles Button (on Roles tab when empty) */}
            {activeTab === 'roles' && !hasRoles && (
              <button
                type="button"
                onClick={onLoadDefaultRoles}
                className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3 py-1.5 rounded-xl shadow-sm transition-all text-xs"
                title="Load common 4th-grade classroom jobs template"
              >
                <PlusCircle className="w-3.5 h-3.5" />
                <span>Load Default Jobs</span>
              </button>
            )}

            {/* Settings Dropdown */}
            <div className="relative" ref={dropdownRef}>
              <button
                type="button"
                onClick={() => setSettingsOpen(!settingsOpen)}
                disabled={isSaving}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                title="Settings & Data"
                aria-expanded={settingsOpen}
                aria-haspopup="true"
              >
                <Settings className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Settings</span>
                <span className="inline-block transition-transform" style={{ transform: settingsOpen ? 'rotate(180deg)' : 'rotate(0deg)' }}>
                  ▼
                </span>
              </button>

              {settingsOpen && (
                <div className="absolute right-0 top-full mt-1.5 w-56 bg-white rounded-xl border border-slate-200 shadow-lg py-1 z-50 animate-fade-in">
                  <div className="px-3 py-2 border-b border-slate-100">
                    <p className="text-xs font-semibold text-slate-900">Data & Sync</p>
                    <p className="text-[11px] text-slate-500 mt-0.5">Auto-saves to browser on every change</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDropdownAction(onExportJson)}
                    disabled={isSaving}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    <Download className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    <span>Export Class File (.json)</span>
                  </button>

                  <div className="relative">
                    <input
                      type="file"
                      ref={fileInputRef}
                      accept=".json"
                      onChange={handleFileSelect}
                      className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={triggerFileImport}
                      disabled={isSaving}
                      className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                    >
                      <Upload className="w-4 h-4 text-slate-400 flex-shrink-0" />
                      <span>Import Class File (.json)</span>
                    </button>
                  </div>

                  <button
                    type="button"
                    onClick={() => handleDropdownAction(onCopyShareLink)}
                    disabled={isSaving}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium text-blue-700 hover:bg-blue-50 transition-colors disabled:opacity-50"
                  >
                    <Link className="w-4 h-4 text-blue-500 flex-shrink-0" />
                    <span>Copy Share / Sync Link</span>
                  </button>

                  <div className="border-t border-slate-100 my-1"></div>

                  <button
                    type="button"
                    onClick={() => handleDropdownAction(onSaveToDisk)}
                    disabled={isSaving}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium text-slate-700 hover:bg-slate-50 transition-colors disabled:opacity-50"
                  >
                    {isSaving ? (
                      <div className="w-4 h-4 border-2 border-blue-600 border-t-transparent rounded-full animate-spin flex-shrink-0" />
                    ) : (
                      <HardDrive className="w-4 h-4 text-slate-400 flex-shrink-0" />
                    )}
                    <span>{isSaving ? 'Saving...' : 'Save Now'}</span>
                  </button>

                  <div className="border-t border-slate-100 my-1"></div>

                  <button
                    type="button"
                    onClick={handleClearAllData}
                    disabled={isSaving}
                    className="w-full flex items-center gap-2 px-3 py-2 text-left text-xs font-medium text-rose-700 hover:bg-rose-50 transition-colors disabled:opacity-50"
                  >
                    <AlertTriangle className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <Trash2 className="w-4 h-4 text-rose-500 flex-shrink-0" />
                    <span>Clear All Data (Reset)</span>
                  </button>

                  {lastSavedAt && (
                    <div className="px-3 py-1.5 border-t border-slate-100">
                      <p className="text-[11px] text-slate-400 text-center">
                        Last saved {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};