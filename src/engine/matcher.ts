import { Student, Role, Assignment, MatchConfig, MatchStatistics, AssignmentWithDetails, RotationSnapshot, AntiRepetitionConfig } from '../types';

export const DEFAULT_CONFIG: MatchConfig = {
  rankScores: {
    1: 100,
    2: 70,
    3: 45,
    4: 25,
    5: 10,
    unranked: 0,
  },
  adjustmentScoreWeights: {
    3: 45,
    2: 25,
    1: 10,
    0: 0,
    '-1': -10,
    '-2': -25,
    '-3': -45,
  },
};

// Anti-repetition constants
export const RECENCY_PENALTIES: Record<number, number> = {
  1: 80,   // 1 cycle ago (most recent) - heavy penalty
  2: 40,   // 2 cycles ago - moderate
  3: 15,   // 3 cycles ago - light
};

export const STANDBY_BOOST = 35; // +35 utility for students unassigned last cycle

export const DEFAULT_ANTI_REPETITION_CONFIG: AntiRepetitionConfig = {
  recencyWindow: 2,
  avoidanceStrictness: 'balanced',
  standbyPriority: true,
};

/**
 * Calculates the history penalty for a student-role pair based on past rotations.
 * Returns penalty in utility points (subtracted from utility).
 * Returns Infinity for hard ban in strict mode.
 */
export function calculateHistoryPenalty(
  studentId: string,
  roleId: string,
  history: RotationSnapshot[],
  config: AntiRepetitionConfig
): number {
  if (history.length === 0) return 0;

  // Get most recent rotations first, limited by recencyWindow
  const recentRotations = history.slice(-config.recencyWindow).reverse();

  let penalty = 0;
  for (let i = 0; i < recentRotations.length; i++) {
    const rotation = recentRotations[i];
    const assignment = rotation.assignments.find(a => a.studentId === studentId);
    if (assignment && assignment.roleId === roleId) {
      const cycleAgo = i + 1;
      if (config.avoidanceStrictness === 'strict' && cycleAgo === 1) {
        return Infinity; // Hard ban for immediate repeat
      }
      penalty += RECENCY_PENALTIES[cycleAgo] ?? 0;
    }
  }
  return penalty;
}

/**
 * Calculates the standby boost for a student who was unassigned in the last rotation.
 * Returns boost in utility points (added to utility).
 */
export function calculateStandbyBoost(
  studentId: string,
  history: RotationSnapshot[],
  config: AntiRepetitionConfig
): number {
  if (!config.standbyPriority || history.length === 0) return 0;

  const lastRotation = history[history.length - 1];
  const assignment = lastRotation.assignments.find(a => a.studentId === studentId);
  if (assignment && assignment.roleId === null) {
    return STANDBY_BOOST;
  }
  return 0;
}

interface FlowEdge {
  to: number;
  rev: number;
  cap: number;
  flow: number;
  cost: number;
  studentId?: string;
  roleId?: string;
}

class MinCostMaxFlow {
  private n: number;
  private adj: FlowEdge[][];

  constructor(n: number) {
    this.n = n;
    this.adj = Array.from({ length: n }, () => []);
  }

  addEdge(from: number, to: number, cap: number, cost: number, studentId?: string, roleId?: string) {
    const forward: FlowEdge = { to, rev: this.adj[to].length, cap, flow: 0, cost, studentId, roleId };
    const backward: FlowEdge = { to: from, rev: this.adj[from].length, cap: 0, flow: 0, cost: -cost };
    this.adj[from].push(forward);
    this.adj[to].push(backward);
  }

  solve(source: number, sink: number, maxFlowRequired: number): { flow: number; cost: number } {
    let totalFlow = 0;
    let totalCost = 0;

    while (totalFlow < maxFlowRequired) {
      const dist = new Array(this.n).fill(Infinity);
      const parent = new Array(this.n).fill(-1);
      const parentEdge = new Array(this.n).fill(-1);
      const inQueue = new Array(this.n).fill(false);
      const queue: number[] = [];

      dist[source] = 0;
      queue.push(source);
      inQueue[source] = true;

      while (queue.length > 0) {
        const u = queue.shift()!;
        inQueue[u] = false;

        for (let i = 0; i < this.adj[u].length; i++) {
          const edge = this.adj[u][i];
          if (edge.cap - edge.flow > 0 && dist[u] + edge.cost < dist[edge.to]) {
            dist[edge.to] = dist[u] + edge.cost;
            parent[edge.to] = u;
            parentEdge[edge.to] = i;

            if (!inQueue[edge.to]) {
              queue.push(edge.to);
              inQueue[edge.to] = true;
            }
          }
        }
      }

      if (dist[sink] === Infinity) {
        break; // No more augmenting paths
      }

      // Find bottleneck capacity along the shortest path
      let push = maxFlowRequired - totalFlow;
      let curr = sink;
      while (curr !== source) {
        const p = parent[curr];
        const edgeIdx = parentEdge[curr];
        const edge = this.adj[p][edgeIdx];
        push = Math.min(push, edge.cap - edge.flow);
        curr = p;
      }

      // Augment flow
      curr = sink;
      while (curr !== source) {
        const p = parent[curr];
        const edgeIdx = parentEdge[curr];
        this.adj[p][edgeIdx].flow += push;
        const revIdx = this.adj[p][edgeIdx].rev;
        this.adj[curr][revIdx].flow -= push;
        totalCost += push * this.adj[p][edgeIdx].cost;
        curr = p;
      }

      totalFlow += push;
    }

    return { flow: totalFlow, cost: totalCost };
  }

