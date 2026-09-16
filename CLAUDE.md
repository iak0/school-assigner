# Classroom Role Assigner (4th Grade)

A user-friendly, responsive web application designed for elementary school teachers to match students (~30 students) to classroom jobs/roles (~24 slots) based on their top 5 ranked preferences, role capacities, teacher adjustment scores (-3 to +3), and teacher locks/overrides.

**Deployed as a static site to GitHub Pages** — no backend required. All data persists in browser `localStorage` with export/import/share-link sync for multi-device workflows.

---

## 🚀 Quick Start & Commands

```bash
# Install dependencies
npm install

# Start dev server (available on LAN via host)
npm run dev

# Run unit tests (Vitest: matcher engine + App integration)
npm test

# Build for production (outputs to dist/)
npm run build

# Preview production build locally
npm run preview
```

### 📱 Local Network (LAN) Access
The app is configured to listen on `0.0.0.0`. When running `npm run dev`, Vite prints both the local URL and your network IP:
- **Local**: `http://localhost:5173`
- **Network**: `http://192.168.x.x:5173` (Open on any iPad, phone, or laptop on the same Wi-Fi)

### 🧪 Testing
**Run tests after implementing any major new feature** to ensure nothing regresses:

```bash
npm test
```

The test suite covers:
- **Matcher engine** (7 tests): Min-Cost Max-Flow algorithm correctness, preference scoring, adjustment weights, lock enforcement, standby pool, random tiebreaker for equal utilities, rotation history
- **App integration** (16 tests): class title persistence, export/import JSON, share link generation, clear all data, URL hash sync, matching board integration, lz-string compression round-trip, rotation history persistence

---

## 🧠 Architecture & Matching Algorithm

