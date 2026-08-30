import { useState, useEffect, useCallback, useRef } from 'react';
import { Student, Role, Assignment, AppData } from './types';
import { calculateStatistics, generateAssignments } from './engine/matcher';
import { Navbar, ActiveTab } from './components/Navbar';
import { StatsSidebar } from './components/StatsSidebar';
import { AssignmentBoard } from './components/AssignmentBoard';
import { StudentManager } from './components/StudentManager';
import { RoleManager } from './components/RoleManager';
import { PrintPoster } from './components/PrintPoster';
import { compressToEncodedURIComponent, decompressFromEncodedURIComponent } from 'lz-string';
import { Sparkles, RotateCcw } from 'lucide-react';
import confetti from 'canvas-confetti';

const STORAGE_KEY = 'classroom_role_assigner_data_v1';

// Clean initial state - empty for first-time users
const EMPTY_ROLES: Role[] = [];
const EMPTY_STUDENTS: Student[] = [];
const EMPTY_ASSIGNMENTS: Assignment[] = [];

// Default roles template (used when teacher wants to start with common classroom jobs)
const DEFAULT_ROLES_TEMPLATE: Role[] = [
  { id: 'role-line-leader', name: 'Line Leader', capacity: 2, description: 'Leads the class quietly in the hallway to specials, lunch, and recess.', icon: '🚶‍♂️', color: 'amber' },
  { id: 'role-door-holder', name: 'Door Holder', capacity: 1, description: 'Holds classroom and hallway doors open safely for the entire class.', icon: '🚪', color: 'blue' },
  { id: 'role-paper-passer', name: 'Paper & Materials Passer', capacity: 1, description: 'Hands out worksheets, notebooks, and art supplies to each desk cluster.', icon: '📄', color: 'emerald' },
  { id: 'role-tech-helper', name: 'Tech Specialist', capacity: 1, description: 'Manages Chromebook cart, plugs in chargers, and assists with projector.', icon: '💻', color: 'indigo' },
  { id: 'role-board-cleaner', name: 'Whiteboard Cleaner', capacity: 1, description: 'Erases the board at the end of lessons and organizes markers.', icon: '🧼', color: 'teal' },
  { id: 'role-library-helper', name: 'Classroom Librarian', capacity: 1, description: 'Organizes the reading corner by genre and checks book bins.', icon: '📚', color: 'purple' },
  { id: 'role-pencil-specialist', name: 'Pencil Sharpener & Supply Boss', capacity: 1, description: 'Sharpens dull pencils for the class community jar each morning.', icon: '✏️', color: 'orange' },
  { id: 'role-lunch-monitor', name: 'Lunch Cart Leader', capacity: 1, description: 'Inspects cafeteria table cleanliness and helps wipe down desks.', icon: '🍎', color: 'red' },
  { id: 'role-calendar-helper', name: 'Calendar & Morning Announcer', capacity: 1, description: 'Updates the daily date, weather tracker, and daily schedule board.', icon: '📅', color: 'sky' },
  { id: 'role-substitute-helper', name: 'Substitute & Teacher Assistant', capacity: 2, description: 'Guides visitors, takes attendance messages to the main office.', icon: '⭐', color: 'yellow' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState<ActiveTab>('board');
  const [classTitle, setClassTitle] = useState<string>('My Class');
  const [roles, setRoles] = useState<Role[]>(EMPTY_ROLES);
  const [students, setStudents] = useState<Student[]>(EMPTY_STUDENTS);
  const [assignments, setAssignments] = useState<Assignment[]>(EMPTY_ASSIGNMENTS);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSavedAt, setLastSavedAt] = useState<Date | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [hasLoaded, setHasLoaded] = useState(false);

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
      // Check URL hash first for share link
      const hash = window.location.hash.slice(1);
      if (hash.startsWith('data=')) {
        const compressed = hash.slice(5);
        const decompressed = decompressFromEncodedURIComponent(compressed);
        if (decompressed) {
          const parsed = JSON.parse(decompressed) as AppData;
          if (parsed.classTitle) setClassTitle(parsed.classTitle);
          if (parsed.roles) setRoles(parsed.roles);
          if (parsed.students) setStudents(parsed.students);
          if (parsed.assignments) setAssignments(parsed.assignments);
          // Persist to localStorage so it survives the reload
          const serialized = JSON.stringify({
            classTitle: parsed.classTitle,
            roles: parsed.roles,
            students: parsed.students,
            assignments: parsed.assignments,
          });
          lastSavedStateRef.current = serialized;
          localStorage.setItem(STORAGE_KEY, serialized);
          setLastSavedAt(new Date());
          setHasLoaded(true);
          // Clear the hash from URL and reload on next tick to let state apply
          window.history.replaceState(null, '', window.location.pathname + window.location.search);
          setTimeout(() => window.location.reload(), 0);
          return;
        }
      }

      // Load from localStorage
      const cached = localStorage.getItem(STORAGE_KEY);
      if (cached) {
        const parsed = JSON.parse(cached) as AppData;
        if (parsed.classTitle) setClassTitle(parsed.classTitle);
        if (parsed.roles) setRoles(parsed.roles);
        if (parsed.students) setStudents(parsed.students);
        if (parsed.assignments) {
          setAssignments(parsed.assignments);
        } else {
          // Ensure assignments exist for all students
          setAssignments(ensureAssignments(parsed.students || [], parsed.roles || [], []));
        }
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

  // Save to localStorage
  const saveToDisk = useCallback(
    async (showToast = true) => {
      try {
        setIsSaving(true);
        const serialized = JSON.stringify({
          classTitle,
          roles,
          students,
          assignments,
        });
        lastSavedStateRef.current = serialized;

        localStorage.setItem(STORAGE_KEY, serialized);

        setLastSavedAt(new Date());
        if (showToast) {
          setSaveMessage('Saved to browser');
          setTimeout(() => setSaveMessage(null), 2500);
        }
      } catch {
        setLastSavedAt(new Date());
        if (showToast) {
          setSaveMessage('Saved locally');
          setTimeout(() => setSaveMessage(null), 2500);
        }
      } finally {
        setIsSaving(false);
      }
    },
    [classTitle, roles, students, assignments]
  );

  // Auto-save debounced only when data has genuinely changed
  useEffect(() => {
    if (!hasLoaded) return;

    const currentSerialized = JSON.stringify({ classTitle, roles, students, assignments });

    // Skip if state has not loaded yet or hasn't changed
    if (!lastSavedStateRef.current || currentSerialized === lastSavedStateRef.current) {
      return;
    }

    const timer = setTimeout(() => {
      saveToDisk(false);
    }, 1000);

    return () => clearTimeout(timer);
  }, [classTitle, roles, students, assignments, saveToDisk, hasLoaded]);

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
    const newAssignments = generateAssignments(students, roles, assignments);
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
    const data: AppData = { classTitle, roles, students, assignments };
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
    const data: AppData = { classTitle, roles, students, assignments };
    const compressed = compressToEncodedURIComponent(JSON.stringify(data));
    const shareUrl = `${window.location.origin}${window.location.pathname}#data=${compressed}`;

    navigator.clipboard.writeText(shareUrl).then(() => {
      setSaveMessage('Share link copied!');
      setTimeout(() => setSaveMessage(null), 2500);
    }).catch(() => {
      setSaveMessage('Failed to copy link');
      setTimeout(() => setSaveMessage(null), 2500);
    });
  };

  // Clear all data (reset to empty state)
  const handleClearAllData = () => {
    setClassTitle('My Class');
    setRoles(EMPTY_ROLES);
    setStudents(EMPTY_STUDENTS);
    setAssignments(EMPTY_ASSIGNMENTS);
    localStorage.removeItem(STORAGE_KEY);
    lastSavedStateRef.current = JSON.stringify({
      classTitle: 'My Class',
      roles: EMPTY_ROLES,
      students: EMPTY_STUDENTS,
      assignments: EMPTY_ASSIGNMENTS,
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
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
            {/* Left Sidebar: Stats (1 col) */}
            <div className="lg:col-span-1">
              <StatsSidebar stats={stats} />
            </div>

            {/* Right Side: Board + Actions (3 cols) */}
            <div className="lg:col-span-3">
              {/* Board Header with Actions - Full Width Gradient Bar */}
              <div className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 text-white rounded-2xl px-5 py-4 shadow-sm flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 mb-4">
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
                    onClick={handleGenerateWithConfetti}
                    disabled={roles.length === 0 || students.length === 0}
                    className="flex items-center gap-1.5 bg-white hover:bg-blue-50 text-blue-700 font-extrabold px-4 py-2 rounded-xl shadow-md transition-all transform hover:-translate-y-0.5 active:translate-y-0 text-xs disabled:opacity-50"
                  >
                    <Sparkles className="w-3.5 h-3.5 text-amber-500 animate-pulse" />
                    ✨ Generate Optimal Matches
                  </button>
                </div>
              </div>

              <AssignmentBoard
                students={students}
                roles={roles}
                assignments={assignments}
                onUpdateAssignments={handleUpdateAssignments}
              />
            </div>
          </div>
        )}

        {activeTab === 'students' && (
          <StudentManager
            students={students}
            roles={roles}
            onUpdateStudents={handleUpdateStudents}
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
      </main>
    </div>
  );
}