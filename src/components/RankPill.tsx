import React from 'react';

interface RankPillProps {
  label: string;
  count: number;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

export const RankPill: React.FC<RankPillProps> = ({
  label,
  count,
  bgColor,
  borderColor,
  textColor,
}) => {
  return (
    <span
      className={`inline-flex items-center gap-1 ${bgColor} ${borderColor} border px-2 py-1 rounded-lg`}
    >
      <span className={`font-bold text-xs ${textColor}`}>{label}</span>
      <span className={`font-bold text-xs ${textColor}`}>{count}</span>
    </span>
  );
};

// Preset configurations for each rank
export const RANK_PILL_CONFIGS = [
  {
    index: 0,
    label: '1st',
    bgColor: 'bg-amber-50',
    borderColor: 'border-amber-200',
    textColor: 'text-amber-800',
  },
  {
    index: 1,
    label: '2nd',
    bgColor: 'bg-blue-50',
    borderColor: 'border-blue-200',
    textColor: 'text-blue-800',
  },
  {
    index: 2,
    label: '3rd',
    bgColor: 'bg-purple-50',
    borderColor: 'border-purple-200',
    textColor: 'text-purple-800',
  },
  {
    index: 3,
    label: '4th',
    bgColor: 'bg-teal-50',
    borderColor: 'border-teal-200',
    textColor: 'text-teal-800',
  },
  {
    index: 4,
    label: '5th',
    bgColor: 'bg-slate-50',
    borderColor: 'border-slate-200',
    textColor: 'text-slate-800',
  },
  {
    index: 5,
    label: 'Unr',
    bgColor: 'bg-rose-50',
    borderColor: 'border-rose-200',
    textColor: 'text-rose-800',
  },
] as const;