### 1. Algorithm: Minimum Cost Maximum Flow (Bipartite Assignment)
The matching engine is implemented in [`src/engine/matcher.ts`](file:///Users/kai/code/school/assigner/src/engine/matcher.ts) using a Successive Shortest Path (SPFA) flow network:

- **Nodes**: Source $\rightarrow$ Student Nodes $\rightarrow$ Role Slot Nodes $\rightarrow$ Sink.
- **Role Capacities**: Roles with multiple openings (e.g. 2 Line Leaders, 3 Librarians) are expanded into individual slot nodes.
- **Preference Curve**:
  - **1st Choice**: 100 points
  - **2nd Choice**: 70 points
  - **3rd Choice**: 45 points
  - **4th Choice**: 25 points
  - **5th Choice**: 10 points
  - **Unranked / Unassigned**: 0 points
- **Teacher Adjustment Score Modifiers (-3 to +3)**:
  - **+3**: +45 points (decisive boost, can lift a lower-ranked choice or win heavy contention)
  - **+2**: +25 points (strong boost)
  - **+1**: +10 points (gentle tiebreaker)
  - **0**: 0 points (neutral)
  - **-1**: -10 points (needs work)
  - **-2**: -25 points (weak)
  - **-3**: -45 points (missing)
- **Objective Function**:
  $$\text{Utility}(s, r) = \text{RankScore}(s, r) + \text{AdjustmentWeight}(s.\text{applicationScore})$$
  $$\text{Cost}(s, r) = \text{MAX\_POSSIBLE\_WEIGHT} - \text{Utility}(s, r)$$
- **Random Tiebreaker**: Tiny random epsilon (0.0001) added to edge costs to avoid deterministic assignment when multiple student-role pairs have identical utility (e.g., when no preferences are set). This is far smaller than the minimum meaningful utility difference (10 points).
- **Hard Lock Enforcement (🔒)**: Locked students bypass the flow graph and are fixed to their designated role before unassigned slots are solved for the remaining students.
- **Standby Reserve Pool**: When student count ($~30$) exceeds total available slots ($~24$), unassigned students are cleanly placed in the Standby Reserve pool.

### 2. Optimality Metric: Theoretical Maximum Without Locks
The **% of Optimality** metric shows how close the current assignment is to the theoretical best possible outcome:
- **Theoretical Optimum**: Runs the same Min-Cost Max-Flow algorithm on the same students/roles/preferences/adjustment scores, but **ignores all locked assignments and manual moves**.
- **Formula**: `optimalityPercentage = (currentRawUtilityScore / theoreticalOptimalScore) × 100`
- This lets teachers see if their manual adjustments (locks, swaps) are improving or reducing overall optimality.
- The theoretical optimum is recalculated live as preferences/scores change, independent of current locks.

---

## 🖥️ User Interface & Features

### 1. Matching Board ([`src/components/AssignmentBoard.tsx`](file:///Users/kai/code/school/assigner/src/components/AssignmentBoard.tsx))
- **✨ Generate Optimal Matches**: Solves the assignment model with celebratory confetti.
- **🔄 Flicker-Free Drag & Drop**:
  - Drag student onto another student to **swap** assignments.
  - Drag student onto dashed `➕ Drop student here` open slot to **assign**.
  - Drag student to the Standby Bank to **unassign**.
  - Drag student from Standby Bank into any job slot or onto another student to replace.
- **🔒 Pinning & Locks**: Lock individual assignments so they remain untouched during recalculation/regeneration.
- **🧹 Clear Assignments**: Reset all assignments back to the Standby pool.
- **🎒 Sticky Standby Sidebar**: Positioned on the right with an instant search filter so all cards and bins fit on a single screen without vertical scrolling.
- **Uses shared hooks/components**: `useStudentHistory` for job history, `CompactPreferencePill` for preference display.

### 2. Live Stats Sidebar ([`src/components/StatsSidebar.tsx`](file:///Users/kai/code/school/assigner/src/components/StatsSidebar.tsx))
- **Vertical metric cards** (1-column layout): Slots Filled → #1 Choice → Top 3 Choices → Avg Rank → % of Optimality → Score
- **% of Optimality**: Current raw utility score ÷ theoretical maximum (same rankings/scores, no locks/manual moves) — includes info tooltip explaining the metric
- **Top 3 Choices**: Shows count and percentage of students assigned to their 1st, 2nd, or 3rd choice
- **Raw Utility Score**: Subtle gray card (HelpCircle icon) with formula tooltip; same visual weight as other metrics (no longer monospace)
- **Rank Distribution**: Single-row horizontal pills (e.g., "1st 12, 2nd 8, 3rd 5") with hidden horizontal scroll
- **Built with shared components**: `MetricCard` (6 metric cards) and `RankPill` (rank distribution row)
- Removed: "Satisfaction Index", "% with Top 2 Choices"

### 3. Student Roster & Preferences ([`src/components/StudentManager.tsx`](file:///Users/kai/code/school/assigner/src/components/StudentManager.tsx))
- Roster management for ~30 students.
- Top 5 ranked choice selectors with duplicate prevention.
- -3 to +3 teacher adjustment rating selector with color-coded badges (renamed from "Letter Rating" to "Adjustment").
- Bulk roster importer for pasting names directly from spreadsheets or class lists (adds students with neutral adjustment and empty preferences).
- **Inline edit form**: Clicking "Edit" on a student opens a form directly in the table row below that student, with smooth scroll into view.
- **Inline add form**: "Add Student" shows a blank form at the top of the table (does not prefill any preferences).
- **Refactored to use shared components**: `StudentForm` (add/edit form), `PreferenceList` (preference display), `useStudentHistory` hook.

### 4. Job & Capacity Manager ([`src/components/RoleManager.tsx`](file:///Users/kai/code/school/assigner/src/components/RoleManager.tsx))
- Configure job titles, slot capacities (1, 2, 3+ slots), and descriptions.
- **Custom Emoji Input**: Single-character emoji text box supporting any native emoji with shortcut hint (**`⌘+Ctrl+Space`** on Mac / **`Win+.`** on Windows) plus quick-click school emoji shortcuts.
- **Inline Edit & Add Forms**: Clicking "Edit" on a job replaces that job's card with a compact edit form (same size/layout as the card). "Add New Job" shows an inline form at the top of the grid. No more scrolling to a fixed editor at the top of the screen.
- **Refactored to use shared component**: `RoleForm` (add/edit form).

### 5. Printable Poster & Export ([`src/components/PrintPoster.tsx`](file:///Users/kai/code/school/assigner/src/components/PrintPoster.tsx))
- "Our Classroom Leaders & Helpers 🎒" chart styled for 4th-grade classroom walls.
- **Compact layout** optimized for 1-2 printed pages: 5-column grid on desktop, tighter spacing, smaller text, smaller emoji (text-lg), no helper count row.
- Formatted for single-click browser printing (`@media print`) and PDF export.
- **Dynamic class title** from editable header field.
- JSON backup export and quick text summary copy.

### 6. Settings & Data Sync (Navbar Dropdown)
- **📤 Export Class File (.json)**: Downloads complete state (classTitle, roles, students, assignments) with timestamped filename.
- **📥 Import Class File (.json)**: Restores full state from exported file.
- **🔗 Copy Share / Sync Link**: Generates compressed URL (`#data=<lz-string>`) for instant multi-device sync.
- **💾 Save Now**: Manual trigger for immediate localStorage persistence.
- **🗑️ Clear All Data (Reset)**: Confirmation dialog, wipes localStorage and returns to clean slate.

### 7. Editable Class Title
- Clickable badge next to app logo (replaces hardcoded "Grade 4").
- Defaults to **"My Class"** on first visit.
- Inline edit on click: Enter to save, Escape to cancel, blur to save.
- Persisted in localStorage and included in export/import/share links.

### 8. Shared Architecture (Refactored)
The codebase has been refactored for maintainability with shared utilities, hooks, and components:

**Shared Components:**
- **`StudentForm`** — Unified add/edit form for students (used by StudentManager for both inline add and edit)
- **`RoleForm`** — Unified add/edit form for roles (used by RoleManager for both inline add and edit)
- **`MetricCard`** — Reusable metric display with icon, value, label, sub-label, and optional tooltip (6 instances in StatsSidebar)
- **`RankPill`** — Reusable rank indicator pill with preset configs for 1st-5th + Unranked (used by StatsSidebar)
- **`PreferencePill` / `CompactPreferencePill` / `PreferenceList`** — Unified preference display (used by StudentManager, AssignmentBoard)

**Shared Hooks:**
- **`useStudentHistory`** — Provides `getStudentHistory(studentId)` and `getRecentRoleRepeat(studentId, roleId)` from rotation history (used by StudentManager, AssignmentBoard, StatsSidebar)

**Shared Utilities:**
- **`clipboard.ts`** — `copyToClipboard(text)` with modern Clipboard API + `execCommand` fallback for ChromeOS/non-secure contexts
- **`rankColors.ts`** — Centralized rank color configs (bg, border, text, pill variants) for 1st-5th choices + unranked

---

## 📁 Data Persistence & File Structure

**No backend required** — pure client-side with localStorage persistence and file-based import/export.

```text
src/
├── types/index.ts             # TypeScript data models and interfaces (AppData includes classTitle)
├── engine/
│   ├── matcher.ts             # Min-Cost Max-Flow algorithm & utility evaluator
│   └── matcher.test.ts        # Vitest unit test suite (7 tests)
├── components/
│   ├── Navbar.tsx             # Tab header, Settings dropdown, EditableClassTitle
│   ├── StatsSidebar.tsx       # Vertical metrics, % optimality, rank pills (1-col)
│   ├── AssignmentBoard.tsx    # Interactive board with drag & drop and sticky standby dock
│   ├── StudentManager.tsx     # Student roster, top 5 choice ranking, letter score pills
│   ├── RoleManager.tsx        # Job definitions, capacities, custom emoji input
│   ├── PrintPoster.tsx        # Printable classroom poster and JSON exporter
│   ├── StudentForm.tsx        # Shared add/edit form for students (extracted from StudentManager)
│   ├── RoleForm.tsx           # Shared add/edit form for roles (extracted from RoleManager)
│   ├── MetricCard.tsx         # Reusable metric display card with tooltip (used by StatsSidebar)
│   ├── RankPill.tsx           # Reusable rank pill component with presets (used by StatsSidebar, StudentManager)
│   ├── PreferencePill.tsx     # Shared preference display pills (PreferencePill, CompactPreferencePill, PreferenceList)
│   ├── AntiRepetitionSettingsModal.tsx  # Anti-repetition settings modal
│   ├── FinalizeRotationModal.tsx         # Finalize rotation modal
│   └── RotationHistory.tsx    # Rotation history display
├── hooks/
│   └── useStudentHistory.ts   # Shared hook for student job history (getStudentHistory, getRecentRoleRepeat)
├── utils/
│   ├── clipboard.ts           # Copy to clipboard with Clipboard API + execCommand fallback (ChromeOS)
│   └── rankColors.ts          # Shared rank color configurations (1st-5th + unranked)
├── App.tsx                    # Main state management, localStorage auto-save, export/import/share
├── main.tsx                   # App entry point
└── test-setup.ts              # Vitest jsdom mocks (localStorage, clipboard, URL, etc.)
```

### Auto-Save & Synchronization
- **Change Detection**: Serialized state diffs ensure auto-save only triggers when `classTitle`, `roles`, `students`, or `assignments` genuinely change.
- **Debounced Persistence**: 1-second debounce batches rapid changes (drag operations, typing).
- **localStorage Key**: `classroom_role_assigner_data_v1` — survives browser restarts, works offline.
- **Dual Safety**: `localStorage` primary; export/import JSON files for backup/migration.

### Shareable URLs (lz-string Compression)
- Full state compressed to URL hash: `https://your.github.io/assigner/#data=<compressed>`
- Typical payload (~4KB JSON) compresses to <2KB URL — well within browser limits.
- Open on any device to instantly sync class data without file transfer.

---

## 🌐 GitHub Pages Deployment

Automated via GitHub Actions (`.github/workflows/deploy.yml`):
1. Push to `main` triggers build
2. `npm run build` outputs to `dist/` with relative asset paths (`base: './'`)
3. Deploys `dist/` to `gh-pages` branch
4. Site available at `https://<username>.github.io/<repo>/`

### Vite Config for GitHub Pages
```typescript
// vite.config.ts
export default defineConfig({
  base: './',  // Critical: relative paths for GitHub Pages subdirectory hosting
  // ...
})
```

---

## 🔧 Development Notes

### Clean Slate Guarantee
First-time visitors see **empty state**: no dummy students, no dummy jobs. Teachers build their class from scratch or use "Load Default Jobs" template.

### Default Roles Template (Ms. Yi's Classroom)
The "Load Default Jobs" button populates 21 roles (24 total slots) based on Ms. Yi's 4th grade classroom:
- **Line Leader** (2), **Door Monitor** (1), **Attendance Monitor** (1), **Paper Passer** (2)
- **Class Nurse** (1), **Technology Assistant** (2), **Librarian** (1), **Trash Collector** (1)
- **Patriotic Leader** (1), **Pencil Monitor** (1), **Desk Inspector** (1), **Bin & Cubby Inspector** (1)
- **Energy Monitor** (1), **Chair Inspector** (1), **Supply Manager** (1), **Receptionist** (1)
- **Substitute** (1), **Lunch Cart Leader** (1), **Agenda Agent** (1), **Mailbox Monitor** (1)
- **Homework Monitor** (1)

### Key Dependencies
- `lz-string` — URL-safe compression for share links
- `lucide-react` — Consistent icon set
- `react-dnd` — Drag & drop (HTML5 backend)
- `vitest` + `@testing-library/react` — Unit/integration tests

### Browser Support
Modern browsers with `localStorage`, `Clipboard API`, `URL.createObjectURL`. Tested on Chrome, Firefox, Safari, Edge (desktop + mobile).