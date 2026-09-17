import React from 'react';

import { Role } from '../types';
import { getRankColorConfig } from '../utils/rankColors';

interface PreferencePillProps {
  role: Role | undefined;
  rankIndex: number;
  showRankNumber?: boolean;
  showIcon?: boolean;
  showName?: boolean;
  maxWidth?: string;
  className?: string;
}

/**
 * A pill component for displaying a student's ranked preference.
 * Used in StudentManager and AssignmentBoard.
 */
export const PreferencePill: React.FC<PreferencePillProps> = ({
  role,
  rankIndex,
  showRankNumber = true,
  showIcon = true,
  showName = true,
  maxWidth = 'max-w-[110px]',
  className = '',
}) => {
  const config = getRankColorConfig(rankIndex);

  const pillClasses = `
    inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[11px] border font-medium
    ${config.pillBgColor} ${config.pillTextColor} ${config.pillBorderColor}
    ${className}
  `;

  return (
    <span
      className={pillClasses.trim()}
      title={`Rank #${rankIndex + 1}: ${role?.name || 'Unknown'}`}
    >
      {showRankNumber && <span className="text-[10px] opacity-75">#{rankIndex + 1}</span>}
      {showIcon && <span>{role?.icon || '⭐'}</span>}
      {showName && <span className={`truncate ${maxWidth}`}>{role?.name || 'Unknown'}</span>}
    </span>
  );
};

/**
 * A compact version of PreferencePill for space-constrained areas.
 */
export const CompactPreferencePill: React.FC<PreferencePillProps> = ({
  role,
  rankIndex,
  showRankNumber = true,
  showIcon = true,
  showName = true,
  className = '',
}) => {
  const config = getRankColorConfig(rankIndex);

  const pillClasses = `
    inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] border font-semibold
    ${config.pillBgColor} ${config.pillTextColor} ${config.pillBorderColor}
    ${className}
  `;

  return (
    <span
      className={pillClasses.trim()}
      title={`Rank #${rankIndex + 1}: ${role?.name || 'Unknown'}`}
    >
      {showRankNumber && <span className="opacity-75">#{rankIndex + 1}</span>}
      {showIcon && <span className="text-xs">{role?.icon || '⭐'}</span>}
      {showName && <span className="truncate max-w-[60px]">{role?.name || '?'}</span>}
    </span>
  );
};

/**
 * Render multiple preference pills for a student's preference list.
 */
interface PreferenceListProps {
  preferences: string[];
  roles: Role[];
  maxDisplay?: number;
  compact?: boolean;
  className?: string;
}

export const PreferenceList: React.FC<PreferenceListProps> = ({
  preferences,
  roles,
  maxDisplay = 5,
  compact = false,
  className = '',
}) => {
  const roleMap = new Map(roles.map(r => [r.id, r]));

  const displayedPrefs = preferences.slice(0, maxDisplay);

  if (displayedPrefs.length === 0) {
    return (
      <div className={`text-slate-300 text-[11px] italic ${className}`}>No preferences set</div>
    );
  }

  const PillComponent = compact ? CompactPreferencePill : PreferencePill;

  return (
    <div className={`flex flex-wrap items-center gap-1.5 ${className}`}>
      {displayedPrefs.map((roleId, idx) => {
        const role = roleMap.get(roleId);
        return <PillComponent key={roleId} role={role} rankIndex={idx} />;
      })}
      {preferences.length > maxDisplay && (
        <span className="inline-flex items-center px-2 py-0.5 rounded-md text-[10px] bg-slate-100 text-slate-600 border border-slate-200">
          +{preferences.length - maxDisplay} more
        </span>
      )}
    </div>
  );
};
