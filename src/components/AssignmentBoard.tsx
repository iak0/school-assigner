import { ArrowDownToLine, CheckCircle2, Search } from 'lucide-react';
import React, { useState } from 'react';

import { getDetailedAssignments } from '../engine/matcher';
import { useStudentHistory } from '../hooks/useStudentHistory';
import { Assignment, Role, RotationSnapshot, Student } from '../types';
import { AntiRepetitionSettingsModal } from './AntiRepetitionSettingsModal';
import { FinalizeRotationModal } from './FinalizeRotationModal';
import { StudentCard } from './StudentCard';

interface AssignmentBoardProps {
  students: Student[];
  roles: Role[];
  assignments: Assignment[];
  onUpdateAssignments: (assignments: Assignment[]) => void;
  onFinalizeRotation: (name: string, notes: string, clearBoard: boolean) => void;
  rotationHistoryLength: number;
  antiRepetitionConfig: {
    recencyWindow: number;
    avoidanceStrictness: 'strict' | 'balanced';
    standbyPriority: boolean;
  };
  onUpdateAntiRepetitionConfig: (config: {
    recencyWindow: number;
    avoidanceStrictness: 'strict' | 'balanced';
    standbyPriority: boolean;
  }) => void;
  rotationHistory?: RotationSnapshot[];
  showFinalizeModal?: boolean;
  onCloseFinalizeModal?: () => void;
}

interface DragPayload {
  studentId: string;
  sourceRoleId: string | null;
}

