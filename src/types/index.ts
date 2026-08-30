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
  // Teacher adjustment score: -3 to +3
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
  adjustmentScore: number;
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
  // Bonus/penalty points applied based on teacher adjustment score (-3 to +3)
  adjustmentScoreWeights: {
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
  rawUtilityScore: number; // The exact objective function score being maximized
  maxPossibleUtilityScore: number; // Theoretical max if every assigned slot was a 1st choice with max adjustment score
  optimalityPercentage: number; // Current score / theoretical optimal score (ignoring locks & manual moves) 0-100%
}

export interface AppData {
  classTitle: string;
  roles: Role[];
  students: Student[];
  assignments: Assignment[];
}
