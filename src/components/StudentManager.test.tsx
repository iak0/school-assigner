import { describe, it, expect, vi, beforeAll, afterAll, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import { StudentManager } from './StudentManager';
import { Student, Role } from '../types';

const sampleRoles: Role[] = [
  { id: 'r1', name: 'Line Leader', capacity: 2, icon: '🚶' },
  { id: 'r2', name: 'Door Monitor', capacity: 1, icon: '🚪' },
  { id: 'r3', name: 'Paper Passer', capacity: 1, icon: '📄' },
  { id: 'r4', name: 'Tech Assistant', capacity: 1, icon: '💻' },
  { id: 'r5', name: 'Librarian', capacity: 1, icon: '📚' },
];

const sampleStudents: Student[] = [
  { id: 's1', name: 'Alice', preferences: ['r1', 'r2'], applicationScore: 0 },
  { id: 's2', name: 'Bob', preferences: ['r3'], applicationScore: 1 },
];

// Mock window.scrollTo and scrollIntoView
beforeAll(() => {
  vi.spyOn(window, 'scrollTo').mockImplementation(() => {});
  Element.prototype.scrollIntoView = vi.fn();
});

afterAll(() => {
  vi.restoreAllMocks();
});

// Helper to get the form's preference selects
function getFormPreferenceSelects() {
  // Find the row containing the form (has "Add New Student" or "Edit Student & Preferences" heading)
  const formRow = document.querySelector('tr:has(h3)') as HTMLElement;
  if (!formRow) return [];
  return within(formRow).getAllByRole('combobox');
}

describe('StudentManager', () => {
  const onUpdateStudents = vi.fn();

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('renders student list with preferences and adjustment scores', () => {
    render(<StudentManager students={sampleStudents} roles={sampleRoles} onUpdateStudents={onUpdateStudents} />);

    expect(screen.getByText('Students & Preferences')).toBeInTheDocument();
    expect(screen.getByText('Alice')).toBeInTheDocument();
    expect(screen.getByText('Bob')).toBeInTheDocument();
    // Check for rank indicators (#1, #2) - use getAllByText since multiple exist
    expect(screen.getAllByText('#1')).toHaveLength(2);
    expect(screen.getAllByText('#2')).toHaveLength(1);
  });

  it('shows empty preferences as blank (not prefilled) when adding new student', async () => {
    render(<StudentManager students={sampleStudents} roles={sampleRoles} onUpdateStudents={onUpdateStudents} />);

    // Click Add Student
    fireEvent.click(screen.getByRole('button', { name: /add student/i }));

    // Check that the inline add form appears
    await waitFor(() => {
      expect(screen.getByText('Add New Student')).toBeInTheDocument();
    });

    // Get the form selects (preference dropdowns in the form)
    const formSelects = getFormPreferenceSelects();
    expect(formSelects).toHaveLength(5);
    formSelects.forEach(select => {
      expect(select).toHaveValue('');
    });
  });

  it('adds new student with blank preferences', async () => {
    render(<StudentManager students={sampleStudents} roles={sampleRoles} onUpdateStudents={onUpdateStudents} />);

    // Click Add Student
    fireEvent.click(screen.getByRole('button', { name: /add student/i }));

    await waitFor(() => {
      expect(screen.getByText('Add New Student')).toBeInTheDocument();
    });

    // Fill in name
    const nameInput = screen.getByPlaceholderText(/e\.g\. maya lin/i);
    fireEvent.change(nameInput, { target: { value: 'New Student' } });

    // Set adjustment to +1 - click the +1 button in the form
    const formSelects = getFormPreferenceSelects();
    // Get the form row to find buttons within it
    const formRow = document.querySelector('tr:has(h3)') as HTMLElement;
    const plusOneButton = within(formRow).getByText('+1');
    fireEvent.click(plusOneButton);

    // Select 1st choice - use the select in the form
    fireEvent.change(formSelects[0], { target: { value: 'r1' } });

    // Save
    fireEvent.click(screen.getByRole('button', { name: /save student/i }));

    // Verify onUpdateStudents was called with new student
    expect(onUpdateStudents).toHaveBeenCalledTimes(1);
    const newStudents = onUpdateStudents.mock.calls[0][0];
    expect(newStudents).toHaveLength(3);
    const added = newStudents.find(s => s.name === 'New Student');
    expect(added).toBeDefined();
    expect(added?.preferences).toEqual(['r1']);
    expect(added?.applicationScore).toBe(1);
  });

  it('opens inline edit form for existing student', async () => {
    render(<StudentManager students={sampleStudents} roles={sampleRoles} onUpdateStudents={onUpdateStudents} />);

    // Click edit on Alice (first edit button)
    const editButtons = screen.getAllByRole('button', { name: /edit student & preferences/i });
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Student & Preferences')).toBeInTheDocument();
    });

    // Form should be prefilled with Alice's data
    const nameInput = screen.getByPlaceholderText(/e\.g\. maya lin/i);
    expect(nameInput).toHaveValue('Alice');

    // Check preferences are prefilled - get the form selects
    const formSelects = getFormPreferenceSelects();
    expect(formSelects).toHaveLength(5);
    expect(formSelects[0]).toHaveValue('r1'); // 1st choice
    expect(formSelects[1]).toHaveValue('r2'); // 2nd choice
    expect(formSelects[2]).toHaveValue(''); // 3rd choice empty
    expect(formSelects[3]).toHaveValue(''); // 4th choice empty
    expect(formSelects[4]).toHaveValue(''); // 5th choice empty
  });

  it('updates existing student via inline edit form', async () => {
    render(<StudentManager students={sampleStudents} roles={sampleRoles} onUpdateStudents={onUpdateStudents} />);

    // Click edit on Alice
    const editButtons = screen.getAllByRole('button', { name: /edit student & preferences/i });
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Student & Preferences')).toBeInTheDocument();
    });

    // Change name
    const nameInput = screen.getByPlaceholderText(/e\.g\. maya lin/i);
    fireEvent.change(nameInput, { target: { value: 'Alice Updated' } });

    // Change adjustment to +2 - click the +2 button in the form
    const formRow = document.querySelector('tr:has(h3)') as HTMLElement;
    const plusTwoButton = within(formRow).getByText('+2');
    fireEvent.click(plusTwoButton);

    // Save
    fireEvent.click(screen.getByRole('button', { name: /save student/i }));

    // Verify onUpdateStudents was called with updated student
    expect(onUpdateStudents).toHaveBeenCalledTimes(1);
    const newStudents = onUpdateStudents.mock.calls[0][0];
    const updated = newStudents.find(s => s.name === 'Alice Updated');
    expect(updated).toBeDefined();
    expect(updated?.applicationScore).toBe(2);
  });

  it('cancels add form', async () => {
    render(<StudentManager students={sampleStudents} roles={sampleRoles} onUpdateStudents={onUpdateStudents} />);

    fireEvent.click(screen.getByRole('button', { name: /add student/i }));

    await waitFor(() => {
      expect(screen.getByText('Add New Student')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    // Form should be gone
    await waitFor(() => {
      expect(screen.queryByText('Add New Student')).not.toBeInTheDocument();
    });

    // onUpdateStudents should not have been called
    expect(onUpdateStudents).not.toHaveBeenCalled();
  });

  it('cancels edit form', async () => {
    render(<StudentManager students={sampleStudents} roles={sampleRoles} onUpdateStudents={onUpdateStudents} />);

    const editButtons = screen.getAllByRole('button', { name: /edit student & preferences/i });
    fireEvent.click(editButtons[0]);

    await waitFor(() => {
      expect(screen.getByText('Edit Student & Preferences')).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));

    await waitFor(() => {
      expect(screen.queryByText('Edit Student & Preferences')).not.toBeInTheDocument();
    });

    expect(onUpdateStudents).not.toHaveBeenCalled();
  });

  it('bulk import adds students with empty preferences', async () => {
    render(<StudentManager students={sampleStudents} roles={sampleRoles} onUpdateStudents={onUpdateStudents} />);

    // Click bulk import
    fireEvent.click(screen.getByRole('button', { name: /bulk import/i }));

    await waitFor(() => {
      expect(screen.getByText('Quick Import Student Roster')).toBeInTheDocument();
    });

    // Enter names
    const textarea = screen.getByPlaceholderText(/emma watson/i);
    fireEvent.change(textarea, { target: { value: 'Student A\nStudent B\nStudent C' } });

    fireEvent.click(screen.getByRole('button', { name: /import students/i }));

    // Verify onUpdateStudents called with 5 total students (2 original + 3 new)
    expect(onUpdateStudents).toHaveBeenCalledTimes(1);
    const newStudents = onUpdateStudents.mock.calls[0][0];
    expect(newStudents).toHaveLength(5);
    const imported = newStudents.filter(s => ['Student A', 'Student B', 'Student C'].includes(s.name));
    imported.forEach(s => {
      expect(s.preferences).toEqual([]);
      expect(s.applicationScore).toBe(0);
    });
  });

  it('prevents duplicate preferences when saving', async () => {
    render(<StudentManager students={sampleStudents} roles={sampleRoles} onUpdateStudents={onUpdateStudents} />);

    fireEvent.click(screen.getByRole('button', { name: /add student/i }));

    await waitFor(() => {
      expect(screen.getByText('Add New Student')).toBeInTheDocument();
    });

    // Select same role for 1st and 2nd choice - use form selects
    const formSelects = getFormPreferenceSelects();
    fireEvent.change(formSelects[0], { target: { value: 'r1' } });
    fireEvent.change(formSelects[1], { target: { value: 'r1' } });

    // When saving, duplicates should be filtered
    const nameInput = screen.getByPlaceholderText(/e\.g\. maya lin/i);
    fireEvent.change(nameInput, { target: { value: 'Test Student' } });

    fireEvent.click(screen.getByRole('button', { name: /save student/i }));

    const newStudents = onUpdateStudents.mock.calls[0][0];
    const added = newStudents.find(s => s.name === 'Test Student');
    expect(added?.preferences).toEqual(['r1']); // Duplicate filtered
  });
});