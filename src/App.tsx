import confetti from 'canvas-confetti';
import { CheckCircle2, MoreHorizontal, RotateCcw, Sparkles } from 'lucide-react';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { useCallback, useEffect, useRef, useState } from 'react';

import { AccountModal } from './components/AccountModal';
import { AssignmentBoard } from './components/AssignmentBoard';
import { ActiveTab, Navbar, SyncStatus } from './components/Navbar';
import { PrintPoster } from './components/PrintPoster';
import { RoleManager } from './components/RoleManager';
import { RotationHistory } from './components/RotationHistory';
import { StatsSidebar } from './components/StatsSidebar';
import { StudentManager } from './components/StudentManager';
import { calculateStatistics, generateAssignments } from './engine/matcher';
import {
  attemptSilentRefresh,
  hasValidToken,
  isSignedIn,
  restoreSession,
} from './services/auth/googleAuth';
import { migrateToV2 } from './services/migration/migrationEngine';
import {
  clearWorkspace,
  exportFromIndexedDB,
  getWorkspace,
  importToIndexedDB,
  saveWorkspace,
  updateWorkspace,
} from './services/storage/indexedDb';
import { fetchCloudWorkspace, saveCloudWorkspace } from './services/sync/googleDriveSync';
import {
  AntiRepetitionConfig,
  AppData,
  Assignment,
  Role,
  RotationSnapshot,
  Student,
} from './types';
import { copyToClipboard } from './utils/clipboard';

const STORAGE_KEY = 'classroom_role_assigner_data_v1';

const DEFAULT_ANTI_REPETITION_CONFIG: AntiRepetitionConfig = {
  recencyWindow: 2,
  avoidanceStrictness: 'balanced',
  standbyPriority: true,
};

const EMPTY_ROLES: Role[] = [];
const EMPTY_STUDENTS: Student[] = [];
const EMPTY_ASSIGNMENTS: Assignment[] = [];

