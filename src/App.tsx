import { useState, useEffect, useCallback, useRef } from 'react';
import { Student, Role, Assignment, AppData, RotationSnapshot, AntiRepetitionConfig } from './types';
import { calculateStatistics, generateAssignments } from './engine/matcher';
import { Navbar, ActiveTab } from './components/Navbar';
import { StatsSidebar } from './components/StatsSidebar';
import { AssignmentBoard } from './components/AssignmentBoard';
import { StudentManager } from './components/StudentManager';
import { RoleManager } from './components/RoleManager';
import { PrintPoster } from './components/PrintPoster';
import { RotationHistory } from './components/RotationHistory';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { Sparkles, RotateCcw, CheckCircle2 } from 'lucide-react';
import confetti from 'canvas-confetti';
import { copyToClipboard } from './utils/clipboard';

const STORAGE_KEY = 'classroom_role_assigner_data_v1';

const DEFAULT_ANTI_REPETITION_CONFIG: AntiRepetitionConfig = {
  recencyWindow: 2,
  avoidanceStrictness: 'balanced',
  standbyPriority: true,
};

// Clean initial state - empty for first-time users
const EMPTY_ROLES: Role[] = [];
const EMPTY_STUDENTS: Student[] = [];
const EMPTY_ASSIGNMENTS: Assignment[] = [];

