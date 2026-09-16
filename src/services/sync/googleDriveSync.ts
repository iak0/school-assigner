import { getAccessToken } from '../auth/googleAuth';
import { AppDataEnvelopeV2 } from '../migration/migrationEngine';

const DRIVE_API_BASE = 'https://www.googleapis.com/drive/v3';
const APP_DATA_FOLDER = 'appDataFolder';
const FILE_NAME = 'workspace.json';

export interface SyncResult {
  success: boolean;
  data?: AppDataEnvelopeV2;
  error?: string;
  revision?: number;
  lastModified?: string;
}

export interface RevisionCheckResult {
  hasRemoteChanges: boolean;
  cloudRevision: number;
  localRevision: number;
  cloudLastModified: string;
}

async function apiRequest<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = await getAccessToken();
  if (!token) {
    throw new Error('No access token available');
  }

  const response = await fetch(`${DRIVE_API_BASE}${endpoint}`, {
    ...options,
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (response.status === 401) {
    throw new Error('Token expired or invalid');
  }

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Drive API error: ${response.status} - ${errorText}`);
  }

  if (response.status === 204) {
    return {} as T;
  }

  return response.json();
}

async function findAppDataFile(): Promise<string | null> {
  const response = await apiRequest<{ files: Array<{ id: string }> }>(
    `/files?q=name='${FILE_NAME}'+and+'${APP_DATA_FOLDER}' in parents&spaces=appDataFolder&fields=files(id)`
  );
  return response.files?.[0]?.id || null;
}

export async function fetchCloudWorkspace(): Promise<SyncResult> {
  try {
    const fileId = await findAppDataFile();
    if (!fileId) {
      return { success: true, data: undefined, revision: 0, lastModified: '' };
    }

    const response = await apiRequest<{ id: string; name: string; modifiedTime: string }>(
      `/files/${fileId}?alt=media`,
      { method: 'GET' }
    );

    const parsed = JSON.parse(response as unknown as string) as AppDataEnvelopeV2;
    return {
      success: true,
      data: parsed,
      revision: parsed.revision,
      lastModified: parsed.lastModified,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function saveCloudWorkspace(envelope: AppDataEnvelopeV2): Promise<SyncResult> {
  try {
    const fileId = await findAppDataFile();

    // For appDataFolder, use simple upload (not multipart) - more reliable
    const token = await getAccessToken();
    if (!token) {
      throw new Error('No access token available');
    }

    const body = JSON.stringify(envelope);
    const metadata = {
      name: FILE_NAME,
      parents: [APP_DATA_FOLDER],
      modifiedTime: envelope.lastModified,
    };

    let response: Response;
    if (fileId) {
      // Update existing file with simple upload
      response = await fetch(`${DRIVE_API_BASE}/files/${fileId}?uploadType=media`, {
        method: 'PATCH',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body,
      });
    } else {
      // Create new file with multipart (required for initial creation with metadata)
      const formData = new FormData();
      formData.append(
        'metadata',
        new Blob([JSON.stringify(metadata)], { type: 'application/json; charset=utf-8' })
      );
      formData.append('file', new Blob([body], { type: 'application/json; charset=utf-8' }));

      response = await fetch(`${DRIVE_API_BASE}/files?uploadType=multipart`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });
    }

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Drive API error: ${response.status} - ${errorText}`);
    }

    return {
      success: true,
      revision: envelope.revision,
      lastModified: envelope.lastModified,
    };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}

export async function checkCloudRevision(): Promise<RevisionCheckResult | null> {
  try {
    const fileId = await findAppDataFile();
    if (!fileId) {
      return { hasRemoteChanges: false, cloudRevision: 0, localRevision: 0, cloudLastModified: '' };
    }

    const response = await apiRequest<{
      id: string;
      modifiedTime: string;
      properties?: Record<string, string>;
    }>(`/files/${fileId}?fields=modifiedTime,properties`);

    const cloudRevision = response.properties?.revision
      ? parseInt(response.properties.revision, 10)
      : 0;
    const cloudLastModified = response.modifiedTime || '';

    return {
      hasRemoteChanges: false,
      cloudRevision,
      localRevision: 0,
      cloudLastModified,
    };
  } catch (error) {
    console.error('[GoogleDriveSync] Failed to check cloud revision:', error);
    return null;
  }
}

export async function deleteCloudWorkspace(): Promise<SyncResult> {
  try {
    const fileId = await findAppDataFile();
    if (!fileId) {
      return { success: true };
    }

    await apiRequest(`/files/${fileId}`, { method: 'DELETE' });
    return { success: true };
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : 'Unknown error' };
  }
}
