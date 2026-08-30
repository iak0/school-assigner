import React, { useState } from 'react';
import { Role } from '../types';
import { Plus, Trash2, Edit2, Check, X, Users, AlertCircle, Sparkles } from 'lucide-react';

interface RoleManagerProps {
  roles: Role[];
  studentCount: number;
  onUpdateRoles: (roles: Role[]) => void;
}

const EMOJI_OPTIONS = ['🚶‍♂️', '🚪', '📄', '💻', '🧼', '🌱', '📚', '✏️', '⚽', '🍎', '📅', '⭐', '🎨', '🔔', '🧹', '🥤', '🎒', '🧩'];

export const RoleManager: React.FC<RoleManagerProps> = ({ roles, studentCount, onUpdateRoles }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [capacity, setCapacity] = useState(1);
  const [description, setDescription] = useState('');
  const [icon, setIcon] = useState('⭐');

  const totalSlots = roles.reduce((sum, r) => sum + r.capacity, 0);

  const handleStartAdd = () => {
    setName('');
    setCapacity(1);
    setDescription('');
    setIcon(EMOJI_OPTIONS[Math.floor(Math.random() * EMOJI_OPTIONS.length)]);
    setIsAdding(true);
    setEditingRoleId(null);
  };

  const handleStartEdit = (role: Role) => {
    setName(role.name);
    setCapacity(role.capacity);
    setDescription(role.description || '');
    setIcon(role.icon || '⭐');
    setEditingRoleId(role.id);
    setIsAdding(false);
  };

  const handleSaveRole = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    if (editingRoleId) {
      const updated = roles.map((r) =>
        r.id === editingRoleId
          ? { ...r, name: name.trim(), capacity: Math.max(1, capacity), description: description.trim(), icon }
          : r
      );
      onUpdateRoles(updated);
      setEditingRoleId(null);
    } else {
      const newRole: Role = {
        id: `role-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: name.trim(),
        capacity: Math.max(1, capacity),
        description: description.trim(),
        icon,
      };
      onUpdateRoles([...roles, newRole]);
      setIsAdding(false);
    }
  };

  const handleDeleteRole = (id: string) => {
    if (window.confirm('Are you sure you want to delete this job? Existing assignments to this job will be cleared.')) {
      onUpdateRoles(roles.filter((r) => r.id !== id));
    }
  };

  const handleAdjustCapacity = (id: string, delta: number) => {
    const updated = roles.map((r) => {
      if (r.id === id) {
        const nextCap = Math.max(1, r.capacity + delta);
        return { ...r, capacity: nextCap };
      }
      return r;
    });
    onUpdateRoles(updated);
  };

  return (
    <div className="space-y-6">
      {/* Header Info & Capacity Tracker */}
      <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📋</span>
            <h2 className="text-xl font-bold text-slate-800">Classroom Jobs & Slot Capacities</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Define classroom responsibilities and set how many student slots are available for each job (1, 2, or 3+).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-center">
            <span className="text-xs font-semibold text-slate-500 uppercase block">Total Job Slots</span>
            <span className="text-lg font-bold text-blue-600">{totalSlots} slots</span>
          </div>
          <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-center">
            <span className="text-xs font-semibold text-slate-500 uppercase block">Class Size</span>
            <span className="text-lg font-bold text-slate-700">{studentCount} students</span>
          </div>
          <button
            type="button"
            onClick={handleStartAdd}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all text-sm"
          >
            <Plus className="w-4 h-4" />
            Add New Job
          </button>
        </div>
      </div>

      {/* Capacity Alert / Notice */}
      {totalSlots < studentCount && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex items-center gap-3 text-amber-900 text-sm">
          <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0" />
          <div>
            <span className="font-semibold">Notice:</span> You have {totalSlots} total job slots for {studentCount} students.
            {studentCount - totalSlots} students will remain in the <b>Unassigned / Standby</b> reserve pool for this cycle.
          </div>
        </div>
      )}

      {/* Role Creation / Editing Modal Form */}
      {(isAdding || editingRoleId) && (
        <div className="bg-blue-50/70 border-2 border-blue-200 rounded-2xl p-6 shadow-md transition-all">
          <div className="flex items-center justify-between pb-3 border-b border-blue-200 mb-4">
            <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-blue-600" />
              {editingRoleId ? 'Edit Classroom Job' : 'Create New Classroom Job'}
            </h3>
            <button
              onClick={() => {
                setIsAdding(false);
                setEditingRoleId(null);
              }}
              className="text-slate-400 hover:text-slate-600"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          <form onSubmit={handleSaveRole} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">Job Name</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. Line Leader, Tech Helper..."
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">Slots / Capacity</label>
                <input
                  type="number"
                  min="1"
                  max="10"
                  required
                  value={capacity}
                  onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
                  className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-semibold text-center"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1 flex items-center justify-between">
                  <span>Job Icon (Emoji)</span>
                  <span className="text-[10px] text-blue-600 font-normal">⌘+Ctrl+Space</span>
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    maxLength={4}
                    value={icon}
                    onChange={(e) => {
                      // Grab only the first emoji / character
                      const val = e.target.value;
                      if (!val) {
                        setIcon('⭐');
                        return;
                      }
                      // Use segmenter if available, or first grapheme
                      if (typeof Intl !== 'undefined' && 'Segmenter' in Intl) {
                        const segmenter = new (Intl as any).Segmenter('en', { granularity: 'grapheme' });
                        const segments = Array.from(segmenter.segment(val));
                        if (segments.length > 0) {
                          setIcon((segments[segments.length - 1] as any).segment);
                          return;
                        }
                      }
                      setIcon(Array.from(val).pop() || '⭐');
                    }}
                    className="w-16 h-10 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-2xl text-center shadow-xs"
                    placeholder="⭐"
                    title="Type or paste any emoji. Press ⌘+Ctrl+Space on Mac or Win+. on Windows."
                  />
                  <div className="flex flex-wrap gap-1 max-w-[150px]">
                    {['🚶‍♂️', '🚪', '📄', '💻', '🧼', '🌱', '📚', '✏️', '⚽', '🍎', '📅', '⭐'].map((em) => (
                      <button
                        key={em}
                        type="button"
                        onClick={() => setIcon(em)}
                        className={`text-sm p-1 rounded hover:bg-white transition-all ${
                          icon === em ? 'bg-white shadow-xs scale-110' : 'opacity-70 hover:opacity-100'
                        }`}
                      >
                        {em}
                      </button>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">Description / Duties (Optional)</label>
              <input
                type="text"
                placeholder="What does a student do in this role?"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => {
                  setIsAdding(false);
                  setEditingRoleId(null);
                }}
                className="px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-sm font-semibold shadow-sm flex items-center gap-1.5"
              >
                <Check className="w-4 h-4" />
                Save Job
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Grid of Role Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {roles.map((role) => (
          <div
            key={role.id}
            className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between"
          >
            <div>
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl shadow-inner">
                    {role.icon || '⭐'}
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base leading-snug">{role.name}</h3>
                    <span className="inline-flex items-center gap-1 text-xs font-semibold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-100 mt-1">
                      <Users className="w-3 h-3" />
                      {role.capacity} {role.capacity === 1 ? 'Slot' : 'Slots'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1">
                  <button
                    onClick={() => handleStartEdit(role)}
                    className="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                    title="Edit Job"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteRole(role.id)}
                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                    title="Delete Job"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>

              {role.description && (
                <p className="text-xs text-slate-500 mt-3 line-clamp-2 leading-relaxed">
                  {role.description}
                </p>
              )}
            </div>

            {/* Capacity Controls */}
            <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
              <span className="text-slate-500 font-medium">Slots Available:</span>
              <div className="flex items-center gap-1.5 bg-slate-100 p-1 rounded-xl">
                <button
                  type="button"
                  onClick={() => handleAdjustCapacity(role.id, -1)}
                  disabled={role.capacity <= 1}
                  className="w-6 h-6 rounded-lg bg-white text-slate-700 font-bold hover:bg-slate-200 disabled:opacity-40 disabled:hover:bg-white flex items-center justify-center shadow-xs transition-colors"
                >
                  -
                </button>
                <span className="font-bold text-slate-800 px-2 min-w-[20px] text-center">
                  {role.capacity}
                </span>
                <button
                  type="button"
                  onClick={() => handleAdjustCapacity(role.id, 1)}
                  className="w-6 h-6 rounded-lg bg-white text-slate-700 font-bold hover:bg-slate-200 flex items-center justify-center shadow-xs transition-colors"
                >
                  +
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};
