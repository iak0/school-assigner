import { Student, Role, Assignment, MatchConfig, MatchStatistics, AssignmentWithDetails } from '../types';

export const DEFAULT_CONFIG: MatchConfig = {
  rankScores: {
    1: 100,
    2: 70,
    3: 45,
    4: 25,
    5: 10,
    unranked: 0,
  },
  letterScoreWeights: {
    3: 45,
    2: 25,
    1: 10,
    0: 0,
    '-1': -10,
    '-2': -25,
    '-3': -45,
  },
};

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

  const letterBonus = config.letterScoreWeights[student.applicationScore] ?? 0;
  const utility = Math.max(0, baseScore + letterBonus);

  return { rank, utility };
}

/**
 * Generates optimal student-to-role assignments while strictly respecting locked assignments.
 */
export function generateAssignments(
  students: Student[],
  roles: Role[],
  existingAssignments: Assignment[] = [],
  config: MatchConfig = DEFAULT_CONFIG
): Assignment[] {
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

  for (let i = 0; i < numStudents; i++) {
    const student = unlockedStudents[i];
    const studentNode = 1 + i;

    for (let j = 0; j < numSlots; j++) {
      const slot = roleSlots[j];
      const slotNode = 1 + numStudents + j;

      const { utility } = calculateStudentUtility(student, slot.roleId, config);

      // Min-cost seeks minimum, so cost = MAX_POSSIBLE_WEIGHT - utility
      const cost = MAX_POSSIBLE_WEIGHT - utility;
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

  const topTwoCount = choiceDistribution.firstChoice + choiceDistribution.secondChoice;
  const topThreeCount = topTwoCount + choiceDistribution.thirdChoice;

  const topTwoPercent = assignedCount > 0 ? Math.round((topTwoCount / assignedCount) * 100) : 0;
  const topThreePercent = assignedCount > 0 ? Math.round((topThreeCount / assignedCount) * 100) : 0;

  // Max theoretical utility: each assigned slot filled with a 1st choice + max possible letter bonus (+45)
  const maxPossibleUtilityScore = assignedCount * (config.rankScores[1] + (config.letterScoreWeights[3] || 45));
  const satisfactionPercentage =
    maxPossibleUtilityScore > 0 ? Math.min(100, Math.round((rawUtilityScore / maxPossibleUtilityScore) * 100)) : 0;

  return {
    totalStudents: students.length,
    totalSlots,
    assignedCount,
    unassignedCount,
    choiceDistribution,
    averageRank,
    topTwoPercent,
    topThreePercent,
    rawUtilityScore,
    maxPossibleUtilityScore,
    satisfactionPercentage,
  };
}

/**
 * Returns full details for each assignment including student name, role name, rank badge info, and utility.
 */
export function getDetailedAssignments(
  students: Student[],
  roles: Role[],
  assignments: Assignment[],
  config: MatchConfig = DEFAULT_CONFIG
): AssignmentWithDetails[] {
  const studentMap = new Map<string, Student>(students.map((s) => [s.id, s]));
  const roleMap = new Map<string, Role>(roles.map((r) => [r.id, r]));

  return assignments.map((assign) => {
    const student = studentMap.get(assign.studentId);
    const role = assign.roleId ? roleMap.get(assign.roleId) || null : null;

    if (!student) {
      return {
        studentId: assign.studentId,
        roleId: assign.roleId,
        isLocked: assign.isLocked,
        studentName: 'Unknown Student',
        roleName: role ? role.name : null,
        assignedRank: null,
        letterScore: 0,
        utilityContribution: 0,
      };
    }

    const { rank, utility } = calculateStudentUtility(student, assign.roleId, config);

    return {
      studentId: student.id,
      roleId: assign.roleId,
      isLocked: assign.isLocked,
      studentName: student.name,
      roleName: role ? role.name : null,
      assignedRank: rank,
      letterScore: student.applicationScore,
      utilityContribution: utility,
    };
  });
}
