import React, { useState } from 'react';
import { RotationSnapshot, Student, Role } from '../types';
import { Trash2, ChevronDown, ChevronUp, Table, List, Search, RotateCcw } from 'lucide-react';

interface RotationHistoryProps {
  rotationHistory: RotationSnapshot[];
  onUpdateHistory: (history: RotationSnapshot[]) => void;
  antiRepetitionConfig: {
    recencyWindow: number;
    avoidanceStrictness: 'strict' | 'balanced';
    standbyPriority: boolean;
  };
  onUpdateConfig: (config: {
    recencyWindow: number;
    avoidanceStrictness: 'strict' | 'balanced';
    standbyPriority: boolean;
  }) => void;
  students: Student[];
  roles: Role[];
}

export const RotationHistory: React.FC<RotationHistoryProps> = ({
  rotationHistory,
  onUpdateHistory,
  students,
  roles,
}) => {
  const [viewMode, setViewMode] = useState<'timeline' | 'matrix'>('timeline');
  const [expandedRotationId, setExpandedRotationId] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');

  const roleMap = new Map(roles.map(r => [r.id, r]));

  const handleDeleteRotation = (rotationId: string) => {
    if (window.confirm('Delete this rotation from history? This cannot be undone.')) {
      onUpdateHistory(rotationHistory.filter(r => r.id !== rotationId));
    }
  };

  const handleClearAllHistory = () => {
    if (
      window.confirm(
        '⚠️ This will permanently delete ALL rotation history.\n\nThis cannot be undone. Export first if you want a backup.\n\nAre you sure?'
      )
    ) {
      onUpdateHistory([]);
    }
  };

  const getRotationStats = (rotation: RotationSnapshot) => {
    const assigned = rotation.assignments.filter(a => a.roleId);
    const totalSlots = roles.reduce((sum, r) => sum + r.capacity, 0);
    const firstChoiceCount = assigned.filter(a => {
      const student = students.find(s => s.id === a.studentId);
      return student?.preferences[0] === a.roleId;
    }).length;
    return {
      filled: assigned.length,
      total: totalSlots,
      firstChoice: firstChoiceCount,
      firstChoicePercent:
        assigned.length > 0 ? Math.round((firstChoiceCount / assigned.length) * 100) : 0,
    };
  };

  const formatDate = (isoString: string) => {
    const date = new Date(isoString);
    return date.toLocaleDateString([], { month: 'short', year: 'numeric', day: 'numeric' });
  };

  if (rotationHistory.length === 0) {
    return (
      <div className="bg-white rounded-2xl p-8 shadow-sm border border-slate-200/80">
        <div className="text-center py-12">
          <RotateCcw className="w-16 h-16 mx-auto text-slate-300 mb-4" />
          <h3 className="text-lg font-bold text-slate-800 mb-2">No Rotation History Yet</h3>
          <p className="text-slate-500 text-sm max-w-md mx-auto">
            Finalize a rotation from the Matching Board to create your first history snapshot. This
            enables anti-repetition and standby fairness for future rotations.
          </p>
        </div>
      </div>
    );
  }

  // Sort rotations newest first
  const sortedRotations = [...rotationHistory].sort(
    (a, b) => new Date(b.finalizedAt).getTime() - new Date(a.finalizedAt).getTime()
  );

  const filteredRotations = sortedRotations.filter(
    r =>
      r.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      r.notes?.toLowerCase().includes(searchTerm.toLowerCase())
  );

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-slate-900">📜 Rotations & History</h2>
          <p className="text-sm text-slate-500 mt-0.5">
            View past assignments, audit student job history, and configure anti-repetition
            settings.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => setViewMode('timeline')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'timeline'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <List className="w-3.5 h-3.5 inline-block mr-1" /> Timeline
          </button>
          <button
            type="button"
            onClick={() => setViewMode('matrix')}
            className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
              viewMode === 'matrix'
                ? 'bg-blue-600 text-white shadow-xs'
                : 'text-slate-600 hover:text-slate-900 hover:bg-slate-100'
            }`}
          >
            <Table className="w-3.5 h-3.5 inline-block mr-1" /> Audit Matrix
          </button>
          {rotationHistory.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllHistory}
              className="px-3 py-1.5 rounded-lg text-xs font-bold text-rose-700 hover:bg-rose-50 border border-rose-200 transition-colors"
              title="Clear all rotation history"
            >
              <Trash2 className="w-3.5 h-3.5 inline-block mr-1" /> Clear All
            </button>
          )}
        </div>
      </div>

      {/* Search */}
      <div className="relative max-w-md">
        <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          type="text"
          placeholder="Search rotations by name or notes..."
          value={searchTerm}
          onChange={e => setSearchTerm(e.target.value)}
          className="w-full pl-10 pr-4 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none"
        />
      </div>

      {viewMode === 'timeline' && (
        <div className="space-y-4">
          {filteredRotations.map(rotation => {
            const stats = getRotationStats(rotation);
            const isExpanded = expandedRotationId === rotation.id;

            return (
              <div
                key={rotation.id}
                className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden"
              >
                {/* Rotation Card Header */}
                <div className="p-4 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <button
                      type="button"
                      onClick={() => setExpandedRotationId(isExpanded ? null : rotation.id)}
                      className="p-1 text-slate-400 hover:text-slate-600 transition-colors"
                      aria-label={isExpanded ? 'Collapse' : 'Expand'}
                    >
                      {isExpanded ? (
                        <ChevronUp className="w-5 h-5" />
                      ) : (
                        <ChevronDown className="w-5 h-5" />
                      )}
                    </button>
                    <div>
                      <h3 className="font-bold text-slate-900 text-lg">{rotation.name}</h3>
                      <p className="text-sm text-slate-500">
                        Finalized {formatDate(rotation.finalizedAt)}
                      </p>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="bg-blue-50 text-blue-800 px-2.5 py-0.5 rounded-full text-xs font-medium">
                      {stats.filled}/{stats.total} Filled
                    </span>
                    <span className="bg-amber-50 text-amber-800 px-2.5 py-0.5 rounded-full text-xs font-medium">
                      {stats.firstChoice} #1 Choice ({stats.firstChoicePercent}%)
                    </span>
                    <button
                      type="button"
                      onClick={() => handleDeleteRotation(rotation.id)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
                      title="Delete rotation"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Notes */}
                {rotation.notes && (
                  <div className="px-4 py-2 bg-slate-50 border-b border-slate-100 text-sm text-slate-600 italic">
                    {rotation.notes}
                  </div>
                )}

                {/* Expanded Details */}
                {isExpanded && (
                  <div className="p-4 bg-slate-50/50">
                    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
                      {rotation.assignments
                        .filter(a => a.roleId)
                        .sort((a, b) => {
                          const roleA = roleMap.get(a.roleId || '');
                          const roleB = roleMap.get(b.roleId || '');
                          return (roleA?.name || '').localeCompare(roleB?.name || '');
                        })
                        .map(assignment => {
                          const role = roleMap.get(assignment.roleId || '');
                          return (
                            <div
                              key={`${assignment.studentId}-${assignment.roleId}`}
                              className="flex items-center gap-2 p-2 bg-white rounded-lg border border-slate-200"
                            >
                              <span className="text-lg">{role?.icon || '⭐'}</span>
                              <div className="min-w-0 flex-1">
                                <p className="font-medium text-slate-800 text-sm truncate">
                                  {role?.name || assignment.roleName}
                                </p>
                                <p className="text-xs text-slate-500">{assignment.studentName}</p>
                              </div>
                            </div>
                          );
                        })}
                      {rotation.assignments
                        .filter(a => !a.roleId)
                        .map(assignment => (
                          <div
                            key={assignment.studentId}
                            className="flex items-center gap-2 p-2 bg-blue-50 rounded-lg border border-blue-200 col-span-full sm:col-span-1"
                          >
                            <span className="text-lg">🎒</span>
                            <div>
                              <p className="font-medium text-blue-900 text-sm">Standby / Reserve</p>
                              <p className="text-xs text-blue-700">{assignment.studentName}</p>
                            </div>
                          </div>
                        ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}

          {filteredRotations.length === 0 && rotationHistory.length > 0 && (
            <div className="text-center py-8 text-slate-500">No rotations match "{searchTerm}"</div>
          )}
        </div>
      )}

      {viewMode === 'matrix' && (
        <div className="bg-white rounded-2xl border border-slate-200/80 shadow-sm overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full min-w-max text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 sticky top-0 z-10">
                <tr>
                  <th className="sticky left-0 z-20 px-3 py-2 text-left font-bold text-slate-700 bg-white border-r border-slate-200 whitespace-nowrap">
                    Student
                  </th>
                  {sortedRotations.map(rotation => (
                    <th
                      key={rotation.id}
                      className="px-3 py-2 text-left font-bold text-slate-700 bg-white border-r border-slate-200 whitespace-nowrap min-w-[140px]"
                    >
                      <div className="font-semibold">{rotation.name}</div>
                      <div className="text-xs text-slate-500">
                        {formatDate(rotation.finalizedAt)}
                      </div>
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {students.map(student => (
                  <tr key={student.id} className="border-b border-slate-100 hover:bg-slate-50/50">
                    <td className="sticky left-0 z-10 px-3 py-2 font-medium text-slate-900 bg-white border-r border-slate-200 whitespace-nowrap">
                      {student.name}
                    </td>
                    {sortedRotations.map(rotation => {
                      const assignment = rotation.assignments.find(a => a.studentId === student.id);
                      const roleName = assignment?.roleName;
                      const isStandby = assignment && !assignment.roleId;
                      return (
                        <td
                          key={rotation.id}
                          className={`px-3 py-2 border-r border-slate-200 whitespace-nowrap min-w-[140px] ${
                            isStandby ? 'bg-blue-50 text-blue-900' : ''
                          }`}
                        >
                          {roleName || (isStandby ? '🎒 Standby' : '—')}
                        </td>
                      );
                    })}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="p-4 bg-slate-50 border-t border-slate-200 text-xs text-slate-500">
            <span className="font-medium text-slate-700">Legend:</span>{' '}
            <span className="inline-flex items-center gap-1 ml-2">
              <span className="w-3 h-3 rounded bg-blue-100 border border-blue-300" />{' '}
              Standby/Reserve
            </span>
            <span className="ml-4">— = Not assigned / Not in class</span>
          </div>
        </div>
      )}
    </div>
  );
};