  getAssignments(): { studentId: string; roleId: string }[] {
    const matches: { studentId: string; roleId: string }[] = [];
    for (const edges of this.adj) {
      for (const edge of edges) {
        if (edge.flow > 0 && edge.studentId && edge.roleId) {
          matches.push({ studentId: edge.studentId, roleId: edge.roleId });
        }
      }
    }
    return matches;
  }
}

/**
 * Calculates raw utility points for a single student assigned to a role.
 */
export function calculateStudentUtility(
  student: Student,
  roleId: string | null,
  config: MatchConfig = DEFAULT_CONFIG
): { rank: number | null; utility: number } {
  if (!roleId) {
    return { rank: null, utility: 0 };
  }

  const prefIndex = student.preferences.indexOf(roleId);
  const rank = prefIndex !== -1 ? prefIndex + 1 : null;

  let baseScore = 0;
  if (rank === 1) baseScore = config.rankScores[1];
  else if (rank === 2) baseScore = config.rankScores[2];
  else if (rank === 3) baseScore = config.rankScores[3];
  else if (rank === 4) baseScore = config.rankScores[4];
  else if (rank === 5) baseScore = config.rankScores[5];
  else baseScore = config.rankScores.unranked;

  const adjustmentBonus = config.adjustmentScoreWeights[student.applicationScore] ?? 0;
  const utility = Math.max(0, baseScore + adjustmentBonus);

  return { rank, utility };
}

interface GenerateAssignmentsOptions {
  rotationHistory?: RotationSnapshot[];
  antiRepetitionConfig?: AntiRepetitionConfig;
}

/**
 * Generates optimal student-to-role assignments while strictly respecting locked assignments.
 */