// Default roles template (used when teacher wants to start with common classroom jobs)
// Based on Ms. Yi's 4th grade classroom leadership roles
const DEFAULT_ROLES_TEMPLATE: Role[] = [
  { id: 'role-line-leader', name: 'Line Leader', capacity: 2, description: 'Lead the class through the halls while stopping at checkpoints', icon: '🚶‍♂️', color: 'amber' },
  { id: 'role-door-monitor', name: 'Door Monitor', capacity: 1, description: 'Open and close the door when exiting or entering. Grab the BLUE emergency bag by the door during drills', icon: '🚪', color: 'blue' },
  { id: 'role-attendance-monitor', name: 'Attendance Monitor', capacity: 1, description: 'Take attendance and lunch count and reset the magnets', icon: '📋', color: 'indigo' },
  { id: 'role-paper-passer', name: 'Paper Passer', capacity: 2, description: 'Pass out papers', icon: '📄', color: 'emerald' },
  { id: 'role-class-nurse', name: 'Class Nurse', capacity: 1, description: 'Provide bandaids or help with minor care when needed', icon: '🩹', color: 'rose' },
  { id: 'role-tech-assistant', name: 'Technology Assistant', capacity: 2, description: 'Help with minor tech issues. Make sure all chromebooks are plugged in at the end of the day', icon: '💻', color: 'violet' },
  { id: 'role-librarian', name: 'Librarian', capacity: 1, description: 'Make sure the Library is neat and orderly. Reset round table cushion seats', icon: '📚', color: 'purple' },
  { id: 'role-trash-collector', name: 'Trash Collector', capacity: 1, description: 'Move the trash bins to their spots in the morning. Move the trash bins to the front door at the end of the day', icon: '🗑️', color: 'stone' },
  { id: 'role-patriotic-leader', name: 'Patriotic Leader', capacity: 1, description: 'Lead the class in our flag salute', icon: '🇺🇸', color: 'red' },
  { id: 'role-pencil-monitor', name: 'Pencil Monitor', capacity: 1, description: 'Sharpen dull pencils at the end of the day', icon: '✏️', color: 'amber' },
  { id: 'role-desk-inspector', name: 'Desk Inspector', capacity: 1, description: 'Inspect student desks for cleanliness and neatness. Desks should look orderly and any work should be in a neat stack', icon: '🪑', color: 'slate' },
  { id: 'role-bin-cubby-inspector', name: 'Bin & Cubby Inspector', capacity: 1, description: 'Inspect work "Turn in" bins and student cubby shelf space. Bins should look orderly with work in neat stacks. Cubby spaces should look orderly. All papers should be inside folders', icon: '📦', color: 'zinc' },
  { id: 'role-energy-monitor', name: 'Energy Monitor', capacity: 1, description: 'Turn off the lights when we leave the classroom. In charge of monitoring the lights in the classroom', icon: '💡', color: 'yellow' },
  { id: 'role-chair-inspector', name: 'Chair Inspector', capacity: 1, description: 'Make sure chairs are stacked by table group and help stack any extra chairs', icon: '🪑', color: 'gray' },
  { id: 'role-supply-manager', name: 'Supply Manager', capacity: 1, description: 'Make sure supplies are stocked and organized', icon: '📦', color: 'teal' },
  { id: 'role-receptionist', name: 'Receptionist', capacity: 1, description: 'Answer the phone. "Hello this is Room 16\'s receptionist speaking. How can I help you today?" Deliver and receive messages', icon: '📞', color: 'sky' },
  { id: 'role-substitute', name: 'Substitute', capacity: 1, description: 'Make sure everyone checks their mailbox', icon: '⭐', color: 'yellow' },
  { id: 'role-lunch-cart-leader', name: 'Lunch Cart Leader', capacity: 1, description: 'Roll the lunch cart out and back into the classroom during breaks and lunch', icon: '🍎', color: 'red' },
  { id: 'role-agenda-agent', name: 'Agenda Agent', capacity: 1, description: 'Check to make sure everyone has everything written down in the agenda in the morning', icon: '📝', color: 'blue' },
  { id: 'role-mailbox-monitor', name: 'Mailbox Monitor', capacity: 1, description: 'Put away any work that needs to be sorted into the mailbox. Make sure everyone collects their papers from the mailbox', icon: '📬', color: 'indigo' },
  { id: 'role-homework-monitor', name: 'Homework Monitor', capacity: 1, description: 'Check off students who have turned in their homework and put the homework in number order', icon: '📚', color: 'emerald' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('board');
  const [classTitle, setClassTitle] = useState<string>('My Class');
  const [roles, setRoles] = useState<Role[]>(EMPTY_ROLES);
  const [students, setStudents] = useState<Student[]>(EMPTY_STUDENTS);
  const [assignments, setAssignments] = useState<Assignment[]>(EMPTY_ASSIGNMENTS);
  const [rotationHistory, setRotationHistory] = useState<RotationSnapshot[]>([]);
  const [antiRepetitionConfig, setAntiRepetitionConfig] = useState<AntiRepetitionConfig>(DEFAULT_ANTI_REPETITION_CONFIG);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);
  const [showFinalizeModal, setShowFinalizeModal] = useState(false);

  const lastSavedStateRef = useRef<string>('');

  // Generate initial assignments for unassigned students
  const ensureAssignments = useCallback((studentsData: Student[], _rolesData: Role[], existingAssignments: Assignment[]) => {
    const assignmentMap = new Map<string, Assignment>(existingAssignments.map(a => [a.studentId, a]));
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
  }, []);

  // Load data from localStorage or URL hash
  const loadData = useCallback(async () => {
    try {
      console.log('[loadData] Starting load...');
      // Check URL hash first for share link
      const hash = window.location.hash.slice(1);
      if (hash.startsWith('data=')) {
        const compressed = hash.slice(5);
        const decompressed = decompressFromEncodedURIComponent(compressed);
        if (decompressed) {
          const parsed = JSON.parse(decompressed) as AppData;
          console.log('[loadData] Loaded from URL hash, rotationHistory:', parsed.rotationHistory?.length || 0);
          // Persist to localStorage first, then navigate to clean URL
          const serialized = JSON.stringify({
            classTitle: parsed.classTitle || 'My Class',
            roles: parsed.roles || [],
            students: parsed.students || [],
            assignments: parsed.assignments || [],
            rotationHistory: parsed.rotationHistory || [],
            antiRepetitionConfig: parsed.antiRepetitionConfig || DEFAULT_ANTI_REPETITION_CONFIG,
          });
          localStorage.setItem(STORAGE_KEY, serialized);
          lastSavedStateRef.current = serialized;
          // Navigate to clean URL (triggers fresh load from localStorage)
          const cleanUrl = window.location.origin + window.location.pathname + window.location.search;
          window.location.href = cleanUrl;
          return;
        }
      }

      // Load from localStorage
      const cached = localStorage.getItem(STORAGE_KEY);
      console.log('[loadData] localStorage cached:', cached ? 'found' : 'NOT FOUND');
      if (cached) {
        const parsed = JSON.parse(cached) as AppData;
        console.log('[loadData] Parsed rotationHistory:', parsed.rotationHistory?.length || 0, 'items');
        if (parsed.classTitle) setClassTitle(parsed.classTitle);
        if (parsed.roles) setRoles(parsed.roles);
        if (parsed.students) setStudents(parsed.students);
        if (parsed.assignments) {
          setAssignments(parsed.assignments);
        } else {
          // Ensure assignments exist for all students
          setAssignments(ensureAssignments(parsed.students || [], parsed.roles || [], []));
        }
        // Load history and anti-repetition config
        if (parsed.rotationHistory) {
          console.log('[loadData] Setting rotationHistory state:', parsed.rotationHistory.length);
          setRotationHistory(parsed.rotationHistory);
        }
        if (parsed.antiRepetitionConfig) setAntiRepetitionConfig(parsed.antiRepetitionConfig);
        lastSavedStateRef.current = cached;
        setLastSavedAt(new Date());
        setHasLoaded(true);
        return;
      }

      // First visit - start with clean slate
      lastSavedStateRef.current = JSON.stringify({
        classTitle: 'My Class',
        roles: EMPTY_ROLES,
        students: EMPTY_STUDENTS,
        assignments: EMPTY_ASSIGNMENTS,
      });
      setHasLoaded(true);
    } catch (e) {
      console.error('Failed to load data:', e);
      // Fallback to clean slate
      lastSavedStateRef.current = JSON.stringify({
        classTitle: 'My Class',
        roles: EMPTY_ROLES,
        students: EMPTY_STUDENTS,
        assignments: EMPTY_ASSIGNMENTS,
      });
      setHasLoaded(true);
    }
  }, [ensureAssignments]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Save to localStorage - accepts optional overrides to avoid stale closure
  const saveToDisk = useCallback(
    async (showToast = true, overrides?: { rotationHistory?: RotationSnapshot[]; antiRepetitionConfig?: AntiRepetitionConfig }) => {
      try {
        setIsSaving(true);
        const currentRotationHistory = overrides?.rotationHistory ?? rotationHistory;
        const currentAntiRepetitionConfig = overrides?.antiRepetitionConfig ?? antiRepetitionConfig;
        const serialized = JSON.stringify({
          classTitle,
          roles,
          students,
          assignments,
          rotationHistory: currentRotationHistory,
          antiRepetitionConfig: currentAntiRepetitionConfig,
        });
        console.log('[saveToDisk] Saving to localStorage, rotationHistory:', currentRotationHistory.length, 'items');
        console.log('[saveToDisk] Serialized length:', serialized.length);
        lastSavedStateRef.current = serialized;

        localStorage.setItem(STORAGE_KEY, serialized);
        console.log('[saveToDisk] localStorage.setItem complete');

        setLastSavedAt(new Date());
        if (showToast) {
          setSaveMessage('Saved to browser');
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

  // Auto-save debounced only when data has genuinely changed
  useEffect(() => {
    if (!hasLoaded) return;

    const currentSerialized = JSON.stringify({ classTitle, roles, students, assignments, rotationHistory, antiRepetitionConfig });

    // Skip if state has not loaded yet or hasn't changed
    if (!lastSavedStateRef.current || currentSerialized === lastSavedStateRef.current) {
      console.log('[auto-save] No change detected, skipping');
      return;
    }

    console.log('[auto-save] Change detected, scheduling save...');
    const timer = setTimeout(() => {
      saveToDisk(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [classTitle, roles, students, assignments, rotationHistory, antiRepetitionConfig, saveToDisk, hasLoaded]);

  // Handle Updates
  const handleUpdateRoles = (newRoles: Role[]) => {
    setRoles(newRoles);
    // Ensure assignments exist for all students
    setAssignments(prev => ensureAssignments(students, newRoles, prev));
  };

  const handleUpdateStudents = (newStudents: Student[]) => {
    setStudents(newStudents);
    // Ensure assignments exist for all students
    setAssignments(prev => ensureAssignments(newStudents, roles, prev));
  };

  const handleUpdateAssignments = (newAssignments: Assignment[]) => {
    setAssignments(newAssignments);
  };

  // Generate optimal matches
  const handleGenerateMatches = () => {
    const newAssignments = generateAssignments(students, roles, assignments, {
      rotationHistory,
      antiRepetitionConfig,
    });
    setAssignments(newAssignments);
  };

  // Clear all assignments
  const handleClearAssignments = () => {
    const cleared = assignments.map(a => ({ ...a, roleId: null, isLocked: false }));
    setAssignments(cleared);
  };

  // Load default roles template
  const handleLoadDefaultRoles = () => {
    setRoles(DEFAULT_ROLES_TEMPLATE);
    setAssignments(prev => ensureAssignments(students, DEFAULT_ROLES_TEMPLATE, prev));
  };

  // Export data as JSON file
  const handleExportJson = () => {
    const data: AppData = { classTitle, roles, students, assignments, rotationHistory, antiRepetitionConfig };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const safeTitle = classTitle.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)/g, '');
    a.download = `${safeTitle || 'classroom'}-jobs-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setSaveMessage('Exported class file!');
    setTimeout(() => setSaveMessage(null), 2500);
  };

  // Import data from JSON file
  const handleImportJson = (file: File) => {
    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text) as AppData;

        if (parsed.classTitle) setClassTitle(parsed.classTitle);
        if (parsed.roles) setRoles(parsed.roles);
        if (parsed.students) setStudents(parsed.students);
        if (parsed.assignments) {
          setAssignments(parsed.assignments);
        } else {
          setAssignments(ensureAssignments(parsed.students || [], parsed.roles || [], []));
        }
        if (parsed.rotationHistory) setRotationHistory(parsed.rotationHistory);
        if (parsed.antiRepetitionConfig) setAntiRepetitionConfig(parsed.antiRepetitionConfig);
        setSaveMessage('Imported class file!');
        setTimeout(() => setSaveMessage(null), 2500);
      } catch {
        setSaveMessage('Failed to import - invalid file');
        setTimeout(() => setSaveMessage(null), 2500);
      }
    };
    reader.readAsText(file);
  };

  // Generate shareable URL
  const handleCopyShareLink = () => {
    const data: AppData = { classTitle, roles, students, assignments, rotationHistory, antiRepetitionConfig };
    const compressed = compressToEncodedURIComponent(JSON.stringify(data));
    const shareUrl = `${window.location.origin}${window.location.pathname}#data=${compressed}`;

    copyToClipboard(shareUrl).then((success) => {
      setSaveMessage(success ? 'Share link copied!' : 'Failed to copy link');
      setTimeout(() => setSaveMessage(null), 2500);
    });
  };

  // Finalize rotation - create snapshot and optionally clear board
  const handleFinalizeRotation = (name: string, notes: string, clearBoard: boolean) => {
    const now = new Date().toISOString();
    const roleMap = new Map(roles.map(r => [r.id, r]));
    const studentMap = new Map(students.map(s => [s.id, s]));

    // Create snapshot from current state
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

    // Add to history
    const newHistory = [...rotationHistory, snapshot];
    console.log('[handleFinalizeRotation] New history length:', newHistory.length);
    setRotationHistory(newHistory);

    // Optionally clear board
    if (clearBoard) {
      const cleared = assignments.map(a => ({ ...a, roleId: null, isLocked: false }));
      setAssignments(cleared);
      setSaveMessage(`Rotation "${name}" finalized! Board cleared for next cycle.`);
    } else {
      setSaveMessage(`Rotation "${name}" finalized! Current board kept as draft.`);
    }
    setTimeout(() => setSaveMessage(null), 3000);

    // Persist immediately so rotation history survives refresh
    // Pass newHistory to avoid stale closure
    console.log('[handleFinalizeRotation] Calling saveToDisk with new history...');
    saveToDisk(false, { rotationHistory: newHistory });
  };

  // Clear all data (reset to empty state)
  const handleClearAllData = () => {
    setClassTitle('My Class');
    setRoles(EMPTY_ROLES);
    setStudents(EMPTY_STUDENTS);
    setAssignments(EMPTY_ASSIGNMENTS);
    setRotationHistory([]);
    setAntiRepetitionConfig(DEFAULT_ANTI_REPETITION_CONFIG);
    localStorage.removeItem(STORAGE_KEY);
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

  const stats = calculateStatistics(students, roles, assignments);

  // Wrap onGenerateMatches with confetti
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
      />

      {/* Floating Save Toast */}
      {saveMessage && (
        <div className="fixed bottom-4 right-4 bg-slate-900 text-white text-xs px-3.5 py-2 rounded-xl shadow-lg flex items-center gap-2 z-50 animate-fade-in border border-slate-700">
          <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
          <span>{saveMessage}</span>
        </div>
      )}

      {/* Main Content Area */}
      <main className="max-w-[1400px] w-full mx-auto px-4 sm:px-6 lg:px-8 py-6 flex-1">
        {activeTab === 'board' && (
          <>
            {/* Full-width Header with Actions - Gradient Bar */}
            <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-2xl px-5 py-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-6">
              <div>
                <div className="flex items-center gap-2">
                  <span className="text-xl">🎯</span>
                  <h2 className="text-base sm:text-lg font-bold">Classroom Job Matching Board</h2>
                  <span className="text-xs bg-white/20 px-2 py-0.5 rounded-md font-normal hidden md:inline">
                    Drag students to swap, move, or unassign
                  </span>
                </div>
              </div>

              <div className="flex flex-wrap items-center gap-2">
                <button
                  type="button"
                  onClick={handleClearAssignments}
                  disabled={assignments.length === 0}
                  className="flex items-center gap-1 bg-white/10 hover:bg-white/20 text-white font-medium px-3 py-2 rounded-xl border border-white/20 transition-all text-xs disabled:opacity-40"
                  title="Clear all student assignments"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Clear
                </button>

                <button
                  type="button"
                  onClick={() => setShowFinalizeModal(true)}
                  disabled={assignments.length === 0}
                  className="flex items-center gap-1.5 bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-4 py-2 rounded-xl shadow-md transition-all text-xs disabled:opacity-50"
                  title="Archive current assignments and start next rotation"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Finalize Rotation 🔒
                </button>

                <button
                  type="button"
                  onClick={handleGenerateWithConfetti}
                  disabled={roles.length === 0 || students.length === 0}
                  className="flex items-center gap-1.5 bg-white hover:bg-blue-50 text-blue-700 font-extrabold px-4 py-2 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-xs disabled:opacity-50"
                >
                  <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                  ✨ Generate Optimal Matches
                </button>
              </div>
            </div>

            {/* Content Grid: Sidebar on left, Board on right */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              {/* Left Sidebar: Stats (1 col) */}
              <div className="lg:col-span-1">
                <StatsSidebar stats={stats} />
              </div>

              {/* Right Side: Board + Actions (3 cols) */}
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