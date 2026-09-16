import express from 'express';
import cors from 'cors';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DATA_DIR = path.resolve(__dirname, '../data');

const ROLES_FILE = path.join(DATA_DIR, 'roles.json');
const STUDENTS_FILE = path.join(DATA_DIR, 'students.json');
const ASSIGNMENTS_FILE = path.join(DATA_DIR, 'assignments.json');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json({ limit: '10mb' }));

async function readJsonFile<T>(filePath: string, fallback: T): Promise<T> {
  try {
    const content = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(content) as T;
  } catch {
    return fallback;
  }
}

async function writeJsonFile(filePath: string, data: unknown): Promise<void> {
  await fs.mkdir(DATA_DIR, { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(data, null, 2), 'utf-8');
}

// GET all data
app.get('/api/data', async (_req, res) => {
  try {
    const roles = await readJsonFile(ROLES_FILE, []);
    const students = await readJsonFile(STUDENTS_FILE, []);
    const assignments = await readJsonFile(ASSIGNMENTS_FILE, []);

    res.json({
      success: true,
      data: {
        roles,
        students,
        assignments,
      },
    });
  } catch (error) {
    console.error('Error reading data:', error);
    res.status(500).json({ success: false, error: 'Failed to read data from disk' });
  }
});

// POST save data
app.post('/api/save', async (req, res) => {
  try {
    const { roles, students, assignments } = req.body;

    if (Array.isArray(roles)) {
      await writeJsonFile(ROLES_FILE, roles);
    }
    if (Array.isArray(students)) {
      await writeJsonFile(STUDENTS_FILE, students);
    }
    if (Array.isArray(assignments)) {
      await writeJsonFile(ASSIGNMENTS_FILE, assignments);
    }

    res.json({ success: true, message: 'Data saved successfully to disk' });
  } catch (error) {
    console.error('Error saving data:', error);
    res.status(500).json({ success: false, error: 'Failed to save data to disk' });
  }
});

app.listen(Number(PORT), '0.0.0.0', () => {
  console.log(`Happy Roles server running on http://0.0.0.0:${PORT}`);
});