export function generateAssignments(
  students: Student[],
  roles: Role[],
  existingAssignments: Assignment[] = [],
  options: GenerateAssignmentsOptions = {}
): Assignment[] {
  const { rotationHistory = [], antiRepetitionConfig = DEFAULT_ANTI_REPETITION_CONFIG } = options;
  const config: MatchConfig = DEFAULT_CONFIG; // Keep using DEFAULT_CONFIG for rank scores and adjustment weights
  const roleMap = new Map<string, Role>(roles.map((r) => [r.id, r]));
  const lockedAssignmentMap = new Map<string, Assignment>();

  // Extract locked assignments
  for (const assign of existingAssignments) {
    if (assign.isLocked) {
      lockedAssignmentMap.set(assign.studentId, assign);
    }
  }

  // Calculate remaining capacities for roles
  const remainingCapacity = new Map<string, number>();
  for (const role of roles) {
    remainingCapacity.set(role.id, role.capacity);
  }

  // Deduct locked student slots
  const finalAssignments: Assignment[] = [];
  const unlockedStudents: Student[] = [];

  for (const student of students) {
    const locked = lockedAssignmentMap.get(student.id);
    if (locked) {
      if (locked.roleId && roleMap.has(locked.roleId)) {
        const curCap = remainingCapacity.get(locked.roleId) ?? 0;
        if (curCap > 0) {
          remainingCapacity.set(locked.roleId, curCap - 1);
          finalAssignments.push({
            studentId: student.id,
            roleId: locked.roleId,
            isLocked: true,
          });
          continue;
        }
      }
      // If locked as unassigned or role no longer exists/is over-capacity
      finalAssignments.push({
        studentId: student.id,
        roleId: locked.roleId && roleMap.has(locked.roleId) ? locked.roleId : null,
        isLocked: true,
      });
    } else {
      unlockedStudents.push(student);
    }
  }

  // Flatten role slots for available unlocked capacity
  interface RoleSlot {
    roleId: string;
    slotIndex: number;
  }
  const roleSlots: RoleSlot[] = [];
  for (const role of roles) {
    const cap = remainingCapacity.get(role.id) ?? 0;
    for (let s = 0; s < cap; s++) {
      roleSlots.push({ roleId: role.id, slotIndex: s });
    }
  }

  if (unlockedStudents.length === 0 || roleSlots.length === 0) {
    // Fill remaining unlocked students as unassigned
    for (const s of unlockedStudents) {
      finalAssignments.push({
        studentId: s.id,
        roleId: null,
        isLocked: false,
      });
    }
    return finalAssignments;
  }

  // Build Min-Cost Max-Flow Graph
  const numStudents = unlockedStudents.length;
  const numSlots = roleSlots.length;
  const source = 0;
  const sink = 1 + numStudents + numSlots;
  const totalNodes = sink + 1;

  const mcmf = new MinCostMaxFlow(totalNodes);

  // Connect Source to each Student (1 to numStudents)
  for (let i = 0; i < numStudents; i++) {
    const studentNode = 1 + i;
    mcmf.addEdge(source, studentNode, 1, 0);
  }

  // Connect each Student to each Role Slot
  const MAX_POSSIBLE_WEIGHT = 200; // ensures positive edge costs

  // Small random tiebreaker to avoid deterministic assignment when utilities are equal
  // This is much smaller than the minimum utility difference (10 points) so it only breaks exact ties
  const TIEBREAKER_EPSILON = 0.0001;

  for (let i = 0; i < numStudents; i++) {
    const student = unlockedStudents[i];
    const studentNode = 1 + i;

    // Calculate history penalty and standby boost for this student
    const historyPenaltyMap = new Map<string, number>();
    const standbyBoost = calculateStandbyBoost(student.id, rotationHistory, antiRepetitionConfig);

    for (let j = 0; j < numSlots; j++) {
      const slot = roleSlots[j];
      const slotNode = 1 + numStudents + j;

      const { utility } = calculateStudentUtility(student, slot.roleId, config);

      // Calculate history penalty for this student-role pair
      let historyPenalty = historyPenaltyMap.get(slot.roleId);
      if (historyPenalty === undefined) {
        historyPenalty = calculateHistoryPenalty(student.id, slot.roleId, rotationHistory, antiRepetitionConfig);
        historyPenaltyMap.set(slot.roleId, historyPenalty);
      }

      // If hard ban (Infinity), use a very high cost to effectively prevent assignment
      if (historyPenalty === Infinity) {
        mcmf.addEdge(studentNode, slotNode, 1, MAX_POSSIBLE_WEIGHT * 10, student.id, slot.roleId);
        continue;
      }

      // Adjusted utility = base utility - history penalty + standby boost
      const adjustedUtility = Math.max(0, utility - historyPenalty + standbyBoost);

      // Min-cost seeks minimum, so cost = MAX_POSSIBLE_WEIGHT - adjustedUtility
      // Add tiny random tiebreaker to avoid always picking the same student/role on equal utility
      const tiebreaker = Math.random() * TIEBREAKER_EPSILON;
      const cost = MAX_POSSIBLE_WEIGHT - adjustedUtility + tiebreaker;
      mcmf.addEdge(studentNode, slotNode, 1, cost, student.id, slot.roleId);
    }
  }

  // Connect each Role Slot to Sink
  for (let j = 0; j < numSlots; j++) {
    const slotNode = 1 + numStudents + j;
    mcmf.addEdge(slotNode, sink, 1, 0);
  }

  // Target flow is min(available students, available slots)
  const maxFlowRequired = Math.min(numStudents, numSlots);
  mcmf.solve(source, sink, maxFlowRequired);

  const matchedEdges = mcmf.getAssignments();
  const matchedStudentMap = new Map<string, string>();
  for (const m of matchedEdges) {
    matchedStudentMap.set(m.studentId, m.roleId);
  }

  // Assemble final assignments
  for (const student of unlockedStudents) {
    const assignedRole = matchedStudentMap.get(student.id) || null;
    finalAssignments.push({
      studentId: student.id,
      roleId: assignedRole,
      isLocked: false,
    });
  }

  return finalAssignments;
}

/**
 * Calculates the theoretical optimal utility score assuming the same student rankings
 * and adjustment scores, but WITHOUT considering locked assignments or manual moves.
 * This represents the best possible outcome the algorithm could achieve.
 */
