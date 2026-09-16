import { describe, it, expect, vi } from 'vitest';
import {
  migrateToV2,
  migrateV1ToV2,
  validateV2Envelope,
  createEmptyEnvelope,
  AppDataEnvelopeV2,
} from './migrationEngine';
import { Role, Student, Assignment, RotationSnapshot, AntiRepetitionConfig } from '../../types';

describe('Migration Engine', () => {
  const validRole: Role = { id: 'r1', name: 'Line Leader', capacity: 2 };
  const validStudent: Student = {
    id: 's1',
    name: 'Alice',
    preferences: ['r1'],
    applicationScore: 0,
  };
  const validAssignment: Assignment = { studentId: 's1', roleId: 'r1', isLocked: false };
  const validRotationSnapshot: RotationSnapshot = {
    id: 'rot-1',
    name: 'Week 1',
    createdAt: '2024-01-01T00:00:00Z',
    finalizedAt: '2024-01-01T00:00:00Z',
    assignments: [{ studentId: 's1', roleId: 'r1', roleName: 'Line Leader', studentName: 'Alice' }],
  };
  const validAntiRepetitionConfig: AntiRepetitionConfig = {
    recencyWindow: 2,
    avoidanceStrictness: 'balanced',
    standbyPriority: true,
  };

  describe('migrateToV2', () => {
    it('should create empty envelope for undefined input', () => {
      const result = migrateToV2(undefined);
      expect(result.schemaVersion).toBe(2);
      expect(result.data.classTitle).toBe('My Class');
      expect(result.data.roles).toEqual([]);
      expect(result.data.students).toEqual([]);
      expect(result.data.assignments).toEqual([]);
    });

    it('should create empty envelope for null input', () => {
      const result = migrateToV2(null);
      expect(result.schemaVersion).toBe(2);
      expect(result.data.classTitle).toBe('My Class');
    });

    it('should create empty envelope for empty object', () => {
      const result = migrateToV2({});
      expect(result.schemaVersion).toBe(2);
      expect(result.data.classTitle).toBe('My Class');
    });

    it('should migrate v1 data (no schemaVersion) to v2', () => {
      const v1Data = {
        classTitle: 'Grade 4A',
        roles: [validRole],
        students: [validStudent],
        assignments: [validAssignment],
        rotationHistory: [validRotationSnapshot],
        antiRepetitionConfig: validAntiRepetitionConfig,
      };
      const result = migrateToV2(v1Data);
      expect(result.schemaVersion).toBe(2);
      expect(result.data.classTitle).toBe('Grade 4A');
      expect(result.data.roles).toHaveLength(1);
      expect(result.data.students).toHaveLength(1);
      expect(result.data.assignments).toHaveLength(1);
      expect(result.data.rotationHistory).toHaveLength(1);
      expect(result.data.antiRepetitionConfig).toEqual(validAntiRepetitionConfig);
      expect(result.revision).toBe(1);
    });

    it('should migrate v1 data with missing optional fields', () => {
      const v1Data = {
        classTitle: 'Grade 4A',
        roles: [validRole],
      };
      const result = migrateToV2(v1Data);
      expect(result.data.classTitle).toBe('Grade 4A');
      expect(result.data.roles).toHaveLength(1);
      expect(result.data.students).toEqual([]);
      expect(result.data.assignments).toEqual([]);
      expect(result.data.rotationHistory).toEqual([]);
      expect(result.data.antiRepetitionConfig).toEqual(validAntiRepetitionConfig);
    });

    it('should validate and pass through v2 envelope', () => {
      const v2Envelope: AppDataEnvelopeV2 = {
        schemaVersion: 2,
        lastModified: '2024-01-01T00:00:00Z',
        revision: 5,
        data: {
          classTitle: 'Grade 4B',
          roles: [validRole],
          students: [validStudent],
          assignments: [validAssignment],
          rotationHistory: [validRotationSnapshot],
          antiRepetitionConfig: validAntiRepetitionConfig,
        },
      };
      const result = migrateToV2(v2Envelope);
      expect(result).toEqual(v2Envelope);
    });

    it('should sanitize v2 envelope with invalid data', () => {
      const v2Envelope = {
        schemaVersion: 2,
        lastModified: '2024-01-01T00:00:00Z',
        revision: 5,
        data: {
          classTitle: 123,
          roles: [validRole, { invalid: true }],
          students: [validStudent, null],
          assignments: [validAssignment, { studentId: 's2' }],
          rotationHistory: [validRotationSnapshot, { id: 'bad' }],
          antiRepetitionConfig: { invalid: true },
        },
      };
      const result = migrateToV2(v2Envelope);
      expect(result.data.classTitle).toBe('My Class');
      expect(result.data.roles).toHaveLength(1);
      expect(result.data.students).toHaveLength(1);
      expect(result.data.assignments).toHaveLength(1);
      expect(result.data.rotationHistory).toHaveLength(1);
      expect(result.data.antiRepetitionConfig).toEqual(validAntiRepetitionConfig);
    });
  });

  describe('migrateV1ToV2', () => {
    it('should create proper v2 envelope from valid v1 data', () => {
      const v1Data = {
        classTitle: 'Test Class',
        roles: [validRole],
        students: [validStudent],
        assignments: [validAssignment],
      };
      const result = migrateV1ToV2(v1Data);
      expect(result.schemaVersion).toBe(2);
      expect(result.revision).toBe(1);
      expect(result.data.classTitle).toBe('Test Class');
      expect(result.data.roles).toEqual([validRole]);
      expect(result.data.students).toEqual([validStudent]);
      expect(result.data.assignments).toEqual([validAssignment]);
    });

    it('should filter out invalid roles', () => {
      const v1Data = {
        classTitle: 'Test',
        roles: [validRole, { id: 'r2', name: 'Invalid', capacity: 'two' }, null],
      };
      const result = migrateV1ToV2(v1Data);
      expect(result.data.roles).toHaveLength(1);
      expect(result.data.roles[0].id).toBe('r1');
    });

    it('should filter out invalid students', () => {
      const v1Data = {
        classTitle: 'Test',
        students: [
          validStudent,
          { id: 's2', name: 'Bob', preferences: 'not-array', applicationScore: 0 },
        ],
      };
      const result = migrateV1ToV2(v1Data);
      expect(result.data.students).toHaveLength(1);
    });

    it('should filter out invalid assignments', () => {
      const v1Data = {
        classTitle: 'Test',
        assignments: [validAssignment, { studentId: 's2', roleId: 'r1' }],
      };
      const result = migrateV1ToV2(v1Data);
      expect(result.data.assignments).toHaveLength(1);
    });

    it('should use default anti-repetition config when missing', () => {
      const v1Data = { classTitle: 'Test', roles: [], students: [], assignments: [] };
      const result = migrateV1ToV2(v1Data);
      expect(result.data.antiRepetitionConfig).toEqual(validAntiRepetitionConfig);
    });
  });

  describe('validateV2Envelope', () => {
    it('should throw on missing schemaVersion', () => {
      const envelope = {
        lastModified: '2024-01-01T00:00:00Z',
        revision: 1,
        data: { classTitle: 'Test', roles: [], students: [], assignments: [] },
      };
      expect(() => validateV2Envelope(envelope as unknown as AppDataEnvelopeV2)).toThrow();
    });

    it('should throw on wrong schemaVersion', () => {
      const envelope = {
        schemaVersion: 1,
        lastModified: '2024-01-01T00:00:00Z',
        revision: 1,
        data: { classTitle: 'Test', roles: [], students: [], assignments: [] },
      };
      expect(() => validateV2Envelope(envelope as unknown as AppDataEnvelopeV2)).toThrow();
    });

    it('should throw on missing data', () => {
      const envelope = {
        schemaVersion: 2,
        lastModified: '2024-01-01T00:00:00Z',
        revision: 1,
      };
      expect(() => validateV2Envelope(envelope as unknown as AppDataEnvelopeV2)).toThrow();
    });

    it('should sanitize and return valid envelope', () => {
      const envelope: AppDataEnvelopeV2 = {
        schemaVersion: 2,
        lastModified: '2024-01-01T00:00:00Z',
        revision: 1,
        data: {
          classTitle: 'Test',
          roles: [validRole],
          students: [validStudent],
          assignments: [validAssignment],
          rotationHistory: [],
          antiRepetitionConfig: validAntiRepetitionConfig,
        },
      };
      const result = validateV2Envelope(envelope);
      expect(result).toEqual(envelope);
    });
  });

  describe('createEmptyEnvelope', () => {
    it('should create valid empty envelope', () => {
      const result = createEmptyEnvelope();
      expect(result.schemaVersion).toBe(2);
      expect(result.revision).toBe(1);
      expect(result.data.classTitle).toBe('My Class');
      expect(result.data.roles).toEqual([]);
      expect(result.data.students).toEqual([]);
      expect(result.data.assignments).toEqual([]);
      expect(result.data.rotationHistory).toEqual([]);
      expect(result.data.antiRepetitionConfig).toEqual(validAntiRepetitionConfig);
    });
  });
});
