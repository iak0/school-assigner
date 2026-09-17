import { Edit2, History, Plus, Search, Trash2, Upload, X } from 'lucide-react';
import React, { useState } from 'react';

import { useStudentHistory } from '../hooks/useStudentHistory';
import { Role, RotationSnapshot, Student } from '../types';
import { PreferenceList } from './PreferencePill';
import { StudentForm } from './StudentForm';

interface StudentManagerProps {
  students: Student[];
  roles: Role[];
  onUpdateStudents: (students: Student[]) => void;
  rotationHistory?: RotationSnapshot[];
}

export const StudentManager: React.FC<StudentManagerProps> = ({
  students,
  roles,
  onUpdateStudents,
  rotationHistory = [],
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');

  const { getStudentHistory } = useStudentHistory({ rotationHistory });
  const editingRowRef = React.useRef<HTMLTableRowElement>(null);

  const filteredStudents = students.filter(s =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartAdd = () => {
    setEditingStudentId(null);
    setIsAdding(true);
    // Scroll to top to show the add form
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  const handleStartEdit = (student: Student) => {
    setEditingStudentId(student.id);
    // Scroll to the inline edit form after render
    setTimeout(() => {
      editingRowRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }, 0);
  };

  const handleSaveStudent = (data: {
    name: string;
    applicationScore: number;
    preferences: string[];
    notes: string;
  }) => {
    // Filter out empty preferences and duplicates
    const preferences = data.preferences.filter((p, idx, self) => p && self.indexOf(p) === idx);

    if (editingStudentId) {
      const updated = students.map(s =>
        s.id === editingStudentId
          ? {
              ...s,
              name: data.name,
              applicationScore: data.applicationScore,
              preferences,
              notes: data.notes,
            }
          : s
      );
      onUpdateStudents(updated);
      setEditingStudentId(null);
    } else {
      const newStudent: Student = {
        id: `s-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: data.name,
        applicationScore: data.applicationScore,
        preferences,
        notes: data.notes,
      };
      onUpdateStudents([...students, newStudent]);
      setIsAdding(false);
    }
  };

  const handleDeleteStudent = (id: string) => {
    if (window.confirm('Are you sure you want to remove this student?')) {
      onUpdateStudents(students.filter(s => s.id !== id));
    }
  };

  const handleQuickScoreChange = (id: string, score: number) => {
    const updated = students.map(s => (s.id === id ? { ...s, applicationScore: score } : s));
    onUpdateStudents(updated);
  };

  const handleBulkImport = () => {
    const lines = bulkText
      .split('\n')
      .map(l => l.trim())
      .filter(Boolean);
    if (lines.length === 0) return;

    const newStudents: Student[] = lines.map((line, idx) => {
      // Split by comma or tab
      const parts = line.split(/[,\t]+/).map(p => p.trim());
      const studentName = parts[0] || `Student ${idx + 1}`;

      return {
        id: `s-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        name: studentName,
        applicationScore: 0,
        preferences: [],
      };
    });

    onUpdateStudents([...students, ...newStudents]);
    setIsBulkImportOpen(false);
    setBulkText('');
  };

  return (
    <div className="space-y-6">
      {/* Top Controls Bar */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🎒</span>
            <h2 className="text-xl font-bold text-slate-800">Students & Preferences</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage your class roster ({students.length} students), rank their top 5 job choices, and
            set teacher adjustments.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student..."
              value={searchTerm}
              onChange={e => setSearchTerm(e.target.value)}
              className="pl-9 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs focus:ring-2 focus:ring-blue-500 focus:outline-none w-48"
            />
          </div>
          <button
            type="button"
            onClick={() => setIsBulkImportOpen(true)}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3 py-2 rounded-xl transition-all text-xs border border-slate-200"
          >
            <Upload className="w-3.5 h-3.5" />
            Bulk Import
          </button>
          <button
            type="button"
            onClick={handleStartAdd}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-3.5 py-2 rounded-xl shadow-sm transition-all text-xs"
          >
            <Plus className="w-4 h-4" />
            Add Student
          </button>
        </div>
      </div>

      {/* Bulk Import Modal */}
      {isBulkImportOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs flex items-center justify-center p-4 z-50">
          <div className="bg-white rounded-2xl p-6 max-w-lg w-full shadow-2xl border border-slate-200">
            <div className="flex items-center justify-between pb-3 border-b border-slate-200 mb-4">
              <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
                <Upload className="w-5 h-5 text-blue-600" />
                Quick Import Student Roster
              </h3>
              <button
                onClick={() => setIsBulkImportOpen(false)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Paste student names (one name per line). Students will be added with neutral
              adjustments and empty preferences.
            </p>
            <textarea
              rows={8}
              placeholder="Emma Watson&#10;Liam Johnson&#10;Sophia Brown&#10;Noah Davis..."
              value={bulkText}
              onChange={e => setBulkText(e.target.value)}
              className="w-full p-3 bg-slate-50 border border-slate-300 rounded-xl text-sm font-mono focus:ring-2 focus:ring-blue-500 focus:outline-none mb-4"
            />
            <div className="flex justify-end gap-2">
              <button
                type="button"
                onClick={() => setIsBulkImportOpen(false)}
                className="px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleBulkImport}
                disabled={!bulkText.trim()}
                className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded-xl text-xs font-semibold shadow-sm"
              >
                Import Students
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Students Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Student Name</th>
                <th className="py-3.5 px-4">Top 5 Preferences</th>
                <th className="py-3.5 px-4">Job History</th>
                <th className="py-3.5 px-4 text-center">Adjustment</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {/* Add Student Form Row */}
              {isAdding && (
                <tr ref={editingRowRef} className="bg-blue-50/70 border-t-2 border-blue-200">
                  <td colSpan={5} className="p-4">
                    <StudentForm
                      roles={roles}
                      onSave={handleSaveStudent}
                      onCancel={() => setIsAdding(false)}
                      title="Add New Student"
                      submitLabel="Save Student"
                    />
                  </td>
                </tr>
              )}
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400">
                    No students found matching your search.
                  </td>
                </tr>
              ) : (
                filteredStudents.map(student => (
                  <React.Fragment key={student.id}>
                    <tr
                      className={`hover:bg-slate-50/70 transition-colors ${editingStudentId === student.id ? 'bg-blue-50/50' : ''}`}
                    >
                      {/* Student Name */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900 text-sm">{student.name}</div>
                        {student.notes && (
                          <div className="text-[11px] text-slate-400 mt-0.5">{student.notes}</div>
                        )}
                      </td>

                      {/* Preferences Pills */}
                      <td className="py-3.5 px-4">
                        <PreferenceList preferences={student.preferences} roles={roles} />
                      </td>

                      {/* Job History */}
                      <td className="py-3.5 px-4">
                        {(() => {
                          const history = getStudentHistory(student.id);
                          if (history.length === 0) {
                            return (
                              <div className="text-slate-300 text-[11px] italic">
                                No history yet
                              </div>
                            );
                          }
                          return (
                            <div className="flex flex-wrap gap-1">
                              {history.slice(0, 3).map((h, idx) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10px] bg-blue-50 text-blue-800 border border-blue-200 font-medium"
                                  title={`${h.roleName} (${h.rotationName} - ${h.date})`}
                                >
                                  <History className="w-3 h-3" />
                                  <span className="truncate max-w-[90px]">{h.roleName}</span>
                                  <span className="text-[9px] text-blue-600">({h.date})</span>
                                </span>
                              ))}
                              {history.length > 3 && (
                                <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
                                  +{history.length - 3} more
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Adjustment */}
                      <td className="py-3.5 px-4 text-center">
                        <div className="inline-flex items-center gap-1">
                          <select
                            value={student.applicationScore}
                            onChange={e =>
                              handleQuickScoreChange(student.id, parseInt(e.target.value))
                            }
                            className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                              student.applicationScore > 0
                                ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                                : student.applicationScore < 0
                                  ? 'bg-rose-50 text-rose-800 border-rose-300'
                                  : 'bg-slate-50 text-slate-700 border-slate-300'
                            }`}
                          >
                            <option value={3}>+3</option>
                            <option value={2}>+2</option>
                            <option value={1}>+1</option>
                            <option value={0}>0</option>
                            <option value={-1}>-1</option>
                            <option value={-2}>-2</option>
                            <option value={-3}>-3</option>
                          </select>
                        </div>
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => handleStartEdit(student)}
                            className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                            title="Edit Student & Preferences"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleDeleteStudent(student.id)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                            title="Remove Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>

                    {/* Inline Edit Form Row */}
                    {editingStudentId === student.id && (
                      <tr ref={editingRowRef} className="bg-blue-50/70 border-t-2 border-blue-200">
                        <td colSpan={5} className="p-4">
                          <StudentForm
                            roles={roles}
                            initialData={{
                              name: student.name,
                              applicationScore: student.applicationScore,
                              preferences: student.preferences,
                              notes: student.notes || '',
                            }}
                            onSave={handleSaveStudent}
                            onCancel={() => setEditingStudentId(null)}
                            title="Edit Student & Preferences"
                            submitLabel="Save Student"
                            isEditing
                          />
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
