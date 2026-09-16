import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { AssignmentBoard } from './AssignmentBoard';
import { Student, Role, Assignment, RotationSnapshot } from '../types';

const sampleRoles: Role[] = [
  { id: 'r1', name: 'Line Leader', capacity: 2, icon: '🚶' },
  { id: 'r2', name: 'Door Monitor', capacity: 1, icon: '🚪' },
  { id: 'r3', name: 'Paper Passer', capacity: 1, icon: '📄' },
  { id: 'r4', name: 'Tech Assistant', capacity: 1, icon: '💻' },
  { id: 'r5', name: 'Librarian', capacity: 1, icon: '📚' },
];

const sampleStudents: Student[] = [
  {
    id: 's1',
    name: 'Alice',
    preferences: ['r1', 'r2', 'r3'],
    applicationScore: 1,
    notes: 'Great leader',
  },
  {
    id: 's2',
    name: 'Bob',
    preferences: ['r4'],
    applicationScore: 0,
  },
  {
    id: 's3',
    name: 'Charlie',
    preferences: [],
    applicationScore: -1,
  },
];

const sampleAssignments: Assignment[] = [
  { studentId: 's1', roleId: 'r1', isLocked: false },
  { studentId: 's2', roleId: 'r2', isLocked: true },
];

const sampleRotationHistory: RotationSnapshot[] = [
  {
    id: 'rot-1',
    name: 'Fall Rotation',
    date: '2025-09-15',
    assignments: [
      { studentId: 's1', studentName: 'Alice', roleId: 'r2', roleName: 'Door Monitor' },
      { studentId: 's2', studentName: 'Bob', roleId: 'r3', roleName: 'Paper Passer' },
    ],
    notes: '',
    createdAt: '2025-09-15T10:00:00.000Z',
  },
  {
    id: 'rot-2',
    name: 'Winter Rotation',
    date: '2026-01-15',
    assignments: [
      { studentId: 's1', studentName: 'Alice', roleId: 'r3', roleName: 'Paper Passer' },
      { studentId: 's3', studentName: 'Charlie', roleId: 'r5', roleName: 'Librarian' },
    ],
    notes: '',
    createdAt: '2026-01-15T10:00:00.000Z',
  },
];

const defaultProps = {
  students: sampleStudents,
  roles: sampleRoles,
  assignments: sampleAssignments,
  onUpdateAssignments: vi.fn(),
  onFinalizeRotation: vi.fn(),
  rotationHistoryLength: sampleRotationHistory.length,
  antiRepetitionConfig: { recencyWindow: 2, avoidanceStrictness: 'balanced' as const, standbyPriority: false },
  onUpdateAntiRepetitionConfig: vi.fn(),
  rotationHistory: sampleRotationHistory,
};

