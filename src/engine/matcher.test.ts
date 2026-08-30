import { describe, it, expect } from 'vitest';
import { generateAssignments, calculateStatistics, calculateStudentUtility, DEFAULT_CONFIG } from './matcher';
import { Student, Role, Assignment } from '../types';

describe('Matching Engine', () => {
  const sampleRoles: Role[] = [
    { id: 'role-1', name: 'Line Leader', capacity: 2 },
    { id: 'role-2', name: 'Door Holder', capacity: 1 },
    { id: 'role-3', name: 'Library Helper', capacity: 2 },
    { id: 'role-4', name: 'Tech Specialist', capacity: 1 },
  ];

  it('correctly assigns students to their 1st choices when there is no conflict', () => {
    const students: Student[] = [
      { id: 's1', name: 'Alice', preferences: ['role-1', 'role-2'], applicationScore: 0 },
      { id: 's2', name: 'Bob', preferences: ['role-1', 'role-3'], applicationScore: 0 },
      { id: 's3', name: 'Charlie', preferences: ['role-2', 'role-1'], applicationScore: 0 },
      { id: 's4', name: 'Diana', preferences: ['role-3', 'role-4'], applicationScore: 0 },
    ];

    const assignments = generateAssignments(students, sampleRoles);
    const stats = calculateStatistics(students, sampleRoles, assignments);

    expect(assignments).toHaveLength(4);
    expect(stats.choiceDistribution.firstChoice).toBe(4);
    expect(stats.averageRank).toBe(1);
    expect(stats.unassignedCount).toBe(0);

    const s1Assign = assignments.find((a) => a.studentId === 's1');
    const s2Assign = assignments.find((a) => a.studentId === 's2');
    const s3Assign = assignments.find((a) => a.studentId === 's3');
    const s4Assign = assignments.find((a) => a.studentId === 's4');

    expect(s1Assign?.roleId).toBe('role-1');
    expect(s2Assign?.roleId).toBe('role-1'); // Role 1 has capacity 2
    expect(s3Assign?.roleId).toBe('role-2');
    expect(s4Assign?.roleId).toBe('role-3');
  });

  it('uses application letter score as a strong tiebreaker in conflicts (+3 vs 0 vs -2)', () => {
    const singleSlotRole: Role[] = [{ id: 'role-leader', name: 'Line Leader', capacity: 1 }];

    const students: Student[] = [
      { id: 's1', name: 'Alice (Bonus +3)', preferences: ['role-leader'], applicationScore: 3 },
      { id: 's2', name: 'Bob (Neutral 0)', preferences: ['role-leader'], applicationScore: 0 },
      { id: 's3', name: 'Charlie (Penalty -2)', preferences: ['role-leader'], applicationScore: -2 },
    ];

    const assignments = generateAssignments(students, singleSlotRole);

    const s1Assign = assignments.find((a) => a.studentId === 's1');
    const s2Assign = assignments.find((a) => a.studentId === 's2');
    const s3Assign = assignments.find((a) => a.studentId === 's3');

    // Alice (+3) should win the single slot
    expect(s1Assign?.roleId).toBe('role-leader');
    expect(s2Assign?.roleId).toBeNull();
    expect(s3Assign?.roleId).toBeNull();
  });

  it('preserves locked assignments during regeneration and optimizes the rest', () => {
    const roles: Role[] = [
      { id: 'role-1', name: 'Line Leader', capacity: 1 },
      { id: 'role-2', name: 'Door Holder', capacity: 1 },
    ];

    const students: Student[] = [
      { id: 's1', name: 'Alice', preferences: ['role-1', 'role-2'], applicationScore: 3 },
      { id: 's2', name: 'Bob', preferences: ['role-1', 'role-2'], applicationScore: 0 },
    ];

    // Teacher explicitly locks Bob to role-1
    const lockedAssignments: Assignment[] = [
      { studentId: 's2', roleId: 'role-1', isLocked: true },
    ];

    const result = generateAssignments(students, roles, lockedAssignments);

    const bobAssign = result.find((a) => a.studentId === 's2');
    const aliceAssign = result.find((a) => a.studentId === 's1');

    expect(bobAssign?.roleId).toBe('role-1');
    expect(bobAssign?.isLocked).toBe(true);
    // Even though Alice had higher application score for role-1, Bob was locked, so Alice gets her 2nd choice
    expect(aliceAssign?.roleId).toBe('role-2');
  });

  it('handles ~30 students competing for ~20 slots with unassigned pool', () => {
    const roles: Role[] = [
      { id: 'r1', name: 'Role 1', capacity: 5 },
      { id: 'r2', name: 'Role 2', capacity: 5 },
      { id: 'r3', name: 'Role 3', capacity: 5 },
      { id: 'r4', name: 'Role 4', capacity: 5 },
    ]; // Total capacity: 20 slots

    const students: Student[] = Array.from({ length: 30 }, (_, i) => ({
      id: `s-${i + 1}`,
      name: `Student ${i + 1}`,
      preferences: ['r1', 'r2', 'r3', 'r4'],
      applicationScore: (i % 7) - 3, // scores ranging -3 to +3
    }));

    const assignments = generateAssignments(students, roles);
    const stats = calculateStatistics(students, roles, assignments);

    expect(assignments).toHaveLength(30);
    expect(stats.totalStudents).toBe(30);
    expect(stats.totalSlots).toBe(20);
    expect(stats.assignedCount).toBe(20);
    expect(stats.unassignedCount).toBe(10);
    expect(stats.rawUtilityScore).toBeGreaterThan(0);
  });

  it('calculates student utility accurately with rank and letter weights', () => {
    const student: Student = {
      id: 's1',
      name: 'Maya',
      preferences: ['r-art', 'r-book', 'r-door'],
      applicationScore: 2,
    };

    const firstChoice = calculateStudentUtility(student, 'r-art', DEFAULT_CONFIG);
    expect(firstChoice.rank).toBe(1);
    expect(firstChoice.utility).toBe(100 + 25); // 1st choice (100) + score 2 (+25)

    const unrankedChoice = calculateStudentUtility(student, 'r-random', DEFAULT_CONFIG);
    expect(unrankedChoice.rank).toBeNull();
    expect(unrankedChoice.utility).toBe(0 + 25); // unranked (0) + score 2 (+25)
  });
});
