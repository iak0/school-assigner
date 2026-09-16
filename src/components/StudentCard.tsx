import React from "react";
import { GripVertical } from "lucide-react";
import { CompactPreferencePill } from "./PreferencePill";
import { useStudentHistory } from "../hooks/useStudentHistory";
import { RotationSnapshot, Role } from "../types";

interface StudentCardProps {
  studentId: string;
  studentName: string;
  adjustmentScore: number;
  assignedRank: number | null;
  roleId: string | null;
  isLocked: boolean;
  isDragging: boolean;
  isDragOver: boolean;
  preferences: string[];
  roleMap: Map<string, Role>;
  getRankBadge: (rank: number | null) => React.ReactNode;
  getLetterBadge: (score: number) => React.ReactNode;
  onDragStart: (e: React.DragEvent, studentId: string, roleId: string | null) => void;
  onDragEnd: () => void;
  onDragOver: (e: React.DragEvent, target: string) => void;
  onDrop: (e: React.DragEvent, studentId: string, roleId: string | null) => void;
  onToggleLock?: (e: React.MouseEvent, studentId: string) => void;
  showRepeatWarning?: boolean;
  repeatWarningDate?: string;
  isStandby?: boolean;
  isAnyDragging?: boolean;
  rotationHistory?: RotationSnapshot[];
}

export const StudentCard: React.FC<StudentCardProps> = ({
  studentId,
  studentName,
  adjustmentScore,
  assignedRank,
  roleId,
  isLocked,
  isDragging,
  isDragOver,
  preferences,
  roleMap,
  getRankBadge,
  getLetterBadge,
  onDragStart,
  onDragEnd,
  onDragOver,
  onDrop,
  onToggleLock,
  showRepeatWarning,
  repeatWarningDate,
  isStandby = false,
  isAnyDragging = false,
  rotationHistory,
}) => {
  const { getStudentHistory } = useStudentHistory({ rotationHistory });
  const [showTooltip, setShowTooltip] = React.useState(false);

  // Suppress dragover highlights on self while dragging
  const showDragOver = isDragOver && !isDragging;

  // Top 3 choice badges
  const topChoices = (preferences ?? []).slice(0, 3).map((rId, idx) => {
    const r = roleMap.get(rId);
    return (
      <CompactPreferencePill
        key={rId}
        role={r}
        rankIndex={idx}
      />
    );
  });

  // Tooltip content: Job History Only
  const history = getStudentHistory(studentId);

  return (
    <div
      draggable
      onDragStart={(e) => onDragStart(e, studentId, roleId)}
      onDragEnd={onDragEnd}
      onDragOver={(e) => onDragOver(e, `student-${studentId}`)}
      onDrop={(e) => onDrop(e, studentId, roleId)}
      onMouseEnter={() => {
        if (!isAnyDragging && !isDragging) {
          setShowTooltip(true);
        }
      }}
      onMouseLeave={() => setShowTooltip(false)}
      className={`relative rounded-lg p-2 border cursor-grab active:cursor-grabbing select-none transition-colors ${
        isDragging
          ? 'opacity-40 border-dashed border-blue-400 bg-blue-50'
          : showDragOver
          ? 'bg-indigo-100 border-indigo-600 ring-2 ring-indigo-400'
          : isStandby
          ? 'bg-white hover:bg-slate-50 border-slate-200'
          : isLocked
          ? 'bg-amber-50/80 border-amber-300 shadow-2xs'
          : 'bg-slate-50 hover:bg-slate-100/90 border-slate-200 hover:border-slate-300'
      }`}
    >
      <div className="flex items-center justify-between gap-1.5 pointer-events-none">
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          <GripVertical className="w-3 h-3 text-slate-300 hover:text-slate-500 flex-shrink-0" />
          <span className="font-bold text-slate-900 text-xs truncate">
            {studentName}
          </span>
          {showDragOver && (
            <span className="text-[9px] font-bold text-indigo-800 bg-indigo-200 px-1.5 py-0.2 rounded border border-indigo-400 flex-shrink-0">
              🔄 Swap
            </span>
          )}
        </div>

        <div className="flex items-center gap-1 flex-shrink-0">
          {!isStandby && getRankBadge(assignedRank)}
          {getLetterBadge(adjustmentScore)}

          {showRepeatWarning && repeatWarningDate && (
            <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded text-[10px] font-medium bg-rose-100 text-rose-800 border border-rose-300 flex-shrink-0"
              title={`Repeated role from ${repeatWarningDate}`}
            >
              ⚠️
            </span>
          )}

          {onToggleLock && (
            <button
              type="button"
              onClick={(e) => onToggleLock(e, studentId)}
              className={`p-1 rounded text-xs transition-colors ${
                isAnyDragging ? 'pointer-events-none' : 'pointer-events-auto'
              } ${
                isLocked
                  ? 'bg-amber-200 text-amber-900 hover:bg-amber-300'
                  : 'text-slate-300 hover:text-slate-700 hover:bg-slate-200'
              }`}
              title={
                isLocked
                  ? isStandby
                    ? 'Unlock from standby'
                    : 'Unlock assignment'
                  : isStandby
                  ? 'Lock student to standby (keep unassigned)'
                  : 'Lock student to this job'
              }
            >
              {isLocked ? (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              ) : (
                <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M15 7h3a2 2 0 012 2v10a2 2 0 01-2 2h-3M9 7H6a2 2 0 01-2-2V7a2 2 0 012-2h3m6 0H9m4 0H9m-2 4v8a2 2 0 01-2 2H9a2 2 0 01-2-2v-8" />
                </svg>
              )}
            </button>
          )}
        </div>
      </div>

      {/* Top 3 Choice Badges */}
      <div className="flex flex-wrap gap-1 mt-1 pl-4.5 pointer-events-none">
        {topChoices}
      </div>

      {/* Hover Tooltip: Job History Only (Suppressed while any dragging is active) */}
      {showTooltip && !isAnyDragging && !isDragging && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-64 p-2 bg-slate-900 text-slate-100 text-[10px] rounded-lg shadow-xl z-50 pointer-events-none animate-fade-in">
          {/* Job History */}
          <div className="font-semibold text-amber-400 mb-1">Previous Jobs</div>
          {history.length === 0 ? (
            <div className="text-slate-400">No previous jobs</div>
          ) : (
            <div className="space-y-0.5">
              {history.slice(0, 5).map((h, idx) => (
                <div key={idx} className="flex items-center gap-1 text-slate-300">
                  <span className="text-amber-400">•</span>
                  <span>{h.roleName}</span>
                  <span className="text-slate-500">({h.date})</span>
                </div>
              ))}
              {history.length > 5 && (
                <div className="text-slate-500 text-center">+{history.length - 5} more</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};