beforeAll(() => {
  // Mock matchMedia for responsive design
  vi.spyOn(window, 'matchMedia').mockImplementation((query) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  }));
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe('AssignmentBoard Tooltip', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  function getTooltip(card: HTMLElement) {
    // The tooltip is a child of the card with absolute positioning and bg-slate-900
    return card.querySelector('div.bg-slate-900') as HTMLElement;
  }

  it('shows job history in tooltip when hovering student card', async () => {
    render(<AssignmentBoard {...defaultProps} />);

    // Find Alice's student card (she has job history)
    const aliceCard = screen.getByText('Alice').closest('div[draggable="true"]');
    expect(aliceCard).toBeInTheDocument();

    // Hover over the card to trigger tooltip
    fireEvent.mouseEnter(aliceCard!);

    // Wait for tooltip to appear
    await waitFor(() => {
      const tooltip = getTooltip(aliceCard!);
      expect(tooltip).toBeInTheDocument();
      expect(tooltip!.textContent).toContain('Previous Jobs');
    });

    // Should show Alice's 2 previous job names in tooltip
    const tooltip = getTooltip(aliceCard!);
    expect(tooltip!.textContent).toContain('Door Monitor');
    expect(tooltip!.textContent).toContain('Paper Passer');
  });

  it('shows "No previous jobs" for student without history', async () => {
    // Create props with a student who has no rotation history
    const propsWithUnassigned = {
      ...defaultProps,
      assignments: [
        { studentId: 's1', roleId: 'r1', isLocked: false },
        { studentId: 's2', roleId: 'r2', isLocked: true },
      ],
      students: [
        { id: 's1', name: 'Alice', preferences: ['r1', 'r2', 'r3'], applicationScore: 1 },
        { id: 's2', name: 'Bob', preferences: ['r4'], applicationScore: 0 },
        { id: 's3', name: 'Charlie', preferences: [], applicationScore: -1 },
        { id: 's4', name: 'Diana', preferences: ['r1'], applicationScore: 0 },
      ],
    };
    render(<AssignmentBoard {...propsWithUnassigned} />);

    // Find Diana's student card (she has no rotation history)
    const standbyColumn = screen.getByTestId('standby-column');
    const dianaCard = within(standbyColumn!).getByText('Diana').closest('div[draggable="true"]');
    expect(dianaCard).toBeInTheDocument();

    // Hover over the card
    fireEvent.mouseEnter(dianaCard!);

    // Wait for tooltip
    await waitFor(() => {
      const tooltip = getTooltip(dianaCard!);
      expect(tooltip).toBeInTheDocument();
      expect(tooltip!.textContent).toContain('Previous Jobs');
    });

    // Should show "No previous jobs"
    const tooltip = getTooltip(dianaCard!);
    expect(tooltip!.textContent).toContain('No previous jobs');
  });

  it('shows tooltip with job history for Bob when hovering his card', async () => {
    render(<AssignmentBoard {...defaultProps} />);

    // Bob has Paper Passer in rotation history
    const bobCard = screen.getByText('Bob').closest('div[draggable="true"]');
    expect(bobCard).toBeInTheDocument();

    // Hover over the card to trigger tooltip
    fireEvent.mouseEnter(bobCard!);

    // Wait for tooltip to appear
    await waitFor(() => {
      const tooltip = getTooltip(bobCard!);
      expect(tooltip).toBeInTheDocument();
      expect(tooltip!.textContent).toContain('Previous Jobs');
    });

    // Should show Bob's job history (Paper Passer)
    const tooltip = getTooltip(bobCard!);
    expect(tooltip!.textContent).toContain('Paper Passer');
  });
});

describe('AssignmentBoard Basic Rendering', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders all roles with capacities', () => {
    render(<AssignmentBoard {...defaultProps} />);

    // Use getByRole for headings to be more specific
    expect(screen.getByRole('heading', { name: 'Line Leader' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Door Monitor' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Paper Passer' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Tech Assistant' })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: 'Librarian' })).toBeInTheDocument();
  });

  it('renders assigned students in correct roles', () => {
    render(<AssignmentBoard {...defaultProps} />);

    // Alice assigned to Line Leader (r1)
    const lineLeaderHeader = screen.getByRole('heading', { name: 'Line Leader' });
    const lineLeaderColumn = lineLeaderHeader.closest('div.flex-col.justify-between');
    expect(within(lineLeaderColumn!).getByText('Alice')).toBeInTheDocument();

    // Bob assigned to Door Monitor (r2) - locked
    const doorMonitorHeader = screen.getByRole('heading', { name: 'Door Monitor' });
    const doorMonitorColumn = doorMonitorHeader.closest('div.flex-col.justify-between');
    expect(within(doorMonitorColumn!).getByText('Bob')).toBeInTheDocument();
  });

  it('shows lock icon for locked assignments', () => {
    render(<AssignmentBoard {...defaultProps} />);

    // Bob is locked to Door Monitor
    const doorMonitorHeader = screen.getByRole('heading', { name: 'Door Monitor' });
    const doorMonitorColumn = doorMonitorHeader.closest('div.flex-col.justify-between');
    const lockButton = within(doorMonitorColumn!).getByRole('button', { name: /unlock assignment/i });
    expect(lockButton).toBeInTheDocument();
    // Should show Lock icon (not Unlock)
    expect(lockButton.querySelector('svg')).toBeInTheDocument();
  });

  it('shows standby/reserve students', () => {
    render(<AssignmentBoard {...defaultProps} />);

    // Charlie is not assigned (standby)
    expect(screen.getByText(/Standby Reserve/)).toBeInTheDocument();
    const standbyColumn = screen.getByTestId('standby-column');
    const charlieCard = within(standbyColumn).getByText('Charlie').closest('div[draggable="true"]');
    expect(charlieCard).toBeInTheDocument();
  });
});

