import { AlertCircle, Edit2, Plus, Trash2, Users } from 'lucide-react';
import React, { useState } from 'react';

import { Role } from '../types';
import { RoleForm } from './RoleForm';

interface RoleManagerProps {
  roles: Role[];
  studentCount: number;
  onUpdateRoles: (roles: Role[]) => void;
}

export const RoleManager: React.FC<RoleManagerProps> = ({ roles, studentCount, onUpdateRoles }) => {
  const [isAdding, setIsAdding] = useState(false);
  const [editingRoleId, setEditingRoleId] = useState<string | null>(null);

  const totalSlots = roles.reduce((sum, r) => sum + r.capacity, 0);

  const handleStartAdd = () => {
    setIsAdding(true);
    setEditingRoleId(null);
  };

  const handleStartEdit = (role: Role) => {
    setEditingRoleId(role.id);
    setIsAdding(false);
  };

  const handleSaveRole = (data: {
    name: string;
    capacity: number;
    description: string;
    icon: string;
  }) => {
    if (editingRoleId) {
      const updated = roles.map(r =>
        r.id === editingRoleId
          ? {
              ...r,
              name: data.name,
              capacity: data.capacity,
              description: data.description,
              icon: data.icon,
            }
          : r
      );
      onUpdateRoles(updated);
      setEditingRoleId(null);
    } else {
      const newRole: Role = {
        id: `role-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
        name: data.name,
        capacity: data.capacity,
        description: data.description,
        icon: data.icon,
      };
      onUpdateRoles([...roles, newRole]);
      setIsAdding(false);
    }
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingRoleId(null);
  };

  const handleDeleteRole = (id: string) => {
    if (
      window.confirm(
        'Are you sure you want to delete this job? Existing assignments to this job will be cleared.'
      )
    ) {
      onUpdateRoles(roles.filter(r => r.id !== id));
    }
  };

  const handleAdjustCapacity = (id: string, delta: number) => {
    const updated = roles.map(r => {
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
            <h2 className="text-xl font-bold text-slate-800">Happy Roles & Slot Capacities</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Define classroom responsibilities and set how many student slots are available for each
            job (1, 2, or 3+).
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="bg-slate-50 border border-slate-200 px-4 py-2 rounded-xl text-center">
            <span className="text-xs font-semibold text-slate-500 uppercase block">
              Total Job Slots
            </span>
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
            <span className="font-semibold">Notice:</span> You have {totalSlots} total job slots for{' '}
            {studentCount} students.&ensp;
            {studentCount - totalSlots} students will remain in the <b>Unassigned / Standby</b>{' '}
            reserve pool for this cycle.
          </div>
        </div>
      )}

      {/* Grid of Role Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {/* Add New Job Form - inline at top when adding */}
        {isAdding && (
          <RoleForm
            onSave={handleSaveRole}
            onCancel={handleCancel}
            title="Create New Happy Role"
            submitLabel="Save Job"
          />
        )}

        {roles.map(role => {
          const isThisEditing = editingRoleId === role.id;

          return (
            <div key={role.id}>
              {/* Edit Form - replaces the card when editing */}
              {isThisEditing && (
                <RoleForm
                  initialData={{
                    name: role.name,
                    capacity: role.capacity,
                    description: role.description || '',
                    icon: role.icon || '⭐',
                  }}
                  onSave={handleSaveRole}
                  onCancel={handleCancel}
                  title="Edit Happy Role"
                  submitLabel="Save Job"
                />
              )}

              {/* Role Card - hidden when editing */}
              {!isThisEditing && (
                <div className="bg-white rounded-2xl p-5 border border-slate-200/90 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 flex items-center justify-center text-2xl shadow-inner">
                          {role.icon || '⭐'}
                        </div>
                        <div>
                          <h3 className="font-bold text-slate-800 text-base leading-snug">
                            {role.name}
                          </h3>
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
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
