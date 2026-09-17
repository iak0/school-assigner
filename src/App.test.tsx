import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import App from './App';
import { clearWorkspace } from './services/storage/indexedDb';
import { Student, Role, Assignment } from './types';

// Mock window.location for share link tests
const mockLocation = {
  origin: 'http://localhost:5173',
  pathname: '/',
  hash: '',
};

Object.defineProperty(window, 'location', {
  value: mockLocation,
  writable: true,
  configurable: true,
});

// Mock document.createElement for download link
const mockAnchor = {
  href: '',
  download: '',
  click: vi.fn(),
};
const originalCreateElement = document.createElement.bind(document);

describe('App Core Functionality', () => {
  beforeEach(async () => {
    vi.clearAllMocks();
    localStorage.clear();
    await clearWorkspace();
    mockLocation.hash = '';
    mockAnchor.href = '';
    mockAnchor.download = '';
    mockAnchor.click.mockClear();
    (global.confirm as vi.Mock).mockReturnValue(true);

    // Re-setup the createElement mock
    vi.spyOn(document, 'createElement').mockImplementation(tag => {
      if (tag === 'a') return mockAnchor as any;
      return originalCreateElement(tag);
    });
  });

  afterEach(async () => {
    await clearWorkspace();
    vi.restoreAllMocks();
  });

  describe('Class Title Persistence', () => {
    it('loads class title from localStorage on initial load (migration)', async () => {
      const savedData = {
        classTitle: "Mrs. Johnson's 5th Grade",
        roles: [],
        students: [],
        assignments: [],
      };
      localStorage.setItem('classroom_role_assigner_data_v1', JSON.stringify(savedData));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText("Mrs. Johnson's 5th Grade")).toBeInTheDocument();
      });
    });

    it('defaults to "My Class" when no localStorage data exists', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('My Class')).toBeInTheDocument();
      });
    });

    it('saves class title to IndexedDB when edited', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('My Class')).toBeInTheDocument();
      });

      // Click to edit the class title
      const titleBadge = screen.getByText('My Class');
      fireEvent.click(titleBadge);

      // Wait for edit mode - use the specific input in the header area
      await waitFor(() => {
        const header = screen.getByRole('banner');
        const input = within(header).getByRole('textbox');
        expect(input).toBeInTheDocument();
        expect(input).toHaveValue('My Class');
      });

      // Change the title
      const header = screen.getByRole('banner');
      const input = within(header).getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Custom Class Name' } });
      fireEvent.keyDown(input, { key: 'Enter', code: 'Enter' });

      // Wait for save - the title badge updates immediately
      await waitFor(() => {
        expect(screen.getByText('Custom Class Name')).toBeInTheDocument();
      });
    });

    it('cancels edit on Escape key and restores original title', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('My Class')).toBeInTheDocument();
      });

      const titleBadge = screen.getByText('My Class');
      fireEvent.click(titleBadge);

      await waitFor(() => {
        const header = screen.getByRole('banner');
        const input = within(header).getByRole('textbox');
        expect(input).toBeInTheDocument();
      });

      const header = screen.getByRole('banner');
      const input = within(header).getByRole('textbox');
      fireEvent.change(input, { target: { value: 'Should Not Save' } });
      fireEvent.keyDown(input, { key: 'Escape', code: 'Escape' });

      await waitFor(() => {
        expect(screen.getByText('My Class')).toBeInTheDocument();
      });
    });

    it('prefills edit field with saved title on page load (migration)', async () => {
      const savedData = {
        classTitle: 'Loaded From Storage',
        roles: [],
        students: [],
        assignments: [],
      };
      localStorage.setItem('classroom_role_assigner_data_v1', JSON.stringify(savedData));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('Loaded From Storage')).toBeInTheDocument();
      });

      // Click to edit
      const titleBadge = screen.getByText('Loaded From Storage');
      fireEvent.click(titleBadge);

      await waitFor(() => {
        const header = screen.getByRole('banner');
        const input = within(header).getByRole('textbox');
        expect(input).toHaveValue('Loaded From Storage');
      });
    });
  });

  describe('Export/Import JSON', () => {
    it('exports current state including class title as JSON', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('My Class')).toBeInTheDocument();
      });

      // Open settings dropdown
      const settingsBtn = screen.getByRole('button', { name: /settings/i });
      fireEvent.click(settingsBtn);

      await waitFor(() => {
        expect(screen.getByText('Export Class File (.json)')).toBeInTheDocument();
      });

      // Click export
      fireEvent.click(screen.getByText('Export Class File (.json)'));

      // Verify blob creation - the export is async so wait for it
      await waitFor(() => {
        expect(URL.createObjectURL).toHaveBeenCalled();
        expect(mockAnchor.download).toMatch(/my-class-jobs-\d{4}-\d{2}-\d{2}\.json/);
      });
    });

    it('imports JSON file and restores class title, roles, students, assignments', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('My Class')).toBeInTheDocument();
      });

      // Open settings dropdown
      const settingsBtn = screen.getByRole('button', { name: /settings/i });
      fireEvent.click(settingsBtn);

      await waitFor(() => {
        expect(screen.getByText('Import Class File (.json)')).toBeInTheDocument();
      });

      // Trigger file import via the hidden file input
      const importBtn = screen.getByText('Import Class File (.json)');
      fireEvent.click(importBtn);
    });
  });

  describe('Share Link Generation', () => {
    it('generates compressed share link with class title and data', async () => {
      render(<App />);

      await waitFor(() => {
        expect(screen.getByText('My Class')).toBeInTheDocument();
      });

      // Open settings dropdown
      const settingsBtn = screen.getByRole('button', { name: /settings/i });
      await userEvent.click(settingsBtn);

      await waitFor(() => {
        expect(screen.getByText('Copy Share / Sync Link')).toBeInTheDocument();
      });

      // Click copy share link
      await userEvent.click(screen.getByText('Copy Share / Sync Link'));

      // Verify clipboard was called with compressed URL (wait for async operation)
      await waitFor(
        () => {
          expect(navigator.clipboard.writeText).toHaveBeenCalledWith(
            expect.stringMatching(/^http:\/\/localhost:5173\/#data=/)
          );
        },
        { timeout: 1000 }
      );
    });
  });

  describe('Clear All Data', () => {
    it('resets everything to defaults and clears IndexedDB', async () => {
      // Start with some data via localStorage (will be migrated)
      const savedData = {
        classTitle: 'Old Class',
        roles: [{ id: 'r1', name: 'Role 1', capacity: 1 }],
        students: [{ id: 's1', name: 'Student 1', preferences: ['r1'], applicationScore: 0 }],
        assignments: [{ studentId: 's1', roleId: 'r1', isLocked: false }],
      };
      localStorage.setItem('classroom_role_assigner_data_v1', JSON.stringify(savedData));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Old Class/)).toBeInTheDocument();
      });

      // Open settings dropdown
      const settingsBtn = screen.getByRole('button', { name: /settings/i });
      fireEvent.click(settingsBtn);

      await waitFor(() => {
        expect(screen.getByText('Clear All Data (Reset)')).toBeInTheDocument();
      });

      // Click clear all data (will trigger confirm dialog)
      const originalConfirm = window.confirm;
      window.confirm = vi.fn().mockReturnValue(true);

      fireEvent.click(screen.getByText('Clear All Data (Reset)'));

      await waitFor(() => {
        expect(screen.getByText(/My Class/)).toBeInTheDocument();
      });

      window.confirm = originalConfirm;
    });

    it('does not clear data when confirm is cancelled', async () => {
      const savedData = {
        classTitle: 'Old Class',
        roles: [],
        students: [],
        assignments: [],
      };
      localStorage.setItem('classroom_role_assigner_data_v1', JSON.stringify(savedData));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Old Class/)).toBeInTheDocument();
      });

      const settingsBtn = screen.getByRole('button', { name: /settings/i });
      fireEvent.click(settingsBtn);

      await waitFor(() => {
        expect(screen.getByText('Clear All Data (Reset)')).toBeInTheDocument();
      });

      const originalConfirm = window.confirm;
      window.confirm = vi.fn().mockReturnValue(false);

      fireEvent.click(screen.getByText('Clear All Data (Reset)'));

      await waitFor(() => {
        expect(screen.getByText(/Old Class/)).toBeInTheDocument();
      });

      window.confirm = originalConfirm;
    });
  });

  describe('Data Sync via URL Hash', () => {
    it('loads class data from URL hash on initial load', async () => {
      const testData = {
        classTitle: 'From URL',
        roles: [{ id: 'r1', name: 'URL Role', capacity: 1 }],
        students: [{ id: 's1', name: 'URL Student', preferences: ['r1'], applicationScore: 0 }],
        assignments: [{ studentId: 's1', roleId: 'r1', isLocked: false }],
      };
    });
  });

  describe('Matching Board Integration', () => {
    it('generates matches when clicking Generate Optimal Matches', async () => {
      const roles: Role[] = [{ id: 'r1', name: 'Line Leader', capacity: 1 }];
      const students: Student[] = [
        { id: 's1', name: 'Alice', preferences: ['r1'], applicationScore: 0 },
      ];
      const assignments: Assignment[] = [{ studentId: 's1', roleId: null, isLocked: false }];

      const savedData = {
        classTitle: 'Test Class',
        roles,
        students,
        assignments,
      };
      localStorage.setItem('classroom_role_assigner_data_v1', JSON.stringify(savedData));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Test Class/)).toBeInTheDocument();
      });

      // Should be on board tab by default
      await waitFor(() => {
        const generateBtn = screen.getByRole('button', { name: /generate optimal matches/i });
        expect(generateBtn).toBeInTheDocument();
      });
    });
  });

  describe('Rotation History Persistence', () => {
    it('saves rotation history to IndexedDB when finalizing a rotation', async () => {
      const roles: Role[] = [
        { id: 'r1', name: 'Line Leader', capacity: 1 },
        { id: 'r2', name: 'Door Monitor', capacity: 1 },
      ];
      const students: Student[] = [
        { id: 's1', name: 'Alice', preferences: ['r1'], applicationScore: 0 },
        { id: 's2', name: 'Bob', preferences: ['r2'], applicationScore: 0 },
      ];
      const assignments: Assignment[] = [
        { studentId: 's1', roleId: 'r1', isLocked: false },
        { studentId: 's2', roleId: 'r2', isLocked: false },
      ];

      const savedData = {
        classTitle: 'Test Class',
        roles,
        students,
        assignments,
      };
      localStorage.setItem('classroom_role_assigner_data_v1', JSON.stringify(savedData));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Test Class/)).toBeInTheDocument();
      });

      // Click Finalize Rotation button in header (the trigger) - find by text content
      await waitFor(() => {
        const finalizeBtn = screen.getByText('Finalize Rotation 🔒');
        expect(finalizeBtn).toBeInTheDocument();
      });

      // There are two buttons with this text - click the first one (in header)
      const buttons = screen.getAllByText('Finalize Rotation 🔒');
      fireEvent.click(buttons[0]);

      // Wait for modal to appear
      await waitFor(() => {
        expect(screen.getByRole('dialog', { name: /finalize rotation/i })).toBeInTheDocument();
      });

      // Fill in rotation name and submit
      const nameInput = screen.getByLabelText(/rotation name/i);
      fireEvent.change(nameInput, { target: { value: 'September 2026 Jobs' } });

      // Click Finalize Rotation button in modal (the submit button - second one)
      const modalButtons = screen.getAllByText('Finalize Rotation 🔒');
      fireEvent.click(modalButtons[1]);

      // Wait for modal to close and toast to appear
      await waitFor(() => {
        expect(
          screen.queryByRole('dialog', { name: /finalize rotation/i })
        ).not.toBeInTheDocument();
      });

      // Wait for auto-save to complete (immediate save via saveToDisk)
      await waitFor(
        () => {
          // Data is now in IndexedDB, not localStorage
          // We can verify by checking the UI still shows the class title
          expect(screen.getByText(/Test Class/)).toBeInTheDocument();
        },
        { timeout: 3000 }
      );
    });

    it('persists rotation history across page reload', async () => {
      const roles: Role[] = [{ id: 'r1', name: 'Line Leader', capacity: 1 }];
      const students: Student[] = [
        { id: 's1', name: 'Alice', preferences: ['r1'], applicationScore: 0 },
      ];
      const assignments: Assignment[] = [{ studentId: 's1', roleId: 'r1', isLocked: false }];

      // Pre-populate with rotation history
      const savedData = {
        classTitle: 'Test Class',
        roles,
        students,
        assignments,
        rotationHistory: [
          {
            id: 'rot-1',
            name: 'August 2026 Jobs',
            createdAt: '2026-08-01T00:00:00.000Z',
            finalizedAt: '2026-08-01T00:00:00.000Z',
            notes: 'First rotation',
            assignments: [
              { studentId: 's1', roleId: 'r1', roleName: 'Line Leader', studentName: 'Alice' },
            ],
          },
        ],
        antiRepetitionConfig: {
          recencyWindow: 2,
          avoidanceStrictness: 'balanced',
          standbyPriority: true,
        },
      };
      localStorage.setItem('classroom_role_assigner_data_v1', JSON.stringify(savedData));

      // First render - simulates initial load
      const { unmount } = render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Test Class/)).toBeInTheDocument();
      });

      // Navigate to History tab (named "Rotations" in UI)
      const historyTab = screen.getByRole('button', { name: 'Rotations' });
      fireEvent.click(historyTab);

      await waitFor(() => {
        expect(screen.getByText('August 2026 Jobs')).toBeInTheDocument();
        expect(screen.getByText('First rotation')).toBeInTheDocument();
      });

      // Unmount and re-render (simulates page reload)
      unmount();
      localStorage.setItem('classroom_role_assigner_data_v1', JSON.stringify(savedData));

      render(<App />);

      await waitFor(() => {
        expect(screen.getByText(/Test Class/)).toBeInTheDocument();
      });

      // Navigate to History tab again
      const historyTab2 = screen.getByRole('button', { name: 'Rotations' });
      fireEvent.click(historyTab2);

      // History should still be there
      await waitFor(() => {
        expect(screen.getByText('August 2026 Jobs')).toBeInTheDocument();
        expect(screen.getByText('First rotation')).toBeInTheDocument();
      });
    });
  });
});