describe('AssignmentBoard Drag and Drop Stability', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('maintains stable hover over a student card without parent role flickering', () => {
    render(<AssignmentBoard {...defaultProps} />);

    const aliceCard = screen.getByText('Alice').closest('div[draggable="true"]')!;
    const lineLeaderHeader = screen.getByRole('heading', { name: 'Line Leader' });
    const lineLeaderCard = lineLeaderHeader.closest('div.flex-col.justify-between')!;
    const charlieCard = within(screen.getByTestId('standby-column')).getByText('Charlie').closest('div[draggable="true"]')!;

    // Drag Charlie from standby
    fireEvent.dragStart(charlieCard, {
      dataTransfer: { setData: vi.fn(), effectAllowed: 'move' }
    });

    // Fire dragOver multiple times on Alice's card
    for (let i = 0; i < 5; i++) {
      fireEvent.dragOver(aliceCard, {
        dataTransfer: { dropEffect: 'move' }
      });
      // Alice must stay highlighted as swap target
      expect(aliceCard.className).toContain('bg-indigo-100');
      expect(within(aliceCard).getByText(/Swap/i)).toBeInTheDocument();
      // Parent role card must NEVER be highlighted
      expect(lineLeaderCard.className).not.toContain('border-blue-500');
    }
  });

  it('maintains stable hover over an empty slot without role container flickering', () => {
    render(<AssignmentBoard {...defaultProps} />);

    const lineLeaderHeader = screen.getByRole('heading', { name: 'Line Leader' });
    const lineLeaderCard = lineLeaderHeader.closest('div.flex-col.justify-between')!;
    const emptySlot = within(lineLeaderCard).getByText(/Drop student here/i);
    const charlieCard = within(screen.getByTestId('standby-column')).getByText('Charlie').closest('div[draggable="true"]')!;

    fireEvent.dragStart(charlieCard, {
      dataTransfer: { setData: vi.fn(), effectAllowed: 'move' }
    });

    for (let i = 0; i < 5; i++) {
      fireEvent.dragOver(emptySlot, {
        dataTransfer: { dropEffect: 'move' }
      });
      // Slot must stay highlighted
      expect(emptySlot.className).toContain('border-blue-500');
      // Role card must NOT take over highlight
      expect(lineLeaderCard.className).not.toContain('border-blue-500 ring-2');
    }
  });

  it('maintains stable hover over a standby student without standby bank flickering', () => {
    render(<AssignmentBoard {...defaultProps} />);

    const aliceCard = screen.getByText('Alice').closest('div[draggable="true"]')!;
    const standbyBank = screen.getByTestId('standby-column').querySelector('div.bg-white')!;
    const charlieCard = within(screen.getByTestId('standby-column')).getByText('Charlie').closest('div[draggable="true"]')!;

    // Drag Alice from Line Leader
    fireEvent.dragStart(aliceCard, {
      dataTransfer: { setData: vi.fn(), effectAllowed: 'move' }
    });

    for (let i = 0; i < 5; i++) {
      fireEvent.dragOver(charlieCard, {
        dataTransfer: { dropEffect: 'move' }
      });
      // Charlie must stay highlighted as swap target
      expect(charlieCard.className).toContain('bg-indigo-100');
      expect(within(charlieCard).getByText(/Swap/i)).toBeInTheDocument();
      // Standby bank must NOT take over highlight
      expect(standbyBank.className).not.toContain('border-rose-400');
    }
  });

  it('does not highlight self when hovering over the card being dragged', () => {
    render(<AssignmentBoard {...defaultProps} />);

    const aliceCard = screen.getByText('Alice').closest('div[draggable="true"]')!;

    // Drag Alice
    fireEvent.dragStart(aliceCard, {
      dataTransfer: { setData: vi.fn(), effectAllowed: 'move' }
    });

    // Hover Alice over herself
    fireEvent.dragOver(aliceCard, {
      dataTransfer: { dropEffect: 'move' }
    });

    // Alice should be in dragging state, NOT swap hover state
    expect(aliceCard.className).toContain('opacity-40');
    expect(aliceCard.className).not.toContain('bg-indigo-100');
    expect(within(aliceCard).queryByText(/Swap/i)).not.toBeInTheDocument();
  });

  it('does not allow dropping on the role container when a role is full', () => {
    render(<AssignmentBoard {...defaultProps} />);

    // Door Monitor has capacity 1 and Bob is assigned (full)
    const doorMonitorHeader = screen.getByRole('heading', { name: 'Door Monitor' });
    const doorMonitorCard = doorMonitorHeader.closest('div.flex-col.justify-between')!;
    const charlieCard = within(screen.getByTestId('standby-column')).getByText('Charlie').closest('div[draggable="true"]')!;

    fireEvent.dragStart(charlieCard, {
      dataTransfer: { setData: vi.fn(), effectAllowed: 'move' }
    });

    // Hover over Door Monitor container
    fireEvent.dragOver(doorMonitorCard, {
      dataTransfer: { dropEffect: 'move' }
    });

    // Door Monitor card should NOT highlight
    expect(doorMonitorCard.className).not.toContain('border-blue-500');

    // Bob inside Door Monitor can still be swapped
    const bobCard = within(doorMonitorCard).getByText('Bob').closest('div[draggable="true"]')!;
    fireEvent.dragOver(bobCard, {
      dataTransfer: { dropEffect: 'move' }
    });
    expect(bobCard.className).toContain('bg-indigo-100');
    expect(within(bobCard).getByText(/Swap/i)).toBeInTheDocument();
  });

  it('successfully swaps two students on drop', () => {
    const onUpdateAssignments = vi.fn();
    render(<AssignmentBoard {...defaultProps} onUpdateAssignments={onUpdateAssignments} />);

    const aliceCard = screen.getByText('Alice').closest('div[draggable="true"]')!;
    const bobCard = screen.getByText('Bob').closest('div[draggable="true"]')!;

    // Drag Alice (in r1 Line Leader)
    fireEvent.dragStart(aliceCard, {
      dataTransfer: { setData: vi.fn(), effectAllowed: 'move' }
    });

    // Drop onto Bob (in r2 Door Monitor)
    fireEvent.drop(bobCard, {
      dataTransfer: {
        getData: vi.fn().mockReturnValue(JSON.stringify({ studentId: 's1', sourceRoleId: 'r1' }))
      }
    });

    expect(onUpdateAssignments).toHaveBeenCalledTimes(1);
    const updated = onUpdateAssignments.mock.calls[0][0] as Assignment[];
    const aliceAssigned = updated.find(a => a.studentId === 's1');
    const bobAssigned = updated.find(a => a.studentId === 's2');
    expect(aliceAssigned?.roleId).toBe('r2');
    expect(bobAssigned?.roleId).toBe('r1');
  });

  it('successfully assigns a student to an open slot on drop', () => {
    const onUpdateAssignments = vi.fn();
    render(<AssignmentBoard {...defaultProps} onUpdateAssignments={onUpdateAssignments} />);

    const lineLeaderHeader = screen.getByRole('heading', { name: 'Line Leader' });
    const lineLeaderCard = lineLeaderHeader.closest('div.flex-col.justify-between')!;
    const emptySlot = within(lineLeaderCard).getByText(/Drop student here/i);
    const charlieCard = within(screen.getByTestId('standby-column')).getByText('Charlie').closest('div[draggable="true"]')!;

    // Drag Charlie from standby
    fireEvent.dragStart(charlieCard, {
      dataTransfer: { setData: vi.fn(), effectAllowed: 'move' }
    });

    // Drop on empty slot in Line Leader (r1)
    fireEvent.drop(emptySlot, {
      dataTransfer: {
        getData: vi.fn().mockReturnValue(JSON.stringify({ studentId: 's3', sourceRoleId: null }))
      }
    });

    expect(onUpdateAssignments).toHaveBeenCalledTimes(1);
    const updated = onUpdateAssignments.mock.calls[0][0] as Assignment[];
    const charlieAssigned = updated.find(a => a.studentId === 's3');
    expect(charlieAssigned?.roleId).toBe('r1');
  });

  it('successfully unassigns a student when dropped on standby bank', () => {
    const onUpdateAssignments = vi.fn();
    render(<AssignmentBoard {...defaultProps} onUpdateAssignments={onUpdateAssignments} />);

    const aliceCard = screen.getByText('Alice').closest('div[draggable="true"]')!;
    const standbyBank = screen.getByTestId('standby-column').querySelector('div.bg-white')!;

    // Drag Alice from Line Leader
    fireEvent.dragStart(aliceCard, {
      dataTransfer: { setData: vi.fn(), effectAllowed: 'move' }
    });

    // Drop on standby bank
    fireEvent.drop(standbyBank!, {
      dataTransfer: {
        getData: vi.fn().mockReturnValue(JSON.stringify({ studentId: 's1', sourceRoleId: 'r1' }))
      }
    });

    expect(onUpdateAssignments).toHaveBeenCalledTimes(1);
    const updated = onUpdateAssignments.mock.calls[0][0] as Assignment[];
    const aliceAssigned = updated.find(a => a.studentId === 's1');
    expect(aliceAssigned?.roleId).toBeNull();
  });
});