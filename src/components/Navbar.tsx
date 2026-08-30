import React from 'react';
import { Users, Briefcase, Target, Printer, HardDrive, Download, Upload, Link, Sparkles, RotateCcw, PlusCircle } from 'lucide-react';

export type ActiveTab = 'board' | 'students' | 'roles' | 'print';

interface NavbarProps {
  activeTab: ActiveTab;
  onSelectTab: (tab: ActiveTab) => void;
  isSaving: boolean;
  lastSavedAt: Date | null;
  onSaveToDisk: () => void;
  onExportJson: () => void;
  onImportJson: (file: File) => void;
  onCopyShareLink: () => void;
  onGenerateMatches: () => void;
  onClearAssignments: () => void;
  onLoadDefaultRoles: () => void;
  hasRoles: boolean;
  hasStudents: boolean;
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
  onGenerateMatches,
  onClearAssignments,
  onLoadDefaultRoles,
  hasRoles,
  hasStudents,
}) => {
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const triggerFileImport = () => {
    fileInputRef.current?.click();
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      onImportJson(file);
      // Reset the input so the same file can be selected again
      e.target.value = '';
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
                <span className="bg-blue-100 text-blue-800 text-[10px] font-bold px-2 py-0.5 rounded-full border border-blue-200">
                  Grade 4
                </span>
              </div>
              <p className="text-[11px] text-slate-500 hidden sm:block">
                Preference-maximizing matching with letter score adjustments
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

          {/* Action Buttons & Save Status */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* Generate Matches Button (only on Board tab) */}
            {activeTab === 'board' && hasRoles && hasStudents && (
              <button
                type="button"
                onClick={onGenerateMatches}
                disabled={isSaving}
                className="flex items-center gap-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-semibold px-3 py-1.5 rounded-xl shadow-sm transition-all text-xs disabled:opacity-50"
                title="Generate optimal matches using preference-maximizing algorithm"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Generate Matches</span>
              </button>
            )}

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

            {/* Clear Assignments Button (on Board tab when there are assignments) */}
            {activeTab === 'board' && hasStudents && (
              <button
                type="button"
                onClick={onClearAssignments}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all"
                title="Clear all assignments (students go to standby)"
              >
                <RotateCcw className="w-3.5 h-3.5 text-slate-500" />
                <span>Clear Assignments</span>
              </button>
            )}

            {/* Export/Import/Share Group */}
            <div className="flex items-center gap-1.5">
              <input
                type="file"
                ref={fileInputRef}
                accept=".json"
                onChange={handleFileSelect}
                className="hidden"
                id="import-file-input"
              />

              <button
                type="button"
                onClick={onExportJson}
                disabled={isSaving}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                title="Export class data as JSON file"
              >
                <Download className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Export</span>
              </button>

              <button
                type="button"
                onClick={triggerFileImport}
                disabled={isSaving}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                title="Import class data from JSON file"
              >
                <Upload className="w-3.5 h-3.5 text-slate-500" />
                <span className="hidden sm:inline">Import</span>
              </button>

              <button
                type="button"
                onClick={onCopyShareLink}
                disabled={isSaving}
                className="flex items-center gap-1.5 bg-blue-100 hover:bg-blue-200 text-blue-800 border border-blue-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                title="Copy shareable sync link to clipboard"
              >
                <Link className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Share Link</span>
              </button>
            </div>

            {/* Disk Save Status & Trigger */}
            <div className="flex items-center gap-2">
              {lastSavedAt && (
                <span className="text-[11px] text-slate-400 hidden sm:inline">
                  Saved {lastSavedAt.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                </span>
              )}
              <button
                type="button"
                onClick={onSaveToDisk}
                disabled={isSaving}
                className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-200 px-3 py-1.5 rounded-xl text-xs font-semibold transition-all disabled:opacity-50"
                title="Save current state to localStorage (auto-saves on every change)"
              >
                {isSaving ? (
                  <>
                    <div className="w-3.5 h-3.5 border-2 border-blue-600 border-t-transparent rounded-full animate-spin"></div>
                    <span>Saving...</span>
                  </>
                ) : (
                  <>
                    <HardDrive className="w-3.5 h-3.5 text-slate-500" />
                    <span className="hidden sm:inline">Saved</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};