const DEFAULT_ROLES_TEMPLATE: Role[] = [
  {
    id: 'role-line-leader',
    name: 'Line Leader',
    capacity: 2,
    description: 'Lead the class through the halls while stopping at checkpoints',
    icon: '🚶‍♂️',
    color: 'amber',
  },
  {
    id: 'role-door-monitor',
    name: 'Door Monitor',
    capacity: 1,
    description:
      'Open and close the door when exiting or entering. Grab the BLUE emergency bag by the door during drills',
    icon: '🚪',
    color: 'blue',
  },
  {
    id: 'role-attendance-monitor',
    name: 'Attendance Monitor',
    capacity: 1,
    description: 'Take attendance and lunch count and reset the magnets',
    icon: '📋',
    color: 'indigo',
  },
  {
    id: 'role-paper-passer',
    name: 'Paper Passer',
    capacity: 2,
    description: 'Pass out papers',
    icon: '📄',
    color: 'emerald',
  },
  {
    id: 'role-class-nurse',
    name: 'Class Nurse',
    capacity: 1,
    description: 'Provide bandaids or help with minor care when needed',
    icon: '🩹',
    color: 'rose',
  },
  {
    id: 'role-tech-assistant',
    name: 'Technology Assistant',
    capacity: 2,
    description:
      'Help with minor tech issues. Make sure all chromebooks are plugged in at the end of the day',
    icon: '💻',
    color: 'violet',
  },
  {
    id: 'role-librarian',
    name: 'Librarian',
    capacity: 1,
    description: 'Make sure the Library is neat and orderly. Reset round table cushion seats',
    icon: '📚',
    color: 'purple',
  },
  {
    id: 'role-trash-collector',
    name: 'Trash Collector',
    capacity: 1,
    description:
      'Move the trash bins to their spots in the morning. Move the trash bins to the front door at the end of the day',
    icon: '🗑️',
    color: 'stone',
  },
  {
    id: 'role-patriotic-leader',
    name: 'Patriotic Leader',
    capacity: 1,
    description: 'Lead the class in our flag salute',
    icon: '🇺🇸',
    color: 'red',
  },
  {
    id: 'role-pencil-monitor',
    name: 'Pencil Monitor',
    capacity: 1,
    description: 'Sharpen dull pencils at the end of the day',
    icon: '✏️',
    color: 'amber',
  },
  {
    id: 'role-desk-inspector',
    name: 'Desk Inspector',
    capacity: 1,
    description:
      'Inspect student desks for cleanliness and neatness. Desks should look orderly and any work should be in a neat stack',
    icon: '🪑',
    color: 'slate',
  },
  {
    id: 'role-bin-cubby-inspector',
    name: 'Bin & Cubby Inspector',
    capacity: 1,
    description:
      'Inspect work "Turn in" bins and student cubby shelf space. Bins should look orderly with work in neat stacks. Cubby spaces should look orderly. All papers should be inside folders',
    icon: '📦',
    color: 'zinc',
  },
  {
    id: 'role-energy-monitor',
    name: 'Energy Monitor',
    capacity: 1,
    description:
      'Turn off the lights when we leave the classroom. In charge of monitoring the lights in the classroom',
    icon: '💡',
    color: 'yellow',
  },
  {
    id: 'role-chair-inspector',
    name: 'Chair Inspector',
    capacity: 1,
    description: 'Make sure chairs are stacked by table group and help stack any extra chairs',
    icon: '🪑',
    color: 'gray',
  },
  {
    id: 'role-supply-manager',
    name: 'Supply Manager',
    capacity: 1,
    description: 'Make sure supplies are stocked and organized',
    icon: '📦',
    color: 'teal',
  },
  {
    id: 'role-receptionist',
    name: 'Receptionist',
    capacity: 1,
    description:
      'Answer the phone. "Hello this is Room 16\'s receptionist speaking. How can I help you today?" Deliver and receive messages',
    icon: '📞',
    color: 'sky',
  },
  {
    id: 'role-substitute',
    name: 'Substitute',
    capacity: 1,
    description: 'Make sure everyone checks their mailbox',
    icon: '⭐',
    color: 'yellow',
  },
  {
    id: 'role-lunch-cart-leader',
    name: 'Lunch Cart Leader',
    capacity: 1,
    description: 'Roll the lunch cart out and back into the classroom during breaks and lunch',
    icon: '🍎',
    color: 'red',
  },
  {
    id: 'role-agenda-agent',
    name: 'Agenda Agent',
    capacity: 1,
    description:
      'Check to make sure everyone has everything written down in the agenda in the morning',
    icon: '📝',
    color: 'blue',
  },
  {
    id: 'role-mailbox-monitor',
    name: 'Mailbox Monitor',
    capacity: 1,
    description:
      'Put away any work that needs to be sorted into the mailbox. Make sure everyone collects their papers from the mailbox',
    icon: '📬',
    color: 'indigo',
  },
  {
    id: 'role-homework-monitor',
    name: 'Homework Monitor',
    capacity: 1,
    description:
      'Check off students who have turned in their homework and put the homework in number order',
    icon: '📚',
    color: 'emerald',
  },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('board');
  const [classTitle, setClassTitle] = useState<string>('My Class');
  const [roles, setRoles] = useState<Role[]>(EMPTY_ROLES);
  const [students, setStudents] = useState<Student[]>(EMPTY_STUDENTS);
  const [assignments, setAssignments] = useState<Assignment[]>(EMPTY_ASSIGNMENTS);
  const [rotationHistory, setRotationHistory] = useState<RotationSnapshot[]>([]);
  const [antiRepetitionConfig, setAntiRepetitionConfig] = useState<AntiRepetitionConfig>(
    DEFAULT_ANTI_REPETITION_CONFIG
  );
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
  const [showAccountModal, setShowAccountModal] = useState(false);
  const [syncStatus, setSyncStatus] = useState<SyncStatus>('local');
  const [userProfile, setUserProfile] = useState<{
    name: string;
    email: string;
    picture: string;
  } | null>(null);

  const lastSavedStateRef = useRef<string>('');
  const syncDebounceRef = useRef<NodeJS.Timeout | null>(null);
  const isSyncingRef = useRef(false);

  const ensureAssignments = useCallback(
    (studentsData: Student[], _rolesData: Role[], existingAssignments: Assignment[]) => {
      const assignmentMap = new Map<string, Assignment>(
        existingAssignments.map(a => [a.studentId, a])
      );
      const newAssignments: Assignment[] = [];

      for (const student of studentsData) {
        const existing = assignmentMap.get(student.id);
        if (existing) {
          newAssignments.push(existing);
        } else {
          newAssignments.push({ studentId: student.id, roleId: null, isLocked: false });
        }
      }
      return newAssignments;
    },
    []
  );

  const loadFromIndexedDB = useCallback(async () => {
    try {
      console.log('[loadFromIndexedDB] Starting load...');
      const envelope = await getWorkspace();
      if (envelope) {
        console.log('[loadFromIndexedDB] Loaded from IndexedDB, revision:', envelope.revision);
        setClassTitle(envelope.data.classTitle || 'My Class');
        setRoles(envelope.data.roles || []);
        setStudents(envelope.data.students || []);
        setAssignments(
          envelope.data.assignments ||
            ensureAssignments(envelope.data.students || [], envelope.data.roles || [], [])
        );
        if (envelope.data.rotationHistory) {
          console.log(
            '[loadFromIndexedDB] Setting rotationHistory:',
            envelope.data.rotationHistory.length
          );
          setRotationHistory(envelope.data.rotationHistory);
        }
        if (envelope.data.antiRepetitionConfig)
          setAntiRepetitionConfig(envelope.data.antiRepetitionConfig);
        lastSavedStateRef.current = JSON.stringify(envelope.data);
        setLastSavedAt(new Date(envelope.lastModified));
        setHasLoaded(true);
        return true;
      }
      return false;
    } catch (e) {
      console.error('[loadFromIndexedDB] Failed:', e);
      return false;
    }
  }, [ensureAssignments]);

  const loadData = useCallback(async () => {
    const loaded = await loadFromIndexedDB();
    if (loaded) return;

    try {
      console.log('[loadData] Checking URL hash...');
      const hash = window.location.hash.slice(1);
      if (hash.startsWith('data=')) {
        const compressed = hash.slice(5);
        const decompressed = decompressFromEncodedURIComponent(compressed);
        if (decompressed) {
          const parsed = JSON.parse(decompressed) as AppData;
          console.log('[loadData] Loaded from URL hash');
          const migrated = migrateToV2(parsed);
          await saveWorkspace(migrated.data);
          const cleanUrl =
            window.location.origin + window.location.pathname + window.location.search;
          window.location.href = cleanUrl;
          return;
        }
      }

      const cached = localStorage.getItem(STORAGE_KEY);
      console.log('[loadData] localStorage cached:', cached ? 'found' : 'NOT FOUND');
      if (cached) {
        const parsed = JSON.parse(cached) as AppData;
        const migrated = migrateToV2(parsed);
        await saveWorkspace(migrated.data);
        localStorage.removeItem(STORAGE_KEY);
        return;
      }

      lastSavedStateRef.current = JSON.stringify({
        classTitle: 'My Class',
        roles: EMPTY_ROLES,
        students: EMPTY_STUDENTS,
        assignments: EMPTY_ASSIGNMENTS,
        rotationHistory: [],
        antiRepetitionConfig: DEFAULT_ANTI_REPETITION_CONFIG,
      });
      setHasLoaded(true);
    } catch (e) {
      console.error('Failed to load data:', e);
      lastSavedStateRef.current = JSON.stringify({
        classTitle: 'My Class',
        roles: EMPTY_ROLES,
        students: EMPTY_STUDENTS,
        assignments: EMPTY_ASSIGNMENTS,
        rotationHistory: [],
        antiRepetitionConfig: DEFAULT_ANTI_REPETITION_CONFIG,
      });
      setHasLoaded(true);
    }
  }, [loadFromIndexedDB, ensureAssignments]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const saveToDisk = useCallback(
    async (
      showToast = true,
      overrides?: {
        rotationHistory?: RotationSnapshot[];
        antiRepetitionConfig?: AntiRepetitionConfig;
      }
    ) => {
      try {
        setIsSaving(true);
        const currentRotationHistory = overrides?.rotationHistory ?? rotationHistory;
        const currentAntiRepetitionConfig = overrides?.antiRepetitionConfig ?? antiRepetitionConfig;
        const envelope = await updateWorkspace({
          classTitle,
          roles,
          students,
          assignments,
          rotationHistory: currentRotationHistory,
          antiRepetitionConfig: currentAntiRepetitionConfig,
        });
        if (envelope) {
          lastSavedStateRef.current = JSON.stringify(envelope.data);
          setLastSavedAt(new Date(envelope.lastModified));
        }
        if (showToast) {
          setSaveMessage('Saved locally');
          setTimeout(() => setSaveMessage(null), 2500);
        }
      } catch (e) {
        console.error('[saveToDisk] Error:', e);
        setLastSavedAt(new Date());
        if (showToast) {
          setSaveMessage('Saved locally');
          setTimeout(() => setSaveMessage(null), 2500);
        }
      } finally {
        setIsSaving(false);
      }
    },
    [classTitle, roles, students, assignments, rotationHistory, antiRepetitionConfig]
  );

  useEffect(() => {
    if (!hasLoaded) return;

    const currentSerialized = JSON.stringify({
      classTitle,
      roles,
      students,
      assignments,
      rotationHistory,
      antiRepetitionConfig,
    });

    if (!lastSavedStateRef.current || currentSerialized === lastSavedStateRef.current) {
      console.log('[auto-save] No change detected, skipping');
      return;
    }

    console.log('[auto-save] Change detected, scheduling save...');
    const timer = setTimeout(() => {
      saveToDisk(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [
    classTitle,
    roles,
    students,
    assignments,
    rotationHistory,
    antiRepetitionConfig,
    saveToDisk,
    hasLoaded,
  ]);

  const triggerCloudSync = useCallback(async () => {
    if (!isSignedIn() || isSyncingRef.current || !navigator.onLine) return;

    isSyncingRef.current = true;
    setSyncStatus('syncing');

    try {
      const localEnvelope = await getWorkspace();
      if (!localEnvelope) {
        setSyncStatus('local');
        return;
      }

      const cloudResult = await fetchCloudWorkspace();

      if (cloudResult.success && cloudResult.data) {
        const cloudRevision = cloudResult.data.revision || 0;
        const localRevision = localEnvelope.revision || 0;

        if (cloudRevision > localRevision) {
          await saveWorkspace(cloudResult.data.data);
          setSyncStatus('synced');
          loadFromIndexedDB();
          isSyncingRef.current = false;
          return;
        }
      }

      const saveResult = await saveCloudWorkspace(localEnvelope);
      if (saveResult.success) {
        setSyncStatus('synced');
      } else {
        throw new Error(saveResult.error || 'Save failed');
      }
    } catch (e) {
      console.error('[triggerCloudSync] Error:', e);
      setSyncStatus('error');
    } finally {
      isSyncingRef.current = false;
    }
  }, [loadFromIndexedDB]);

  // Restore persistent Google auth session across page refreshes
  useEffect(() => {
    const profile = restoreSession();
    if (profile) {
      setUserProfile(profile);
      if (hasValidToken()) {
        setSyncStatus('synced');
        triggerCloudSync();
      } else if (navigator.onLine) {
        // Token expired (> 1 hour) - attempt silent refresh in background with email hint
        setSyncStatus('syncing');
        attemptSilentRefresh(profile.email).then(token => {
          if (token) {
            setSyncStatus('synced');
            triggerCloudSync();
          } else {
            // Browser blocked iframe third-party cookies or session expired
            setSyncStatus('local');
          }
        });
      }
    }
  }, [triggerCloudSync]);

  useEffect(() => {
    if (!hasLoaded) return;

    if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);

    syncDebounceRef.current = setTimeout(() => {
      triggerCloudSync();
    }, 1500);

    return () => {
      if (syncDebounceRef.current) clearTimeout(syncDebounceRef.current);
    };
  }, [
    classTitle,
    roles,
    students,
    assignments,
    rotationHistory,
    antiRepetitionConfig,
    hasLoaded,
    triggerCloudSync,
  ]);

  const handleUpdateRoles = (newRoles: Role[]) => {
    setRoles(newRoles);
    setAssignments(prev => ensureAssignments(students, newRoles, prev));
  };

  const handleUpdateStudents = (newStudents: Student[]) => {
    setStudents(newStudents);
    setAssignments(prev => ensureAssignments(newStudents, roles, prev));
  };

  const handleUpdateAssignments = (newAssignments: Assignment[]) => {
    setAssignments(newAssignments);
  };

  const handleGenerateMatches = () => {
    const newAssignments = generateAssignments(students, roles, assignments, {
      rotationHistory,
      antiRepetitionConfig,
    });
    setAssignments(newAssignments);
  };

  const handleClearAssignments = () => {
    const cleared = assignments.map(a => ({ ...a, roleId: null, isLocked: false }));
    setAssignments(cleared);
  };

  const handleLoadDefaultRoles = () => {
    setRoles(DEFAULT_ROLES_TEMPLATE);
    setAssignments(prev => ensureAssignments(students, DEFAULT_ROLES_TEMPLATE, prev));
  };

  const handleExportJson = async () => {
    const jsonString = await exportFromIndexedDB();
    const blob = new Blob([jsonString], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = classTitle
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/(^-|-$)/g, '');
    a.download = `${safeTitle || 'classroom'}-jobs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSaveMessage('Exported class file!');
    setTimeout(() => setSaveMessage(null), 2500);
  };

  const handleImportJson = async (file: File) => {
    const reader = new FileReader();
    reader.onload = async e => {
      try {
        const text = e.target?.result as string;
        await importToIndexedDB(text);
        await loadFromIndexedDB();
        setSaveMessage('Imported class file!');
        setTimeout(() => setSaveMessage(null), 2500);
      } catch {
        setSaveMessage('Failed to import - invalid file');
        setTimeout(() => setSaveMessage(null), 2500);
      }
    };
    reader.readAsText(file);
  };

  const handleCopyShareLink = async () => {
    const jsonString = await exportFromIndexedDB();
    const compressed = compressToEncodedURIComponent(jsonString);
    const shareUrl = `${window.location.origin}${window.location.pathname}#data=${compressed}`;

    copyToClipboard(shareUrl).then(success => {
      setSaveMessage(success ? 'Share link copied!' : 'Failed to copy link');
      setTimeout(() => setSaveMessage(null), 2500);
    });
  };

  const handleFinalizeRotation = (name: string, notes: string, clearBoard: boolean) => {
    const now = new Date().toISOString();
    const roleMap = new Map(roles.map(r => [r.id, r]));
    const studentMap = new Map(students.map(s => [s.id, s]));

    const snapshot: RotationSnapshot = {
      id: `rot-${Date.now()}`,
      name,
      createdAt: now,
      finalizedAt: now,
      notes,
      assignments: assignments.map(a => ({
        studentId: a.studentId,
        roleId: a.roleId,
        roleName: a.roleId ? roleMap.get(a.roleId)?.name || null : null,
        studentName: studentMap.get(a.studentId)?.name || 'Unknown',
      })),
    };

    const newHistory = [...rotationHistory, snapshot];
    console.log('[handleFinalizeRotation] New history length:', newHistory.length);
    setRotationHistory(newHistory);

    if (clearBoard) {
      const cleared = assignments.map(a => ({ ...a, roleId: null, isLocked: false }));
      setAssignments(cleared);
      setSaveMessage(`Rotation "${name}" finalized! Board cleared for next cycle.`);
    } else {
      setSaveMessage(`Rotation "${name}" finalized! Current board kept as draft.`);
    }
    setTimeout(() => setSaveMessage(null), 3000);

    saveToDisk(false, { rotationHistory: newHistory });
  };

  const handleClearAllData = async () => {
    setClassTitle('My Class');
    setRoles(EMPTY_ROLES);
    setStudents(EMPTY_STUDENTS);
    setAssignments(EMPTY_ASSIGNMENTS);
    setRotationHistory([]);
    setAntiRepetitionConfig(DEFAULT_ANTI_REPETITION_CONFIG);
    await clearWorkspace();
    lastSavedStateRef.current = JSON.stringify({
      classTitle: 'My Class',
      roles: EMPTY_ROLES,
      students: EMPTY_STUDENTS,
      assignments: EMPTY_ASSIGNMENTS,
      rotationHistory: [],
      antiRepetitionConfig: DEFAULT_ANTI_REPETITION_CONFIG,
    });
    setLastSavedAt(null);
    setSaveMessage('All data cleared!');
    setTimeout(() => setSaveMessage(null), 2500);
  };

  useEffect(() => {
    const handleOnline = () => {
      if (isSignedIn()) {
        setSyncStatus('syncing');
        triggerCloudSync();
      }
    };
    const handleOffline = () => setSyncStatus('offline');
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, [triggerCloudSync]);

  const stats = calculateStatistics(students, roles, assignments);

  const handleGenerateWithConfetti = () => {
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
      });
    } catch {
      // ignore
    }
    handleGenerateMatches();
  };

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      <Navbar
        activeTab={activeTab}
        onSelectTab={setActiveTab}
        isSaving={isSaving}
        lastSavedAt={lastSavedAt}
        onSaveToDisk={() => saveToDisk(true)}
        onExportJson={handleExportJson}
        onImportJson={handleImportJson}
        onCopyShareLink={handleCopyShareLink}
        onLoadDefaultRoles={handleLoadDefaultRoles}
        onClearAllData={handleClearAllData}
        onUpdateClassTitle={setClassTitle}
        classTitle={classTitle}
        hasRoles={roles.length > 0}
        syncStatus={syncStatus}
        onOpenAccountModal={() => setShowAccountModal(true)}
        userProfile={userProfile}
      />

      <AccountModal
        isOpen={showAccountModal}
        onClose={() => setShowAccountModal(false)}
        onSyncStatusChange={setSyncStatus}
        onProfileChange={setUserProfile}
      />

      {saveMessage && (
        <div className="fixed bottom-4 right-4 bg-slate-900 text-white text-xs px-3.5 py-2 rounded-xl shadow-lg flex items-center gap-2 z-50 animate-fade-in border border-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{saveMessage}</span>
        </div>
      )}

      <main className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1">
        {activeTab === 'board' && (
          <>
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-2xl px-4 py-3 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
              <div className="flex items-center gap-2 min-w-0">
                <span className="text-xl flex-shrink-0">🎯</span>
                <div className="min-w-0">
                  <h2 className="text-base sm:text-lg font-bold truncate">
                    Classroom Job Matching Board
                  </h2>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-md font-normal hidden sm:inline-block">
                    Drag students to swap, move, or unassign
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 w-full sm:w-auto flex-wrap">
                {/* Primary actions - Generate always visible, Finalize visible on sm+ */}
                <button
                  type="button"
                  onClick={handleGenerateWithConfetti}
                  disabled={roles.length === 0 || students.length === 0}
                  className="flex-1 sm:flex-none items-center justify-center gap-1.5 bg-white hover:bg-blue-50 text-blue-700 font-extrabold px-4 py-2.5 rounded-xl shadow-md transition-all text-xs sm:text-sm disabled:opacity-50 min-h-[44px]"
                  title="Generate optimal matches"
                >
                  <span className="flex items-center gap-1.5 whitespace-nowrap">
                    <Sparkles
                      className="w-4 h-4 text-amber-500 animate-pulse flex-shrink-0"
                      aria-hidden="true"
                    />
                    <span className="hidden sm:inline">Generate Optimal Matches</span>
                    <span className="sm:hidden">Generate</span>
                  </span>
                </button>

                {/* Finalize Rotation - visible on sm+, in dropdown on mobile */}
                <button
                  type="button"
                  onClick={() => setShowFinalizeModal(true)}
                  disabled={assignments.length === 0}
                  className="hidden sm:flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2.5 rounded-xl shadow-md transition-all text-xs sm:text-sm disabled:opacity-50 min-h-[44px]"
                  title="Archive current assignments and start next rotation"
                >
                  <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                  Finalize Rotation 🔒
                </button>

                {/* Secondary actions dropdown - Clear on mobile, or all on mobile */}
                <div className="relative">
                  <button
                    type="button"
                    className="flex items-center justify-center p-2.5 rounded-xl bg-white/10 hover:bg-white/20 text-white transition-colors min-h-[44px] min-w-[44px] sm:hidden"
                    onClick={() => setShowActionMenu(!showActionMenu)}
                    aria-expanded={showActionMenu}
                    aria-haspopup="true"
                    aria-label="More actions"
                    title="More actions"
                  >
                    <MoreHorizontal className="w-5 h-5" aria-hidden="true" />
                  </button>

                  {showActionMenu && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setShowActionMenu(false)}
                        aria-hidden="true"
                      />
                      <div className="absolute right-0 top-full mt-2 z-50 w-48 bg-white rounded-xl shadow-lg border border-slate-200 py-1 animate-fade-in">
                        <button
                          type="button"
                          onClick={() => {
                            handleClearAssignments();
                            setShowActionMenu(false);
                          }}
                          disabled={assignments.length === 0}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-40"
                        >
                          <RotateCcw className="w-4 h-4" aria-hidden="true" />
                          Clear assignments
                        </button>
                        <button
                          type="button"
                          onClick={() => {
                            setShowFinalizeModal(true);
                            setShowActionMenu(false);
                          }}
                          disabled={assignments.length === 0}
                          className="w-full flex items-center gap-2 px-3 py-2.5 text-sm font-medium text-rose-700 hover:bg-rose-50 disabled:opacity-40"
                        >
                          <CheckCircle2 className="w-4 h-4" aria-hidden="true" />
                          Finalize rotation 🔒
                        </button>
                      </div>
                    </>
                  )}
                </div>

                {/* Clear button - visible on sm+ */}
                <button
                  type="button"
                  onClick={handleClearAssignments}
                  disabled={assignments.length === 0}
                  className="hidden sm:flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white font-medium px-4 py-2.5 rounded-xl border border-white/20 transition-all text-xs disabled:opacity-40 min-h-[44px]"
                  title="Clear all student assignments"
                >
                  <RotateCcw className="w-4 h-4" aria-hidden="true" />
                  Clear
                </button>
              </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <div className="lg:col-span-1">
                <StatsSidebar stats={stats} />
              </div>

              <div className="lg:col-span-3">
                <AssignmentBoard
                  students={students}
                  roles={roles}
                  assignments={assignments}
                  onUpdateAssignments={handleUpdateAssignments}
                  onFinalizeRotation={handleFinalizeRotation}
                  rotationHistoryLength={rotationHistory.length}
                  antiRepetitionConfig={antiRepetitionConfig}
                  onUpdateAntiRepetitionConfig={setAntiRepetitionConfig}
                  rotationHistory={rotationHistory}
                  showFinalizeModal={showFinalizeModal}
                  onCloseFinalizeModal={() => setShowFinalizeModal(false)}
                />
              </div>
            </div>
          </>
        )}

        {activeTab === 'students' && (
          <StudentManager
            students={students}
            roles={roles}
            onUpdateStudents={handleUpdateStudents}
            rotationHistory={rotationHistory}
          />
        )}

        {activeTab === 'roles' && (
          <RoleManager
            roles={roles}
            studentCount={students.length}
            onUpdateRoles={handleUpdateRoles}
          />
        )}

        {activeTab === 'print' && (
          <PrintPoster
            students={students}
            roles={roles}
            assignments={assignments}
            classTitle={classTitle}
          />
        )}

        {activeTab === 'history' && (
          <RotationHistory
            rotationHistory={rotationHistory}
            onUpdateHistory={setRotationHistory}
            antiRepetitionConfig={antiRepetitionConfig}
            onUpdateConfig={setAntiRepetitionConfig}
            students={students}
            roles={roles}
          />
        )}
      </main>
    </div>
  );
}
