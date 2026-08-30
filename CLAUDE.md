# Classroom Role Assigner (4th Grade)

A user-friendly, responsive web application designed for elementary school teachers to match students (~30 students) to classroom jobs/roles (~20 slots) based on their top 5 ranked preferences, role capacities, teacher adjustment scores (-3 to +3), and teacher locks/overrides.

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
- **Matcher engine** (5 tests): Min-Cost Max-Flow algorithm correctness, preference scoring, letter weights, lock enforcement, standby pool
- **App integration** (14 tests): class title persistence, export/import JSON, share link generation, clear all data, URL hash sync, matching board integration, lz-string compression round-trip

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
- **Hard Lock Enforcement (🔒)**: Locked students bypass the flow graph and are fixed to their designated role before unassigned slots are solved for the remaining students.
- **Standby Reserve Pool**: When student count ($~30$) exceeds total available slots ($~20$), unassigned students are cleanly placed in the Standby Reserve pool.

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

### 2. Live Stats Sidebar ([`src/components/StatsSidebar.tsx`](file:///Users/kai/code/school/assigner/src/components/StatsSidebar.tsx))
- **Vertical metric cards** (1-column layout): Slots Filled → #1 Choice → Avg Rank → % of Optimality → Score
- **% of Optimality**: Current raw utility score ÷ theoretical maximum (same rankings/scores, no locks/manual moves)
- **Raw Utility Score**: Subtle gray card (HelpCircle icon) with formula tooltip; same visual weight as other metrics
- **Rank Distribution**: Single-row horizontal pills (e.g., "1st 12, 2nd 8, 3rd 5") with hidden horizontal scroll
- Removed: "Satisfaction Index", "% with Top 2 Choices"

### 3. Student Roster & Preferences ([`src/components/StudentManager.tsx`](file:///Users/kai/code/school/assigner/src/components/StudentManager.tsx))
- Roster management for ~30 students.
- Top 5 ranked choice selectors with duplicate prevention.
- -3 to +3 teacher adjustment rating selector with color-coded badges.
- Bulk roster importer for pasting names directly from spreadsheets or class lists.

### 4. Job & Capacity Manager ([`src/components/RoleManager.tsx`](file:///Users/kai/code/school/assigner/src/components/RoleManager.tsx))
- Configure job titles, slot capacities (1, 2, 3+ slots), and descriptions.
- **Custom Emoji Input**: Single-character emoji text box supporting any native emoji with shortcut hint (**`⌘+Ctrl+Space`** on Mac / **`Win+.`** on Windows) plus quick-click school emoji shortcuts.

### 5. Printable Poster & Export ([`src/components/PrintPoster.tsx`](file:///Users/kai/code/school/assigner/src/components/PrintPoster.tsx))
- "Our Classroom Leaders & Helpers 🎒" chart styled for 4th-grade classroom walls.
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

---

## 📁 Data Persistence & File Structure

**No backend required** — pure client-side with localStorage persistence and file-based import/export.

```text
src/
├── types/index.ts             # TypeScript data models and interfaces (AppData includes classTitle)
├── engine/
│   ├── matcher.ts             # Min-Cost Max-Flow algorithm & utility evaluator
│   └── matcher.test.ts        # Vitest unit test suite (5 tests)
├── components/
│   ├── Navbar.tsx             # Tab header, Settings dropdown, EditableClassTitle
│   ├── StatsSidebar.tsx       # Vertical metrics, % optimality, rank pills (1-col)
│   ├── AssignmentBoard.tsx    # Interactive board with drag & drop and sticky standby dock
│   ├── StudentManager.tsx     # Student roster, top 5 choice ranking, letter score pills
│   ├── RoleManager.tsx        # Job definitions, capacities, custom emoji input
│   └── PrintPoster.tsx        # Printable classroom poster and JSON exporter
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

### Key Dependencies
- `lz-string` — URL-safe compression for share links
- `lucide-react` — Consistent icon set
- `react-dnd` — Drag & drop (HTML5 backend)
- `vitest` + `@testing-library/react` — Unit/integration tests

### Browser Support
Modern browsers with `localStorage`, `Clipboard API`, `URL.createObjectURL`. Tested on Chrome, Firefox, Safari, Edge (desktop + mobile).