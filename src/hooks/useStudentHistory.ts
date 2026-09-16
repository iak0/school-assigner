import { useCallback, useMemo } from 'react';
import { RotationSnapshot } from '../types';

export interface StudentHistoryEntry {
  roleName: string;
  rotationName: string;
  date: string;
}

export interface RecentRoleRepeat {
  isRepeat: boolean;
  rotationName?: string;
  date?: string;
}

interface UseStudentHistoryOptions {
  rotationHistory?: RotationSnapshot[];
}

/**
 * Shared hook for accessing student job history from rotation history.
 * Used by StudentManager, AssignmentBoard, and StatsSidebar.
 */
export function useStudentHistory({ rotationHistory = [] }: UseStudentHistoryOptions) {
  const getStudentHistory = useCallback(
    (studentId: string): StudentHistoryEntry[] => {
      if (!rotationHistory || rotationHistory.length === 0) return [];
      const history: StudentHistoryEntry[] = [];
      for (const rotation of rotationHistory) {
        const assignment = rotation.assignments.find(a => a.studentId === studentId);
        if (assignment && assignment.roleId && assignment.roleName) {
          const date = new Date(rotation.finalizedAt).toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
          });
          history.push({
            roleName: assignment.roleName,
            rotationName: rotation.name,
            date,
          });
        }
      }
      return history;
    },
    [rotationHistory]
  );

  const getRecentRoleRepeat = useCallback(
    (studentId: string, roleId: string): RecentRoleRepeat => {
      if (!rotationHistory || rotationHistory.length === 0) return { isRepeat: false };
      // Check most recent rotation first
      for (let i = rotationHistory.length - 1; i >= 0; i--) {
        const rotation = rotationHistory[i];
        const assignment = rotation.assignments.find(a => a.studentId === studentId);
        if (assignment && assignment.roleId === roleId) {
          const date = new Date(rotation.finalizedAt).toLocaleDateString([], {
            month: 'short',
            day: 'numeric',
          });
          return { isRepeat: true, rotationName: rotation.name, date };
        }
      }
      return { isRepeat: false };
    },
    [rotationHistory]
  );

  // Memoize the return value to avoid unnecessary re-renders
  const value = useMemo(
    () => ({
      getStudentHistory,
      getRecentRoleRepeat,
    }),
    [getStudentHistory, getRecentRoleRepeat]
  );

  return value;
}