export const AssignmentBoard: React.FC<AssignmentBoardProps> = ({
  students,
  roles,
  assignments,
  onUpdateAssignments,
  onFinalizeRotation,
  rotationHistoryLength,
  antiRepetitionConfig,
  onUpdateAntiRepetitionConfig,
  rotationHistory,
  showFinalizeModal = false,
  onCloseFinalizeModal,
}) => {
  const [standbySearch, setStandbySearch] = useState('');
  const [draggedItem, setDraggedItem] = useState<DragPayload | null>(null);
  const [dragOverTarget, setDragOverTarget] = useState<string | null>(null);
  const [showSettingsModal, setShowSettingsModal] = useState(false);

  const detailedAssignments = getDetailedAssignments(students, roles, assignments);
  const detailedMap = new Map(detailedAssignments.map(d => [d.studentId, d]));
  const roleMap = new Map(roles.map(r => [r.id, r]));

  const { getRecentRoleRepeat } = useStudentHistory({ rotationHistory });

  // Group assignments by role
  const assignmentsByRole = new Map<string, typeof detailedAssignments>();
  for (const role of roles) {
    assignmentsByRole.set(role.id, []);
  }

  const unassignedStudents: typeof detailedAssignments = [];

  for (const item of detailedAssignments) {
    if (item.roleId && assignmentsByRole.has(item.roleId)) {
      assignmentsByRole.get(item.roleId)!.push(item);
    } else {
      unassignedStudents.push(item);
    }
  }

  const filteredUnassigned = unassignedStudents.filter(s =>
    s.studentName.toLowerCase().includes(standbySearch.toLowerCase())
  );

  // Toggle Lock
  const handleToggleLock = (e: React.MouseEvent, studentId: string) => {
    e.stopPropagation();
    const updated = assignments.map(a =>
      a.studentId === studentId ? { ...a, isLocked: !a.isLocked } : a
    );
    if (!updated.some(a => a.studentId === studentId)) {
      const cur = detailedMap.get(studentId);
      updated.push({
        studentId,
        roleId: cur?.roleId || null,
        isLocked: true,
      });
    }
    onUpdateAssignments(updated);
  };

  // Drag Handlers
  const handleDragStart = (e: React.DragEvent, studentId: string, sourceRoleId: string | null) => {
    const payload: DragPayload = { studentId, sourceRoleId };
    setDraggedItem(payload);
    e.dataTransfer.setData('application/json', JSON.stringify(payload));
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragEnd = () => {
    setDraggedItem(null);
    setDragOverTarget(null);
  };

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault();
    e.stopPropagation();
    e.dataTransfer.dropEffect = 'move';

    // Prevent highlighting/dropping onto the student currently being dragged
    if (draggedItem && targetId === `student-${draggedItem.studentId}`) {
      if (dragOverTarget !== null) {
        setDragOverTarget(null);
      }
      return;
    }

    if (dragOverTarget !== targetId) {
      setDragOverTarget(targetId);
    }
  };

  // Drop Handlers
  const handleDropOnStudent = (
    e: React.DragEvent,
    targetStudentId: string,
    targetRoleId: string | null
  ) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);

    let payload = draggedItem;
    if (!payload) {
      try {
        payload = JSON.parse(e.dataTransfer.getData('application/json'));
      } catch {
        return;
      }
    }

    if (!payload || payload.studentId === targetStudentId) return;

    const sourceStudentId = payload.studentId;
    const sourceRoleId = payload.sourceRoleId;

    // SWAP: sourceStudent gets targetRoleId, targetStudent gets sourceRoleId
    const updated = [...assignments];

    const sourceIdx = updated.findIndex(a => a.studentId === sourceStudentId);
    const targetIdx = updated.findIndex(a => a.studentId === targetStudentId);

    if (sourceIdx >= 0) {
      updated[sourceIdx] = { ...updated[sourceIdx], roleId: targetRoleId };
    } else {
      updated.push({ studentId: sourceStudentId, roleId: targetRoleId, isLocked: false });
    }

    if (targetIdx >= 0) {
      updated[targetIdx] = { ...updated[targetIdx], roleId: sourceRoleId };
    } else {
      updated.push({ studentId: targetStudentId, roleId: sourceRoleId, isLocked: false });
    }

    onUpdateAssignments(updated);
    setDraggedItem(null);
  };

  const handleDropOnRoleSlot = (e: React.DragEvent, targetRoleId: string) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);

    let payload = draggedItem;
    if (!payload) {
      try {
        payload = JSON.parse(e.dataTransfer.getData('application/json'));
      } catch {
        return;
      }
    }

    if (!payload) return;

    const sourceStudentId = payload.studentId;
    const updated = [...assignments];
    const sourceIdx = updated.findIndex(a => a.studentId === sourceStudentId);

    if (sourceIdx >= 0) {
      updated[sourceIdx] = { ...updated[sourceIdx], roleId: targetRoleId };
    } else {
      updated.push({ studentId: sourceStudentId, roleId: targetRoleId, isLocked: false });
    }

    onUpdateAssignments(updated);
    setDraggedItem(null);
  };

  const handleDropOnUnassignedBank = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragOverTarget(null);

    let payload = draggedItem;
    if (!payload) {
      try {
        payload = JSON.parse(e.dataTransfer.getData('application/json'));
      } catch {
        return;
      }
    }

    if (!payload || payload.sourceRoleId === null) return;

    const sourceStudentId = payload.studentId;
    const updated = [...assignments];
    const sourceIdx = updated.findIndex(a => a.studentId === sourceStudentId);

    if (sourceIdx >= 0) {
      updated[sourceIdx] = { ...updated[sourceIdx], roleId: null };
    } else {
      updated.push({ studentId: sourceStudentId, roleId: null, isLocked: false });
    }

    onUpdateAssignments(updated);
    setDraggedItem(null);
  };

  const getRankBadge = (rank: number | null) => {
    if (rank === 1) {
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-amber-100 text-amber-900 border border-amber-300">
          1st
        </span>
      );
    }
    if (rank === 2) {
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
          2nd
        </span>
      );
    }
    if (rank === 3) {
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-semibold bg-purple-100 text-purple-900 border border-purple-300">
          3rd
        </span>
      );
    }
    if (rank === 4) {
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-teal-100 text-teal-900 border border-teal-300">
          4th
        </span>
      );
    }
    if (rank === 5) {
      return (
        <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-slate-100 text-slate-800 border border-slate-300">
          5th
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-50 text-rose-800 border border-rose-200">
        Unranked
      </span>
    );
  };

  const getLetterBadge = (score: number) => {
    if (score === 0) return null;
    return (
      <span
        className={`px-1 py-0.2 rounded text-[9px] font-bold ${
          score > 0
            ? 'bg-emerald-100 text-emerald-800 border border-emerald-300'
            : 'bg-rose-100 text-rose-800 border border-rose-300'
        }`}
        title={`Teacher adjustment: ${score > 0 ? `+${score}` : score}`}
      >
        {score > 0 ? `+${score}` : score}
      </span>
    );
  };

  return (
    <>
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 items-start">
        {/* Left Side: Roles Grid (8 or 9 cols) */}
        <div className="lg:col-span-8 xl:col-span-9 grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
          {roles.map(role => {
            const assignedList = assignmentsByRole.get(role.id) || [];
            const emptySlotsCount = Math.max(0, role.capacity - assignedList.length);
            const isFull = assignedList.length >= role.capacity;
            const isTargetOver = dragOverTarget === `role-${role.id}`;

            return (
              <div
                key={role.id}
                onDragOver={!isFull ? e => handleDragOver(e, `role-${role.id}`) : undefined}
                onDrop={!isFull ? e => handleDropOnRoleSlot(e, role.id) : undefined}
                className={`bg-white rounded-xl border flex flex-col justify-between transition-colors ${
                  isTargetOver && !isFull
                    ? 'border-blue-500 ring-2 ring-blue-300 bg-blue-50/50'
                    : isFull
                      ? 'border-slate-200 shadow-2xs'
                      : 'border-dashed border-amber-300 bg-amber-50/10'
                }`}
              >
                {/* Role Card Header */}
                <div className="px-3.5 py-2.5 border-b border-slate-100 flex items-center justify-between bg-slate-50/60 rounded-t-xl pointer-events-none">
                  <div className="flex items-center gap-2">
                    <span className="text-xl">{role.icon || '⭐'}</span>
                    <div>
                      <h3 className="font-bold text-slate-800 text-xs leading-tight">
                        {role.name}
                      </h3>
                      <span className="text-[10px] text-slate-400">
                        {role.capacity} {role.capacity === 1 ? 'Slot' : 'Slots'}
                      </span>
                    </div>
                  </div>

                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full border ${
                      isFull
                        ? 'bg-emerald-100 text-emerald-800 border-emerald-200'
                        : 'bg-amber-100 text-amber-800 border-amber-200'
                    }`}
                  >
                    {assignedList.length}/{role.capacity}
                  </span>
                </div>

                {/* Assigned Student Slots */}
                <div className="p-2 space-y-1.5 flex-1">
                  {assignedList.map(assigned => {
                    const isDraggingThis = draggedItem?.studentId === assigned.studentId;
                    const isDragOverThis =
                      dragOverTarget === `student-${assigned.studentId}` && !isDraggingThis;

                    // Calculate repeat warning for the currently assigned student in this role
                    const currentAssignmentRepeat = getRecentRoleRepeat(
                      assigned.studentId,
                      role.id
                    );

                    // Calculate repeat warning for the dragged student over this role (during drag)
                    const dragRepeat =
                      draggedItem && isDragOverThis
                        ? getRecentRoleRepeat(draggedItem.studentId, role.id)
                        : { isRepeat: false, date: '' };

                    // Show repeat warning for current assignment OR during drag
                    const showRepeat = currentAssignmentRepeat.isRepeat || dragRepeat.isRepeat;
                    const repeatDate = currentAssignmentRepeat.isRepeat
                      ? currentAssignmentRepeat.date
                      : dragRepeat.date;

                    return (
                      <StudentCard
                        key={assigned.studentId}
                        studentId={assigned.studentId}
                        studentName={assigned.studentName}
                        adjustmentScore={assigned.adjustmentScore}
                        assignedRank={assigned.assignedRank}
                        roleId={role.id}
                        isLocked={assigned.isLocked}
                        isDragging={isDraggingThis}
                        isDragOver={isDragOverThis}
                        isAnyDragging={draggedItem !== null}
                        preferences={assigned.preferences}
                        roleMap={roleMap}
                        getRankBadge={getRankBadge}
                        getLetterBadge={getLetterBadge}
                        onDragStart={handleDragStart}
                        onDragEnd={handleDragEnd}
                        onDragOver={handleDragOver}
                        onDrop={handleDropOnStudent}
                        onToggleLock={handleToggleLock}
                        showRepeatWarning={showRepeat}
                        repeatWarningDate={repeatDate}
                        isStandby={false}
                        rotationHistory={rotationHistory}
                      />
                    );
                  })}

                  {/* Empty Slots Droppable Indicators */}
                  {Array.from({ length: emptySlotsCount }).map((_, idx) => (
                    <div
                      key={idx}
                      onDragOver={e => handleDragOver(e, `slot-${role.id}-${idx}`)}
                      onDrop={e => handleDropOnRoleSlot(e, role.id)}
                      className={`border-2 border-dashed rounded-lg py-2 text-center text-[11px] font-medium ${
                        dragOverTarget === `slot-${role.id}-${idx}`
                          ? 'border-blue-500 bg-blue-100 text-blue-700 ring-2 ring-blue-300'
                          : 'border-slate-200 text-slate-400 hover:border-slate-300 bg-slate-50/40'
                      }`}
                    >
                      ➕ Drop student here
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>

        {/* Right Side: Sticky Standby / Unassigned Bank (4 or 3 cols) */}
        <div data-testid="standby-column" className="lg:col-span-4 xl:col-span-3 sticky top-20">
          <div
            onDragOver={e => handleDragOver(e, 'unassigned-bank')}
            onDrop={handleDropOnUnassignedBank}
            className={`bg-white rounded-2xl border flex flex-col shadow-sm max-h-[calc(100vh-6rem)] ${
              dragOverTarget === 'unassigned-bank'
                ? 'border-rose-400 ring-4 ring-rose-200 bg-rose-50/70'
                : 'border-slate-200'
            }`}
          >
            {/* Standby Header & Drop Target */}
            <div className="p-3.5 bg-slate-50 border-b border-slate-200 pointer-events-none">
              <div className="flex items-center gap-1.5 mb-2">
                <span className="text-lg">🎒</span>
                <h3 className="font-bold text-slate-800 text-xs">
                  Standby Reserve ({unassignedStudents.length})
                </h3>
              </div>

              {/* Drag Here to Unassign Banner */}
              {draggedItem && draggedItem.sourceRoleId !== null && (
                <div className="bg-rose-100 text-rose-800 text-[11px] font-bold p-2 rounded-xl border border-rose-300 text-center flex items-center justify-center gap-1.5 mb-2">
                  <ArrowDownToLine className="w-3.5 h-3.5" />
                  Drop here to unassign
                </div>
              )}

              {/* Search Box */}
              <div className="relative pointer-events-auto">
                <Search className="w-3 h-3 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  placeholder="Filter standby..."
                  value={standbySearch}
                  onChange={e => setStandbySearch(e.target.value)}
                  className="w-full pl-7 pr-2 py-1 bg-white border border-slate-200 rounded-lg text-xs focus:ring-1 focus:ring-blue-500 focus:outline-none"
                />
              </div>
            </div>

            {/* Standby Draggable Students List */}
            <div
              className="p-2.5 space-y-1.5 overflow-y-auto flex-1 max-h-[60vh] divide-y divide-slate-100"
              style={{ overflow: 'visible' }}
            >
              {unassignedStudents.length === 0 ? (
                <div className="text-center py-8 text-slate-400 text-xs flex flex-col items-center gap-1.5 pointer-events-none">
                  <CheckCircle2 className="w-6 h-6 text-emerald-500" />
                  <span className="font-semibold text-slate-700">All students assigned!</span>
                  <span className="text-[11px]">Drag any student here to unassign them.</span>
                </div>
              ) : filteredUnassigned.length === 0 ? (
                <div className="text-center py-6 text-slate-400 text-xs pointer-events-none">
                  No standby students match "{standbySearch}"
                </div>
              ) : (
                filteredUnassigned.map(unassigned => {
                  const isDraggingThis = draggedItem?.studentId === unassigned.studentId;
                  const isDragOverThis =
                    dragOverTarget === `student-${unassigned.studentId}` && !isDraggingThis;
                  const studentObj = students.find(s => s.id === unassigned.studentId);

                  return (
                    <StudentCard
                      key={unassigned.studentId}
                      studentId={unassigned.studentId}
                      studentName={unassigned.studentName}
                      adjustmentScore={unassigned.adjustmentScore}
                      assignedRank={null}
                      roleId={null}
                      isLocked={unassigned.isLocked}
                      isDragging={isDraggingThis}
                      isDragOver={isDragOverThis}
                      isAnyDragging={draggedItem !== null}
                      preferences={studentObj?.preferences ?? []}
                      roleMap={roleMap}
                      getRankBadge={getRankBadge}
                      getLetterBadge={getLetterBadge}
                      onDragStart={handleDragStart}
                      onDragEnd={handleDragEnd}
                      onDragOver={handleDragOver}
                      onDrop={handleDropOnStudent}
                      onToggleLock={handleToggleLock}
                      isStandby={true}
                      rotationHistory={rotationHistory}
                    />
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>

      {/* Finalize Rotation Modal */}
      <FinalizeRotationModal
        isOpen={showFinalizeModal}
        onClose={onCloseFinalizeModal ?? (() => {})}
        onFinalize={onFinalizeRotation}
        defaultName={getDefaultRotationName()}
        hasAssignments={assignments.some(a => a.roleId)}
      />

      {/* Anti-Repetition Settings Modal */}
      <AntiRepetitionSettingsModal
        isOpen={showSettingsModal}
        onClose={() => setShowSettingsModal(false)}
        config={antiRepetitionConfig}
        onUpdateConfig={onUpdateAntiRepetitionConfig}
        rotationHistoryLength={rotationHistoryLength}
      />
    </>
  );
};

// Helper to generate default rotation name (e.g., "October 2026 Jobs")
function getDefaultRotationName(): string {
  const now = new Date();
  const monthName = now.toLocaleString('default', { month: 'long' });
  const year = now.getFullYear();
  return `${monthName} ${year} Jobs`;
}
