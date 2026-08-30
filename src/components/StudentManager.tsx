import React, { useState } from 'react';
import { Student, Role } from '../types';
import { Plus, Trash2, Edit2, Check, X, Search, Upload, Sparkles } from 'lucide-react';

interface StudentManagerProps {
  students: Student[];
  roles: Role[];
  onUpdateStudents: (students: Student[]) => void;
}

export const StudentManager: React.FC<StudentManagerProps> = ({ students, roles, onUpdateStudents }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [isAdding, setIsAdding] = useState(false);
  const [editingStudentId, setEditingStudentId] = useState<string | null>(null);
  const [isBulkImportOpen, setIsBulkImportOpen] = useState(false);
  const [bulkText, setBulkText] = useState('');

  // Form State
  const [name, setName] = useState('');
  const [applicationScore, setApplicationScore] = useState<number>(0);
  const [pref1, setPref1] = useState<string>('');
  const [pref2, setPref2] = useState<string>('');
  const [pref3, setPref3] = useState<string>('');
  const [pref4, setPref4] = useState<string>('');
  const [pref5, setPref5] = useState<string>('');
  const [notes, setNotes] = useState('');

  const roleMap = new Map<string, Role>(roles.map((r) => [r.id, r]));

  const filteredStudents = students.filter((s) =>
    s.name.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const handleStartAdd = () => {
    setName('');
    setApplicationScore(0);
    setPref1(roles[0]?.id || '');
    setPref2(roles[1]?.id || '');
    setPref3(roles[2]?.id || '');
    setPref4(roles[3]?.id || '');
    setPref5(roles[4]?.id || '');
    setNotes('');
    setIsAdding(true);
    setEditingStudentId(null);
  };

  const handleStartEdit = (student: Student) => {
    setName(student.name);
    setApplicationScore(student.applicationScore);
    setPref1(student.preferences[0] || '');
    setPref2(student.preferences[1] || '');
    setPref3(student.preferences[2] || '');
    setPref4(student.preferences[3] || '');
    setPref5(student.preferences[4] || '');
    setNotes(student.notes || '');
    setEditingStudentId(student.id);
    setIsAdding(false);
  };

  const handleSaveStudent = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const preferences = [pref1, pref2, pref3, pref4, pref5].filter(
      (p, idx, self) => p && self.indexOf(p) === idx
    );

    if (editingStudentId) {
      const updated = students.map((s) =>
        s.id === editingStudentId
          ? {
              ...s,
              name: name.trim(),
              applicationScore,
              preferences,
              notes: notes.trim(),
            }
          : s
      );
      onUpdateStudents(updated);
      setEditingStudentId(null);
    } else {
      const newStudent: Student = {
        id: `s-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: name.trim(),
        applicationScore,
        preferences,
        notes: notes.trim(),
      };
      onUpdateStudents([...students, newStudent]);
      setIsAdding(false);
    }
  };

  const handleDeleteStudent = (id: string) => {
    if (window.confirm('Are you sure you want to remove this student?')) {
      onUpdateStudents(students.filter((s) => s.id !== id));
    }
  };

  const handleQuickScoreChange = (id: string, score: number) => {
    const updated = students.map((s) => (s.id === id ? { ...s, applicationScore: score } : s));
    onUpdateStudents(updated);
  };

  const handleBulkImport = () => {
    const lines = bulkText.split('\n').map((l) => l.trim()).filter(Boolean);
    if (lines.length === 0) return;

    const newStudents: Student[] = lines.map((line, idx) => {
      // Split by comma or tab
      const parts = line.split(/[,\t]+/).map((p) => p.trim());
      const studentName = parts[0] || `Student ${idx + 1}`;
      
      // Select random top 5 from existing roles as default if not parsed
      const shuffledRoles = [...roles].sort(() => 0.5 - Math.random());
      const preferences = shuffledRoles.slice(0, 5).map((r) => r.id);

      return {
        id: `s-${Date.now()}-${idx}-${Math.random().toString(36).substr(2, 4)}`,
        name: studentName,
        applicationScore: 0,
        preferences,
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
            <h2 className="text-xl font-bold text-slate-800">Students, Preferences & Application Ratings</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Manage your class roster ({students.length} students), rank their top 5 job choices, and rate their application letters (-3 to +3).
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <div className="relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              placeholder="Search student..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
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
              <button onClick={() => setIsBulkImportOpen(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>
            <p className="text-xs text-slate-500 mb-3">
              Paste student names (one name per line). We will automatically initialize them with top 5 choices and neutral ratings.
            </p>
            <textarea
              rows={8}
              placeholder="Emma Watson&#10;Liam Johnson&#10;Sophia Brown&#10;Noah Davis..."
              value={bulkText}
              onChange={(e) => setBulkText(e.target.value)}
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

      {/* Add / Edit Student Modal / Drawer */}
      {(isAdding || editingStudentId) && (
        <div className="bg-blue-50/70 border-2 border-blue-200 rounded-2xl p-6 shadow-md transition-all">
          <div className="flex items-center justify-between pb-3 border-b border-blue-200 mb-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              {editingStudentId ? 'Edit Student & Preferences' : 'Add New Student'}
            </h3>
            <button
              onClick={() => {
                setIsAdding(false);
                setEditingStudentId(null);
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveStudent} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Student Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Maya Lin"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Application Letter Rating (-3 to +3)
                </label>
                <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-300">
                  {[-3, -2, -1, 0, 1, 2, 3].map((val) => (
                    <button
                      key={val}
                      type="button"
                      onClick={() => setApplicationScore(val)}
                      className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        applicationScore === val
                          ? val > 0
                            ? 'bg-emerald-600 text-white shadow-sm'
                            : val < 0
                            ? 'bg-rose-600 text-white shadow-sm'
                            : 'bg-slate-700 text-white shadow-sm'
                          : 'text-slate-600 hover:bg-slate-100'
                      }`}
                    >
                      {val > 0 ? `+${val}` : val}
                    </button>
                  ))}
                </div>
                <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
                  <span>-3 (Poor/Missing)</span>
                  <span>0 (Neutral)</span>
                  <span>+3 (Outstanding Bonus)</span>
                </div>
              </div>
            </div>

            {/* 5 Ranked Preferences Dropdowns */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-2">
                Top 5 Job Preferences (1st through 5th Choice)
              </label>
              <div className="grid grid-cols-1 sm:grid-cols-5 gap-2.5">
                {/* Choice 1 */}
                <div className="bg-white p-2 rounded-xl border border-amber-200">
                  <span className="text-[11px] font-bold text-amber-800 flex items-center gap-1 mb-1">
                    <span>🌟</span> 1st Choice
                  </span>
                  <select
                    value={pref1}
                    onChange={(e) => setPref1(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-amber-500"
                  >
                    <option value="">-- None --</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.icon} {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Choice 2 */}
                <div className="bg-white p-2 rounded-xl border border-blue-200">
                  <span className="text-[11px] font-bold text-blue-800 flex items-center gap-1 mb-1">
                    <span>👍</span> 2nd Choice
                  </span>
                  <select
                    value={pref2}
                    onChange={(e) => setPref2(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-blue-500"
                  >
                    <option value="">-- None --</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.icon} {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Choice 3 */}
                <div className="bg-white p-2 rounded-xl border border-purple-200">
                  <span className="text-[11px] font-bold text-purple-800 flex items-center gap-1 mb-1">
                    <span>✨</span> 3rd Choice
                  </span>
                  <select
                    value={pref3}
                    onChange={(e) => setPref3(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-purple-500"
                  >
                    <option value="">-- None --</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.icon} {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Choice 4 */}
                <div className="bg-white p-2 rounded-xl border border-teal-200">
                  <span className="text-[11px] font-bold text-teal-800 flex items-center gap-1 mb-1">
                    <span>🔹</span> 4th Choice
                  </span>
                  <select
                    value={pref4}
                    onChange={(e) => setPref4(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-teal-500"
                  >
                    <option value="">-- None --</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.icon} {r.name}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Choice 5 */}
                <div className="bg-white p-2 rounded-xl border border-slate-200">
                  <span className="text-[11px] font-bold text-slate-700 flex items-center gap-1 mb-1">
                    <span>🔹</span> 5th Choice
                  </span>
                  <select
                    value={pref5}
                    onChange={(e) => setPref5(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs focus:ring-1 focus:ring-slate-500"
                  >
                    <option value="">-- None --</option>
                    {roles.map((r) => (
                      <option key={r.id} value={r.id}>
                        {r.icon} {r.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Teacher Notes (Optional)</label>
              <input
                type="text"
                placeholder="e.g. Needs to pair with a quiet partner, loves books..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingStudentId(null);
                }}
                className="px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Save Student
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Students Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                <th className="py-3.5 px-4">Student Name</th>
                <th className="py-3.5 px-4 text-center">Letter Rating</th>
                <th className="py-3.5 px-4">Top 5 Preferences</th>
                <th className="py-3.5 px-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredStudents.length === 0 ? (
                <tr>
                  <td colSpan={4} className="py-8 text-center text-slate-400">
                    No students found matching your search.
                  </td>
                </tr>
              ) : (
                filteredStudents.map((student) => (
                  <tr key={student.id} className="hover:bg-slate-50/70 transition-colors">
                    {/* Student Name */}
                    <td className="py-3.5 px-4">
                      <div className="font-bold text-slate-900 text-sm">{student.name}</div>
                      {student.notes && (
                        <div className="text-[11px] text-slate-400 mt-0.5">{student.notes}</div>
                      )}
                    </td>

                    {/* Letter Rating */}
                    <td className="py-3.5 px-4 text-center">
                      <div className="inline-flex items-center gap-1">
                        <select
                          value={student.applicationScore}
                          onChange={(e) => handleQuickScoreChange(student.id, parseInt(e.target.value))}
                          className={`px-2 py-1 rounded-lg text-xs font-bold border transition-colors cursor-pointer ${
                            student.applicationScore > 0
                              ? 'bg-emerald-50 text-emerald-800 border-emerald-300'
                              : student.applicationScore < 0
                              ? 'bg-rose-50 text-rose-800 border-rose-300'
                              : 'bg-slate-50 text-slate-700 border-slate-300'
                          }`}
                        >
                          <option value={3}>🌟 +3 (Outstanding)</option>
                          <option value={2}>✨ +2 (Great)</option>
                          <option value={1}>👍 +1 (Good)</option>
                          <option value={0}>0 (Neutral)</option>
                          <option value={-1}>⚠️ -1 (Fair)</option>
                          <option value={-2}>❌ -2 (Weak)</option>
                          <option value={-3}>⛔ -3 (Missing)</option>
                        </select>
                      </div>
                    </td>

                    {/* Preferences Pills */}
                    <td className="py-3.5 px-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        {student.preferences.map((roleId, idx) => {
                          const role = roleMap.get(roleId);
                          const rankColor =
                            idx === 0
                              ? 'bg-amber-100 text-amber-900 border-amber-300 font-bold'
                              : idx === 1
                              ? 'bg-blue-100 text-blue-900 border-blue-300 font-medium'
                              : idx === 2
                              ? 'bg-purple-100 text-purple-900 border-purple-300 font-medium'
                              : idx === 3
                              ? 'bg-teal-100 text-teal-900 border-teal-300 font-medium'
                              : 'bg-slate-100 text-slate-800 border-slate-300 font-medium';

                          return (
                            <span
                              key={roleId}
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border ${rankColor}`}
                              title={`Rank #${idx + 1}`}
                            >
                              <span className="text-[10px] opacity-75">#{idx + 1}</span>
                              <span>{role?.icon || '⭐'}</span>
                              <span className="truncate max-w-[110px]">{role?.name || roleId}</span>
                            </span>
                          );
                        })}
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
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
