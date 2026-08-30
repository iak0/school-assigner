export interface Role {
  id: string;
  name: string;
  capacity: number; // Number of available slots (e.g. 1, 2, 3)
  description?: string;
  icon?: string;
  color?: string;
}

export interface Student {
  id: string;
  name: string;
  // Ordered array of role IDs (up to 5 choices: 1st, 2nd, 3rd, 4th, 5th)
  preferences: string[];
  // Teacher score rating for application letter: -3 to +3
  applicationScore: number;
  notes?: string;
}

export interface Assignment {
  studentId: string;
  roleId: string | null; // null if unassigned
  isLocked: boolean;
}

export interface AssignmentWithDetails extends Assignment {
  studentName: string;
  roleName: string | null;
  assignedRank: number | null; // 1 = 1st choice, 2 = 2nd choice, ..., null = unranked or unassigned
  letterScore: number;
  utilityContribution: number;
}

export interface MatchConfig {
  // Utility points for each choice rank
  rankScores: {
    1: number;
    2: number;
    3: number;
    4: number;
    5: number;
    unranked: number;
  };
  // Bonus/penalty points applied based on application letter score (-3 to +3)
  letterScoreWeights: {
    [score: number]: number;
  };
}

export interface MatchStatistics {
  totalStudents: number;
  totalSlots: number;
  assignedCount: number;
  unassignedCount: number;
  choiceDistribution: {
    firstChoice: number;
    secondChoice: number;
    thirdChoice: number;
    fourthChoice: number;
    fifthChoice: number;
    unranked: number;
  };
  averageRank: number | null; // among assigned students who got a ranked choice
  topTwoPercent: number; // % of assigned students who got top 2 choices
  topThreePercent: number; // % of assigned students who got top 3 choices
  rawUtilityScore: number; // The exact objective function score being maximized
  maxPossibleUtilityScore: number; // If every assigned slot was a 1st choice with max letter score
  satisfactionPercentage: number; // 0 - 100%
}

export interface AppData {
  roles: Role[];
  students: Student[];
  assignments: Assignment[];
}
