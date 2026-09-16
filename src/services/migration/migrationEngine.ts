import {
  AppData,
  Role,
  Student,
  Assignment,
  RotationSnapshot,
  AntiRepetitionConfig,
} from '../../types';

export interface AppDataEnvelopeV2 {
  schemaVersion: 2;
  lastModified: string;
  revision: number;
  data: {
    classTitle: string;
    roles: Role[];
    students: Student[];
    assignments: Assignment[];
    rotationHistory?: RotationSnapshot[];
    antiRepetitionConfig?: AntiRepetitionConfig;
  };
}

const DEFAULT_ANTI_REPETITION_CONFIG: AntiRepetitionConfig = {
  recencyWindow: 2,
  avoidanceStrictness: 'balanced',
  standbyPriority: true,
};

function isV1Data(data: unknown): data is AppData {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return (
    (obj.classTitle !== undefined ||
      obj.roles !== undefined ||
      obj.students !== undefined ||
      obj.assignments !== undefined) &&
    obj.schemaVersion === undefined
  );
}

function isV2Envelope(data: unknown): data is AppDataEnvelopeV2 {
  if (!data || typeof data !== 'object') return false;
  const obj = data as Record<string, unknown>;
  return obj.schemaVersion === 2 && obj.data !== undefined;
}

function validateRole(role: unknown): role is Role {
  if (!role || typeof role !== 'object') return false;
  const r = role as Record<string, unknown>;
  return typeof r.id === 'string' && typeof r.name === 'string' && typeof r.capacity === 'number';
}

function validateStudent(student: unknown): student is Student {
  if (!student || typeof student !== 'object') return false;
  const s = student as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.name === 'string' &&
    Array.isArray(s.preferences) &&
    s.preferences.every(p => typeof p === 'string') &&
    typeof s.applicationScore === 'number'
  );
}

function validateAssignment(assignment: unknown): assignment is Assignment {
  if (!assignment || typeof assignment !== 'object') return false;
  const a = assignment as Record<string, unknown>;
  return (
    typeof a.studentId === 'string' &&
    (a.roleId === null || typeof a.roleId === 'string') &&
    typeof a.isLocked === 'boolean'
  );
}

function validateRotationSnapshot(snapshot: unknown): snapshot is RotationSnapshot {
  if (!snapshot || typeof snapshot !== 'object') return false;
  const s = snapshot as Record<string, unknown>;
  return (
    typeof s.id === 'string' &&
    typeof s.name === 'string' &&
    typeof s.createdAt === 'string' &&
    typeof s.finalizedAt === 'string' &&
    Array.isArray(s.assignments)
  );
}

function validateAntiRepetitionConfig(config: unknown): config is AntiRepetitionConfig {
  if (!config || typeof config !== 'object') return false;
  const c = config as Record<string, unknown>;
  return (
    typeof c.recencyWindow === 'number' &&
    (c.avoidanceStrictness === 'strict' || c.avoidanceStrictness === 'balanced') &&
    typeof c.standbyPriority === 'boolean'
  );
}

function sanitizeV1Data(data: AppData): AppData {
  return {
    classTitle: typeof data.classTitle === 'string' ? data.classTitle : 'My Class',
    roles: Array.isArray(data.roles) ? data.roles.filter(validateRole) : [],
    students: Array.isArray(data.students) ? data.students.filter(validateStudent) : [],
    assignments: Array.isArray(data.assignments) ? data.assignments.filter(validateAssignment) : [],
    rotationHistory: Array.isArray(data.rotationHistory)
      ? data.rotationHistory.filter(validateRotationSnapshot)
      : [],
    antiRepetitionConfig: validateAntiRepetitionConfig(data.antiRepetitionConfig)
      ? data.antiRepetitionConfig!
      : DEFAULT_ANTI_REPETITION_CONFIG,
  };
}

function sanitizeV2Data(data: AppDataEnvelopeV2['data']): AppDataEnvelopeV2['data'] {
  return {
    classTitle: typeof data.classTitle === 'string' ? data.classTitle : 'My Class',
    roles: Array.isArray(data.roles) ? data.roles.filter(validateRole) : [],
    students: Array.isArray(data.students) ? data.students.filter(validateStudent) : [],
    assignments: Array.isArray(data.assignments) ? data.assignments.filter(validateAssignment) : [],
    rotationHistory: Array.isArray(data.rotationHistory)
      ? data.rotationHistory.filter(validateRotationSnapshot)
      : [],
    antiRepetitionConfig: validateAntiRepetitionConfig(data.antiRepetitionConfig)
      ? data.antiRepetitionConfig!
      : DEFAULT_ANTI_REPETITION_CONFIG,
  };
}

export function migrateV1ToV2(v1Data: AppData): AppDataEnvelopeV2 {
  const sanitized = sanitizeV1Data(v1Data);
  return {
    schemaVersion: 2,
    lastModified: new Date().toISOString(),
    revision: 1,
    data: {
      classTitle: sanitized.classTitle,
      roles: sanitized.roles,
      students: sanitized.students,
      assignments: sanitized.assignments,
      rotationHistory: sanitized.rotationHistory,
      antiRepetitionConfig: sanitized.antiRepetitionConfig,
    },
  };
}

export function validateV2Envelope(envelope: AppDataEnvelopeV2): AppDataEnvelopeV2 {
  if (!envelope || envelope.schemaVersion !== 2 || !envelope.data) {
    throw new Error('Invalid v2 envelope: missing schemaVersion or data');
  }
  return {
    schemaVersion: 2,
    lastModified:
      typeof envelope.lastModified === 'string' ? envelope.lastModified : new Date().toISOString(),
    revision: typeof envelope.revision === 'number' ? envelope.revision : 1,
    data: sanitizeV2Data(envelope.data),
  };
}

export function migrateToV2(input: unknown): AppDataEnvelopeV2 {
  if (isV2Envelope(input)) {
    return validateV2Envelope(input);
  }
  if (isV1Data(input)) {
    return migrateV1ToV2(input);
  }
  return {
    schemaVersion: 2,
    lastModified: new Date().toISOString(),
    revision: 1,
    data: {
      classTitle: 'My Class',
      roles: [],
      students: [],
      assignments: [],
      rotationHistory: [],
      antiRepetitionConfig: DEFAULT_ANTI_REPETITION_CONFIG,
    },
  };
}

export function createEmptyEnvelope(): AppDataEnvelopeV2 {
  return {
    schemaVersion: 2,
    lastModified: new Date().toISOString(),
    revision: 1,
    data: {
      classTitle: 'My Class',
      roles: [],
      students: [],
      assignments: [],
      rotationHistory: [],
      antiRepetitionConfig: DEFAULT_ANTI_REPETITION_CONFIG,
    },
  };
}