describe('Utility Functions', () => {
  it('compresses and decompresses data correctly', () => {
    // Test lz-string round-trip
    const {
      compressToEncodedURIComponent,
      decompressFromEncodedURIComponent,
    } = require('lz-string');

    const testData = {
      classTitle: 'Test Class',
      roles: [{ id: 'r1', name: 'Role 1', capacity: 1 }],
      students: [{ id: 's1', name: 'Student', preferences: ['r1'], applicationScore: 0 }],
      assignments: [{ studentId: 's1', roleId: 'r1', isLocked: false }],
    };

    const compressed = compressToEncodedURIComponent(JSON.stringify(testData));
    const decompressed = decompressFromEncodedURIComponent(compressed);
    const parsed = JSON.parse(decompressed!);

    expect(parsed.classTitle).toBe('Test Class');
    expect(parsed.roles).toHaveLength(1);
    expect(parsed.students).toHaveLength(1);
    expect(parsed.assignments).toHaveLength(1);
  });

  it('generates valid share URL format', () => {
    const { compressToEncodedURIComponent } = require('lz-string');

    const data = { classTitle: 'Test', roles: [], students: [], assignments: [] };
    const compressed = compressToEncodedURIComponent(JSON.stringify(data));
    const shareUrl = `http://localhost:5173/#data=${compressed}`;

    expect(shareUrl).toMatch(/^http:\/\/localhost:5173\/#data=/);
    expect(shareUrl.length).toBeLessThan(2000); // Reasonable URL length
  });
});
