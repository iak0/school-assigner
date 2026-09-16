import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { RoleManager } from './RoleManager';
import { Role } from '../types';

const sampleRoles: Role[] = [
  { id: 'r1', name: 'Line Leader', capacity: 2, icon: '🚶' },
  { id: 'r2', name: 'Door Monitor', capacity: 1, icon: '🚪' },
  { id: 'r3', name: 'Paper Passer', capacity: 1, icon: '📄' },
];

// Mock window.scrollTo and scrollIntoView
beforeAll(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  Element.prototype.scrollIntoView = vi.fn();
});

afterAll(() => {
  vi.restoreAllMocks();
});

describe('RoleManager', () => {
  const onUpdateRoles = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders job list with names, capacities, and icons', () => {
    render(<RoleManager roles={sampleRoles} studentCount={30} onUpdateRoles={onUpdateRoles} />);

    expect(screen.getByText('Classroom Jobs & Slot Capacities')).toBeInTheDocument();
    expect(screen.getByText('Line Leader')).toBeInTheDocument();
    expect(screen.getByText('Door Monitor')).toBeInTheDocument();
    expect(screen.getByText('Paper Passer')).toBeInTheDocument();
    expect(screen.getByText('2 Slots')).toBeInTheDocument();
    expect(screen.getAllByText('1 Slot')).toHaveLength(2); // Door Monitor and Paper Passer
  });

  it('shows capacity alert when slots < students', () => {
    render(<RoleManager roles={sampleRoles} studentCount={30} onUpdateRoles={onUpdateRoles} />);

    expect(screen.getByText(/Notice:/)).toBeInTheDocument();
    expect(screen.getByText(/4 total job slots for 30 students/)).toBeInTheDocument();
  });

  it('opens inline add form at top when clicking Add New Job', async () => {
    render(<RoleManager roles={sampleRoles} studentCount={30} onUpdateRoles={onUpdateRoles} />);

    fireEvent.click(screen.getByRole('button', { name: /add new job/i }));

    await waitFor(() => {
      expect(screen.getByText('Create New Classroom Job')).toBeInTheDocument();
    });

    // Check form fields are empty
    expect(screen.getByPlaceholderText(/e\.g\. line leader/i)).toHaveValue('');
    expect(screen.getByRole('spinbutton')).toHaveValue(1);
  });

  it('adds new job via inline add form', async () => {
    render(<RoleManager roles={sampleRoles} studentCount={30} onUpdateRoles={onUpdateRoles} />);

    fireEvent.click(screen.getByRole('button', { name: /add new job/i }));

    await waitFor(() => {
      expect(screen.getByText('Create New Classroom Job')).toBeInTheDocument();
    });

    // Fill in name
    const nameInput = screen.getByPlaceholderText(/e\.g\. line leader/i);
    fireEvent.change(nameInput, { target: { value: 'New Job' } });

    // Set capacity to 3
    const capacityInput = screen.getByRole('spinbutton');
    fireEvent.change(capacityInput, { target: { value: '3' } });

    // Save
    fireEvent.click(screen.getByRole('button', { name: /save job/i }));

    // Verify onUpdateRoles was called with new job
    expect(onUpdateRoles).toHaveBeenCalledTimes(1);
    const newRoles = onUpdateRoles.mock.calls[0][0];
    expect(newRoles).toHaveLength(4);
    const added = newRoles.find(r => r.name === 'New Job');
    expect(added).toBeDefined();
    expect(added?.capacity).toBe(3);
    expect(added?.icon).toBeTruthy(); // random icon from EMOJI_OPTIONS
  });

  it('cancels add form', async () => {
    render(<RoleManager roles={sampleRoles} studentCount={30} onUpdateRoles={onUpdateRoles} />);

    fireEvent.click(screen.getByRole('button', { name: /add new job/i }));

    await waitFor(() => {
      expect(screen.getByText('Create New Classroom Job')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    // Form should be gone
    await waitFor(() => {
      expect(screen.queryByText('Create New Classroom Job')).not.toBeInTheDocument();
    });

    expect(onUpdateRoles).not.toHaveBeenCalled();
  });

  it('opens inline edit form replacing the job card', async () => {
    render(<RoleManager roles={sampleRoles} studentCount={30} onUpdateRoles={onUpdateRoles} />);

    // Click edit on first job (Line Leader)
    const editButtons = screen.getAllByRole('button', { name: /edit job/i });
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Classroom Job')).toBeInTheDocument();
    });

    // Form should be prefilled with Line Leader's data
    const nameInput = screen.getByPlaceholderText(/e\.g\. line leader/i);
    expect(nameInput).toHaveValue('Line Leader');

    const capacityInput = screen.getByRole('spinbutton');
    expect(capacityInput).toHaveValue(2);
  });

  it('updates existing job via inline edit form', async () => {
    render(<RoleManager roles={sampleRoles} studentCount={30} onUpdateRoles={onUpdateRoles} />);

    // Click edit on Line Leader
    const editButtons = screen.getAllByRole('button', { name: /edit job/i });
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Classroom Job')).toBeInTheDocument();
    });

    // Change name
    const nameInput = screen.getByPlaceholderText(/e\.g\. line leader/i);
    fireEvent.change(nameInput, { target: { value: 'Updated Leader' } });

    // Change capacity
    const capacityInput = screen.getByRole('spinbutton');
    fireEvent.change(capacityInput, { target: { value: '3' } });

    // Save
    fireEvent.click(screen.getByRole('button', { name: /save job/i }));

    // Verify onUpdateRoles was called with updated job
    expect(onUpdateRoles).toHaveBeenCalledTimes(1);
    const newRoles = onUpdateRoles.mock.calls[0][0];
    const updated = newRoles.find(r => r.name === 'Updated Leader');
    expect(updated).toBeDefined();
    expect(updated?.capacity).toBe(3);
    expect(updated?.id).toBe('r1'); // same id
  });

  it('cancels edit form', async () => {
    render(<RoleManager roles={sampleRoles} studentCount={30} onUpdateRoles={onUpdateRoles} />);

    const editButtons = screen.getAllByRole('button', { name: /edit job/i });
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Classroom Job')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByText('Edit Classroom Job')).not.toBeInTheDocument();
    });

    expect(onUpdateRoles).not.toHaveBeenCalled();
  });

  it('adjusts capacity with +/- buttons on job card', () => {
    render(<RoleManager roles={sampleRoles} studentCount={30} onUpdateRoles={onUpdateRoles} />);

    // Find the capacity control for Line Leader (first job card)
    const cards = screen.getAllByText('Line Leader');
    expect(cards.length).toBeGreaterThan(0);

    // Click + button on first card
    const plusButtons = screen.getAllByRole('button', { name: /\+/i });
    // The first + button should be for Line Leader
    fireEvent.click(plusButtons[0]);

    // Verify onUpdateRoles was called with updated capacity
    expect(onUpdateRoles).toHaveBeenCalledTimes(1);
    const newRoles = onUpdateRoles.mock.calls[0][0];
    const updated = newRoles.find(r => r.id === 'r1');
    expect(updated?.capacity).toBe(3);
  });

  it('deletes job with confirmation', () => {
    render(<RoleManager roles={sampleRoles} studentCount={30} onUpdateRoles={onUpdateRoles} />);

    // Mock window.confirm to return true
    vi.spyOn(window, 'confirm').mockReturnValue(true);

    // Click delete on first job
    const deleteButtons = screen.getAllByRole('button', { name: /delete job/i });
    fireEvent.click(deleteButtons[0]);

    // Verify onUpdateRoles was called with remaining jobs
    expect(onUpdateRoles).toHaveBeenCalledTimes(1);
    const newRoles = onUpdateRoles.mock.calls[0][0];
    expect(newRoles).toHaveLength(2);
    expect(newRoles.find(r => r.id === 'r1')).toBeUndefined();
  });
});