function calculateTheoreticalOptimum(
  students: Student[],
  roles: Role[],
  config: MatchConfig = DEFAULT_CONFIG
): number {
  // Run the matching algorithm without any locked assignments
  const unlockedAssignments = students.map((s) => ({ studentId: s.id, roleId: null, isLocked: false }));
  const optimalAssignments = generateAssignments(students, roles, unlockedAssignments, {});

  // Calculate utility score of this optimal assignment
  const studentMap = new Map<string, Student>(students.map((s) => [s.id, s]));
  let totalUtility = 0;

  for (const assign of optimalAssignments) {
    if (!assign.roleId) continue;
    const student = studentMap.get(assign.studentId);
    if (!student) continue;
    const { utility } = calculateStudentUtility(student, assign.roleId, config);
    totalUtility += utility;
  }

  return totalUtility;
}

/**
 * Calculates comprehensive match statistics and satisfaction metrics.
 */
export function calculateStatistics(
  students: Student[],
  roles: Role[],
  assignments: Assignment[],
  config: MatchConfig = DEFAULT_CONFIG
): MatchStatistics {
  const studentMap = new Map<string, Student>(students.map((s) => [s.id, s]));
  const roleMap = new Map<string, Role>(roles.map((r) => [r.id, r]));

  const totalSlots = roles.reduce((sum, r) => sum + r.capacity, 0);
  let assignedCount = 0;
  let rawUtilityScore = 0;

  const choiceDistribution = {
    firstChoice: 0,
    secondChoice: 0,
    thirdChoice: 0,
    fourthChoice: 0,
    fifthChoice: 0,
    unranked: 0,
  };

  let totalRankSum = 0;
  let rankedCount = 0;

  for (const assign of assignments) {
    if (!assign.roleId || !roleMap.has(assign.roleId)) {
      continue;
    }

    const student = studentMap.get(assign.studentId);
    if (!student) continue;

    assignedCount++;
    const { rank, utility } = calculateStudentUtility(student, assign.roleId, config);
    rawUtilityScore += utility;

    if (rank === 1) {
      choiceDistribution.firstChoice++;
      totalRankSum += 1;
      rankedCount++;
    } else if (rank === 2) {
      choiceDistribution.secondChoice++;
      totalRankSum += 2;
      rankedCount++;
    } else if (rank === 3) {
      choiceDistribution.thirdChoice++;
      totalRankSum += 3;
      rankedCount++;
    } else if (rank === 4) {
      choiceDistribution.fourthChoice++;
      totalRankSum += 4;
      rankedCount++;
    } else if (rank === 5) {
      choiceDistribution.fifthChoice++;
      totalRankSum += 5;
      rankedCount++;
    } else {
      choiceDistribution.unranked++;
    }
  }

  const unassignedCount = students.length - assignedCount;
  const averageRank = rankedCount > 0 ? Number((totalRankSum / rankedCount).toFixed(2)) : null;

  // Max theoretical utility: each assigned slot filled with a 1st choice (no letter bonus)
  // This measures pure preference satisfaction independent of adjustment quality
  const maxPossibleUtilityScore = assignedCount * config.rankScores[1]; // 100 points per student

  // Theoretical optimal score: best possible outcome without locks/manual overrides
  const theoreticalOptimalScore = calculateTheoreticalOptimum(students, roles, config);
  const optimalityPercentage =
    theoreticalOptimalScore > 0 ? Math.min(100, Math.round((rawUtilityScore / theoreticalOptimalScore) * 100)) : 0;

  return {
    totalStudents: students.length,
    totalSlots,
    assignedCount,
    unassignedCount,
    choiceDistribution,
    averageRank,
    rawUtilityScore,
    maxPossibleUtilityScore,
    optimalityPercentage,
  };
}

/**
 * Returns full details for each assignment including student name, role name, rank badge info, and utility.
 * Includes ALL students - those without assignments will have roleId: null.
 */
export function getDetailedAssignments(
  students: Student[],
  roles: Role[],
  assignments: Assignment[],
  config: MatchConfig = DEFAULT_CONFIG
): AssignmentWithDetails[] {
  const roleMap = new Map<string, Role>(roles.map((r) => [r.id, r]));
  const assignmentMap = new Map<string, Assignment>(assignments.map((a) => [a.studentId, a]));

  return students.map((student) => {
    const assign = assignmentMap.get(student.id);
    const role = assign?.roleId ? roleMap.get(assign.roleId) || null : null;

    const { rank, utility } = calculateStudentUtility(student, assign?.roleId ?? null, config);

    return {
      studentId: student.id,
      roleId: assign?.roleId ?? null,
      isLocked: assign?.isLocked ?? false,
      studentName: student.name,
      roleName: role ? role.name : null,
      assignedRank: rank,
      adjustmentScore: student.applicationScore,
      utilityContribution: utility,
      preferences: student.preferences,
    };
  });
}
