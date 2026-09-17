import { DBSchema, IDBPDatabase, openDB } from 'idb';

import { AppData } from '../../types';
import { AppDataEnvelopeV2, migrateToV2 } from '../migration/migrationEngine';

const DB_NAME = 'ClassroomRoleAssignerDB';
const DB_VERSION = 1;
const STORE_NAME = 'workspace';
const BACKUP_STORE_NAME = 'backups';
const LEGACY_LOCALSTORAGE_KEY = 'classroom_role_assigner_data_v1';

export interface WorkspaceRecord {
  id: string;
  data: AppDataEnvelopeV2;
  updatedAt: string;
}

export interface BackupRecord {
  id: string;
  source: 'localStorage' | 'migration' | 'manual';
  data: string;
  createdAt: string;
}

interface AppDB extends DBSchema {
  [STORE_NAME]: {
    key: string;
    value: WorkspaceRecord;
  };
  [BACKUP_STORE_NAME]: {
    key: string;
    value: BackupRecord;
  };
}

let dbInstance: IDBPDatabase<AppDB> | null = null;

async function getDB(): Promise<IDBPDatabase<AppDB>> {
  if (dbInstance) return dbInstance;

  dbInstance = await openDB<AppDB>(DB_NAME, DB_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!db.objectStoreNames.contains(BACKUP_STORE_NAME)) {
        db.createObjectStore(BACKUP_STORE_NAME, { keyPath: 'id' });
      }
    },
  });
  return dbInstance;
}

function createEnvelope(data: AppData): AppDataEnvelopeV2 {
  return {
    schemaVersion: 2,
    lastModified: new Date().toISOString(),
    revision: 1,
    data: {
      classTitle: data.classTitle || 'My Class',
      roles: data.roles || [],
      students: data.students || [],
      assignments: data.assignments || [],
      rotationHistory: data.rotationHistory || [],
      antiRepetitionConfig: data.antiRepetitionConfig,
    },
  };
}

async function createBackup(source: BackupRecord['source'], data: string): Promise<void> {
  const db = await getDB();
  const backup: BackupRecord = {
    id: `backup-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`,
    source,
    data,
    createdAt: new Date().toISOString(),
  };
  await db.add(BACKUP_STORE_NAME, backup);
}

export async function getWorkspace(): Promise<AppDataEnvelopeV2 | null> {
  const db = await getDB();
  const record = await db.get(STORE_NAME, 'main');

  if (!record) {
    const legacyData = localStorage.getItem(LEGACY_LOCALSTORAGE_KEY);
    if (legacyData) {
      await createBackup('localStorage', legacyData);
      try {
        const parsed = JSON.parse(legacyData) as AppData;
        const migrated = migrateToV2(parsed);
        await saveWorkspace(migrated.data);
        return migrated;
      } catch (e) {
        console.error('[IndexedDB] Failed to migrate legacy data:', e);
      }
    }
    return null;
  }

  return record.data;
}

export async function saveWorkspace(data: AppDataEnvelopeV2['data']): Promise<void> {
  const db = await getDB();
  const envelope: AppDataEnvelopeV2 = {
    schemaVersion: 2,
    lastModified: new Date().toISOString(),
    revision: 1,
    data,
  };
  await db.put(STORE_NAME, { id: 'main', data: envelope, updatedAt: new Date().toISOString() });
}

export async function updateWorkspace(
  partial: Partial<AppDataEnvelopeV2['data']>
): Promise<AppDataEnvelopeV2 | null> {
  const current = await getWorkspace();
  if (!current) {
    const envelope = createEnvelope({
      classTitle: partial.classTitle || 'My Class',
      roles: partial.roles || [],
      students: partial.students || [],
      assignments: partial.assignments || [],
      rotationHistory: partial.rotationHistory || [],
      antiRepetitionConfig: partial.antiRepetitionConfig,
    });
    await saveWorkspace(envelope.data);
    return envelope;
  }

  const merged = {
    ...current.data,
    ...partial,
    revision: current.revision + 1,
    lastModified: new Date().toISOString(),
  };
  await saveWorkspace(merged);
  return { ...current, ...merged };
}

export async function clearWorkspace(): Promise<void> {
  const db = await getDB();
  await db.delete(STORE_NAME, 'main');
  localStorage.removeItem(LEGACY_LOCALSTORAGE_KEY);
}

export async function getBackupHistory(): Promise<BackupRecord[]> {
  const db = await getDB();
  return db.getAll(BACKUP_STORE_NAME);
}

export async function restoreFromBackup(backupId: string): Promise<AppDataEnvelopeV2 | null> {
  const db = await getDB();
  const backup = await db.get(BACKUP_STORE_NAME, backupId);
  if (!backup) return null;

  try {
    const parsed = JSON.parse(backup.data) as AppData;
    const migrated = migrateToV2(parsed);
    await saveWorkspace(migrated.data);
    return migrated;
  } catch (e) {
    console.error('[IndexedDB] Failed to restore from backup:', e);
    return null;
  }
}

export async function exportFromIndexedDB(): Promise<string> {
  const envelope = await getWorkspace();
  if (!envelope)
    return JSON.stringify(
      { classTitle: 'My Class', roles: [], students: [], assignments: [] },
      null,
      2
    );
  return JSON.stringify(envelope.data, null, 2);
}

export async function importToIndexedDB(jsonString: string): Promise<AppDataEnvelopeV2> {
  const parsed = JSON.parse(jsonString) as AppData;
  const migrated = migrateToV2(parsed);
  await saveWorkspace(migrated.data);
  return migrated;
}
