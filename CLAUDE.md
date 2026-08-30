# Classroom Role Assigner (4th Grade)

A user-friendly, responsive web application designed for elementary school teachers to match students (~30 students) to classroom jobs/roles (~20 slots) based on their top 5 ranked preferences, role capacities, application letter score adjustments (-3 to +3), and teacher locks/overrides.

---

## 🚀 Quick Start & Commands

```bash
# Install dependencies
npm install

# Start both frontend & backend concurrently (available on LAN via host)
npm run dev

# Run unit tests (Vitest matching algorithm test suite)
npm test

# Build for production
npm run build

# Run frontend or backend individually
npm run client     # Vite dev server on http://0.0.0.0:5173
npm run server     # Express API server on http://0.0.0.0:3001
```

### 📱 Local Network (LAN) Access
The app is configured to listen on `0.0.0.0`. When running `npm run dev`, Vite prints both the local URL and your network IP:
- **Local**: `http://localhost:5173`
- **Network**: `http://192.168.x.x:5173` (Open on any iPad, phone, or laptop on the same Wi-Fi)

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
- **Teacher Application Letter Score Modifiers (-3 to +3)**:
  - **+3**: +45 points (decisive boost, can lift a lower-ranked choice or win heavy contention)
  - **+2**: +25 points (strong boost)
  - **+1**: +10 points (gentle tiebreaker)
  - **0**: 0 points (neutral)
  - **-1**: -10 points (fair)
  - **-2**: -25 points (incomplete)
  - **-3**: -45 points (missing / poor)
- **Objective Function**:
  $$\text{Utility}(s, r) = \text{RankScore}(s, r) + \text{LetterWeight}(s.\text{applicationScore})$$
  $$\text{Cost}(s, r) = \text{MAX\_POSSIBLE\_WEIGHT} - \text{Utility}(s, r)$$
- **Hard Lock Enforcement (🔒)**: Locked students bypass the flow graph and are fixed to their designated role before unassigned slots are solved for the remaining students.
- **Standby Reserve Pool**: When student count ($~30$) exceeds total available slots ($~20$), unassigned students are cleanly placed in the Standby Reserve pool.

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

### 2. Live Stats & Subtle Raw Score ([`src/components/StatsSummary.tsx`](file:///Users/kai/code/school/assigner/src/components/StatsSummary.tsx))
- Displays overall satisfaction %, % of students who received top 2 choices, average choice rank, and rank distribution pills.
- **Raw Utility Score Indicator**: Rendered in subtle, unemphasized text (e.g. `Raw Utility Score: 1,845 pts`) with a formula popup, updating in real time as the teacher drags or locks assignments.

### 3. Student Roster & Preferences ([`src/components/StudentManager.tsx`](file:///Users/kai/code/school/assigner/src/components/StudentManager.tsx))
- Roster management for ~30 students.
- Top 5 ranked choice selectors with duplicate prevention.
- -3 to +3 letter score rating selector with color-coded badges.
- Bulk roster importer for pasting names directly from spreadsheets or class lists.

### 4. Job & Capacity Manager ([`src/components/RoleManager.tsx`](file:///Users/kai/code/school/assigner/src/components/RoleManager.tsx))
- Configure job titles, slot capacities (1, 2, 3+ slots), and descriptions.
- **Custom Emoji Input**: Single-character emoji text box supporting any native emoji with shortcut hint (**`⌘+Ctrl+Space`** on Mac / **`Win+.`** on Windows) plus quick-click school emoji shortcuts.

### 5. Printable Poster & Export ([`src/components/PrintPoster.tsx`](file:///Users/kai/code/school/assigner/src/components/PrintPoster.tsx))
- "Our Classroom Leaders & Helpers 🎒" chart styled for 4th-grade classroom walls.
- Formatted for single-click browser printing (`@media print`) and PDF export.
- JSON backup export and quick text summary copy.

---

## 📁 Data Persistence & File Structure

Data is automatically persisted to local JSON files on disk via the Express backend:

```text
data/
├── roles.json        # Classroom job definitions, capacities, icons
├── students.json     # Student roster, top 5 preferences, letter scores
└── assignments.json  # Current assignment state (student ID -> role ID, lock status)

src/
├── types/index.ts             # TypeScript data models and interfaces
├── engine/
│   ├── matcher.ts             # Min-Cost Max-Flow algorithm & utility evaluator
│   └── matcher.test.ts        # Vitest unit test suite
├── components/
│   ├── Navbar.tsx             # Tab header, save status, disk save button
│   ├── StatsSummary.tsx       # Happiness index, rank breakdown, raw utility score
│   ├── AssignmentBoard.tsx    # Interactive board with drag & drop and sticky standby dock
│   ├── StudentManager.tsx     # Student roster, top 5 choice ranking, letter score pills
│   ├── RoleManager.tsx        # Job definitions, capacities, custom emoji input
│   └── PrintPoster.tsx        # Printable classroom poster and JSON exporter
├── App.tsx                    # Main state management, auto-save with diff detection
└── main.tsx                   # App entry point

server/
└── index.ts                   # Express REST API (GET /api/data, POST /api/save) on port 3001
```

### Auto-Save & Synchronization
- **Change Detection**: Serialized state diffs ensure auto-save only triggers when `roles`, `students`, or `assignments` genuinely change.
- **Dual Persistence**: Saves to disk via `POST /api/save` and mirrors to browser `localStorage` as an offline safety backup.