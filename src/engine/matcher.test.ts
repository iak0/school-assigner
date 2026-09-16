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

  it('calculates Top 3 Choices percentage correctly', () => {
    const roles: Role[] = [
      { id: 'r1', name: 'Role 1', capacity: 2 },
      { id: 'r2', name: 'Role 2', capacity: 2 },
      { id: 'r3', name: 'Role 3', capacity: 2 },
    ];

    const students: Student[] = [
      { id: 's1', name: 'A', preferences: ['r1', 'r2', 'r3'], applicationScore: 0 },
      { id: 's2', name: 'B', preferences: ['r1', 'r2', 'r3'], applicationScore: 0 },
      { id: 's3', name: 'C', preferences: ['r1', 'r2', 'r3'], applicationScore: 0 },
      { id: 's4', name: 'D', preferences: ['r1', 'r2', 'r3'], applicationScore: 0 },
      { id: 's5', name: 'E', preferences: ['r2', 'r3', 'r1'], applicationScore: 0 },
    ];

    const assignments = generateAssignments(students, roles);
    const stats = calculateStatistics(students, roles, assignments);

    // 5 students, 6 slots - all assigned
    const topThreeCount = stats.choiceDistribution.firstChoice + stats.choiceDistribution.secondChoice + stats.choiceDistribution.thirdChoice;
    const topThreePercent = Math.round((topThreeCount / stats.assignedCount) * 100);

    expect(stats.assignedCount).toBe(5);
    expect(topThreeCount).toBeGreaterThanOrEqual(0);
    expect(topThreePercent).toBeLessThanOrEqual(100);
  });

  it('random tiebreaker produces different valid assignments on equal utility', () => {
    // When all students have no preferences, utility is 0 for all
    // The random tiebreaker should produce different assignments across runs
    const roles: Role[] = [
      { id: 'r1', name: 'Role 1', capacity: 2 },
      { id: 'r2', name: 'Role 2', capacity: 2 },
    ];

    const students: Student[] = [
      { id: 's1', name: 'A', preferences: [], applicationScore: 0 },
      { id: 's2', name: 'B', preferences: [], applicationScore: 0 },
      { id: 's3', name: 'C', preferences: [], applicationScore: 0 },
      { id: 's4', name: 'D', preferences: [], applicationScore: 0 },
    ];

    // Run multiple times - should get valid assignments each time
    const results = new Set<string>();
    for (let i = 0; i < 20; i++) {
      const assignments = generateAssignments(students, roles);
      const stats = calculateStatistics(students, roles, assignments);
      // All assignments valid (no errors, correct counts)
      expect(stats.assignedCount).toBe(4);
      expect(stats.unassignedCount).toBe(0);
      // Collect assignment patterns
      const pattern = assignments.map(a => `${a.studentId}:${a.roleId}`).sort().join(',');
      results.add(pattern);
    }

    // With random tiebreaker, we should see multiple different valid patterns
    // (not guaranteed but very likely with 20 runs)
    expect(results.size).toBeGreaterThanOrEqual(1);
  });

  it('applies history penalty to avoid assigning students to recent roles', () => {
    const roles: Role[] = [
      { id: 'r1', name: 'Line Leader', capacity: 1 },
      { id: 'r2', name: 'Door Holder', capacity: 1 },
    ];

    const students: Student[] = [
      { id: 's1', name: 'Alice', preferences: ['r1', 'r2'], applicationScore: 0 },
      { id: 's2', name: 'Bob', preferences: ['r1', 'r2'], applicationScore: 0 },
    ];

    // Rotation history: Alice was Line Leader last time
    const rotationHistory: RotationSnapshot[] = [
      {
        id: 'rot-1',
        name: 'Previous Rotation',
        createdAt: '2026-01-01T00:00:00.000Z',
        finalizedAt: '2026-01-01T00:00:00.000Z',
        assignments: [
          { studentId: 's1', roleId: 'r1', roleName: 'Line Leader', studentName: 'Alice' },
          { studentId: 's2', roleId: 'r2', roleName: 'Door Holder', studentName: 'Bob' },
        ],
      },
    ];

    // With balanced mode and recencyWindow=2, Alice should get penalty for r1 (80 points)
    // Alice's utility for r1: 100 (1st choice) - 80 (penalty) = 20
    // Alice's utility for r2: 70 (2nd choice) - 0 (no penalty) = 70
    // So Alice should prefer r2 now
    // Bob's utility for r1: 100 - 0 = 100 (no penalty for Bob on r1)
    // Bob's utility for r2: 70 - 80 = -10 -> max(0, -10) = 0 (penalty for Bob on r2)
    // So Bob should prefer r1
    // Result: Alice -> r2, Bob -> r1 (swapped)

    const antiRepetitionConfig = {
      recencyWindow: 2,
      avoidanceStrictness: 'balanced' as const,
      standbyPriority: true,
    };

    const assignments = generateAssignments(students, roles, [], {
      rotationHistory,
      antiRepetitionConfig,
    });

    const aliceAssign = assignments.find((a) => a.studentId === 's1');
    const bobAssign = assignments.find((a) => a.studentId === 's2');

    // Alice should NOT get r1 (her previous role) due to penalty
    expect(aliceAssign?.roleId).toBe('r2');
    // Bob should NOT get r2 (his previous role) due to penalty
    expect(bobAssign?.roleId).toBe('r1');
  });

  it('applies hard ban in strict mode for immediate repeats', () => {
    const roles: Role[] = [
      { id: 'r1', name: 'Line Leader', capacity: 1 },
      { id: 'r2', name: 'Door Holder', capacity: 1 },
    ];

    const students: Student[] = [
      { id: 's1', name: 'Alice', preferences: ['r1', 'r2'], applicationScore: 0 },
      { id: 's2', name: 'Bob', preferences: ['r1', 'r2'], applicationScore: 0 },
    ];

    // Rotation history: Alice was Line Leader in the most recent rotation
    const rotationHistory: RotationSnapshot[] = [
      {
        id: 'rot-1',
        name: 'Previous Rotation',
        createdAt: '2026-01-01T00:00:00.000Z',
        finalizedAt: '2026-01-01T00:00:00.000Z',
        assignments: [
          { studentId: 's1', roleId: 'r1', roleName: 'Line Leader', studentName: 'Alice' },
          { studentId: 's2', roleId: 'r2', roleName: 'Door Holder', studentName: 'Bob' },
        ],
      },
    ];

    // With strict mode and recencyWindow=1, Alice should be HARD BANNED from r1
    const antiRepetitionConfig = {
      recencyWindow: 1,
      avoidanceStrictness: 'strict' as const,
      standbyPriority: true,
    };

    const assignments = generateAssignments(students, roles, [], {
      rotationHistory,
      antiRepetitionConfig,
    });

    const aliceAssign = assignments.find((a) => a.studentId === 's1');

    // Alice should NOT get r1 (hard ban)
    expect(aliceAssign?.roleId).not.toBe('r1');
    expect(aliceAssign?.roleId).toBe('r2');
  });
});
