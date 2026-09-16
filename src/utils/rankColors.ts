/**
 * Shared rank color configurations.
 * Used by StudentManager, AssignmentBoard, StatsSidebar, and RankPill components.
 */

export const RANK_COLORS = [
  {
    index: 0,
    label: "1st",
    emoji: "🥇",
    bgColor: "bg-amber-50",
    borderColor: "border-amber-200",
    textColor: "text-amber-800",
    pillBgColor: "bg-amber-100",
    pillBorderColor: "border-amber-300",
    pillTextColor: "text-amber-900",
  },
  {
    index: 1,
    label: "2nd",
    emoji: "🥈",
    bgColor: "bg-blue-50",
    borderColor: "border-blue-200",
    textColor: "text-blue-800",
    pillBgColor: "bg-blue-100",
    pillBorderColor: "border-blue-300",
    pillTextColor: "text-blue-900",
  },
  {
    index: 2,
    label: "3rd",
    emoji: "✨",
    bgColor: "bg-purple-50",
    borderColor: "border-purple-200",
    textColor: "text-purple-800",
    pillBgColor: "bg-purple-100",
    pillBorderColor: "border-purple-300",
    pillTextColor: "text-purple-900",
  },
  {
    index: 3,
    label: "4th",
    emoji: "🔹",
    bgColor: "bg-teal-50",
    borderColor: "border-teal-200",
    textColor: "text-teal-800",
    pillBgColor: "bg-teal-100",
    pillBorderColor: "border-teal-300",
    pillTextColor: "text-teal-900",
  },
  {
    index: 4,
    label: "5th",
    emoji: "🔸",
    bgColor: "bg-slate-50",
    borderColor: "border-slate-200",
    textColor: "text-slate-800",
    pillBgColor: "bg-slate-100",
    pillBorderColor: "border-slate-300",
    pillTextColor: "text-slate-800",
  },
] as const;

export type RankColorConfig = (typeof RANK_COLORS)[number];

/**
 * Get rank color configuration by index (0-4 for 1st-5th choice)
 */
export function getRankColorConfig(index: number): RankColorConfig {
  return RANK_COLORS[index] || RANK_COLORS[4];
}

/**
 * Get rank color configuration by label
 */
export function getRankColorConfigByLabel(label: string): RankColorConfig {
  return RANK_COLORS.find((c) => c.label === label) || RANK_COLORS[4];
}