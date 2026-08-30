import React, { useState } from "react";
import { MatchStatistics } from "../types";
import { Sparkles, Trophy, Award, Search, HelpCircle } from "lucide-react";

interface StatsSidebarProps {
  stats: MatchStatistics;
}

export const StatsSidebar: React.FC<StatsSidebarProps> = ({ stats }) => {
  const [showFormulaTooltip, setShowFormulaTooltip] = useState(false);

  if (stats.assignedCount === 0) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 sticky top-16">
        <div className="text-center py-6 text-slate-500">
          <Sparkles className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="font-medium text-slate-700 text-sm">
            No assignments yet
          </p>
          <p className="text-xs text-slate-400 mt-0.5">
            Generate matches or drag students to see stats
          </p>
        </div>
      </div>
    );
  }

  const firstChoicePercent =
    stats.assignedCount > 0
      ? Math.round(
          (stats.choiceDistribution.firstChoice / stats.assignedCount) * 100,
        )
      : 0;

  const topThreePercent =
    stats.assignedCount > 0
      ? Math.round(
          ((stats.choiceDistribution.firstChoice +
            stats.choiceDistribution.secondChoice +
            stats.choiceDistribution.thirdChoice) /
            stats.assignedCount) *
            100,
        )
      : 0;

  return (
    <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 sticky top-16 space-y-4 max-h-[calc(100vh-8rem)]">
      {/* Header */}
      <div className="flex items-center gap-1.5 pb-2 border-b border-slate-100">
        <span className="text-lg">📊</span>
        <h3 className="text-base font-bold text-slate-800">Matching Metrics</h3>
      </div>

      {/* Key Metric Cards - vertical stack, reordered */}
      <div className="space-y-2.5">
        {/* Slots Filled - FIRST */}
        <div className="bg-purple-50 border border-purple-200/70 rounded-lg p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-purple-500 text-white flex items-center justify-center flex-shrink-0">
            <Search className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-extrabold text-purple-950">
              {stats.assignedCount} / {stats.totalSlots}
            </div>
            <div className="text-xs text-purple-800 font-medium">
              Slots Filled
            </div>
          </div>
        </div>

        {/* #1 Choice Count */}
        <div className="bg-amber-50 border border-amber-200/70 rounded-lg p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-amber-500 text-white flex items-center justify-center flex-shrink-0">
            <Sparkles className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-extrabold text-amber-950 flex items-center gap-1">
              {stats.choiceDistribution.firstChoice}
              <span className="text-xs font-normal text-amber-700">
                ({firstChoicePercent}%)
              </span>
            </div>
            <div className="text-xs text-amber-800 font-medium">
              Students Got #1 Choice
            </div>
          </div>
        </div>

        {/* Top 3 Choices - NEW */}
        <div className="bg-teal-50 border border-teal-200/70 rounded-lg p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-teal-500 text-white flex items-center justify-center flex-shrink-0">
            <Award className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-extrabold text-teal-950 flex items-center gap-1">
              {stats.choiceDistribution.firstChoice +
                stats.choiceDistribution.secondChoice +
                stats.choiceDistribution.thirdChoice}
              <span className="text-xs font-normal text-teal-700">
                ({topThreePercent}%)
              </span>
            </div>
            <div className="text-xs text-teal-800 font-medium">
              Students Got Top 3 Choices
            </div>
          </div>
        </div>

        {/* Average Rank */}
        <div className="bg-blue-50 border border-blue-200/70 rounded-lg p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-500 text-white flex items-center justify-center flex-shrink-0">
            <Award className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-extrabold text-blue-950">
              {stats.averageRank ? `#${stats.averageRank}` : "N/A"}
            </div>
            <div className="text-xs text-blue-800 font-medium">
              Avg Preference Rank
            </div>
          </div>
        </div>

        {/* % of Optimality */}
        <div className="bg-emerald-50 border border-emerald-200/70 rounded-lg p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-emerald-500 text-white flex items-center justify-center flex-shrink-0">
            <Trophy className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0">
            <div className="text-xl font-extrabold text-emerald-950">
              {stats.optimalityPercentage}%
            </div>
            <div className="text-xs text-emerald-800 font-medium">
              % of Optimality
            </div>
          </div>
        </div>

        {/* Score - LAST, styled like other cards with gray */}
        <div className="relative bg-slate-50 border border-slate-200 rounded-lg p-3 flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-slate-400 text-white flex items-center justify-center flex-shrink-0">
            <HelpCircle className="w-4.5 h-4.5" />
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xl font-extrabold text-slate-900 font-mono">
              {stats.rawUtilityScore.toLocaleString()} pts
            </div>
            <div className="text-xs text-slate-600 font-medium">Score</div>
          </div>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 p-0.5 rounded transition-colors flex-shrink-0"
            onClick={() => setShowFormulaTooltip(!showFormulaTooltip)}
            title="How is the score calculated?"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          {showFormulaTooltip && (
            <div className="absolute right-0 top-full mt-1 w-64 p-2.5 bg-slate-900 text-slate-100 text-[10px] rounded-lg shadow-xl z-30 border border-slate-700 leading-relaxed">
              <div className="font-semibold text-amber-400 mb-1 flex items-center gap-1">
                <span>⚡</span> Optimization Metric
              </div>
              <p className="mb-1.5 text-slate-300">
                Raw score the algorithm maximizes:
              </p>
              <div className="space-y-0.5 font-mono text-[9px] bg-slate-800 p-1.5 rounded text-slate-300">
                <div>• 1st Choice: +100 pts</div>
                <div>• 2nd Choice: +70 pts</div>
                <div>• 3rd Choice: +45 pts</div>
                <div>• 4th Choice: +25 pts</div>
                <div>• 5th Choice: +10 pts</div>
                <div>• Adjustment Bonus: -45 to +45 pts</div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Preference Distribution - single row, horizontal scroll if needed */}
      <div className="pt-2 border-t border-slate-100">
        <div className="flex gap-1 overflow-x-auto pb-1 scrollbar-hide">
          <RankPill
            label="1st"
            count={stats.choiceDistribution.firstChoice}
            bgColor="bg-amber-50"
            borderColor="border-amber-200"
            textColor="text-amber-800"
          />
          <RankPill
            label="2nd"
            count={stats.choiceDistribution.secondChoice}
            bgColor="bg-blue-50"
            borderColor="border-blue-200"
            textColor="text-blue-800"
          />
          <RankPill
            label="3rd"
            count={stats.choiceDistribution.thirdChoice}
            bgColor="bg-purple-50"
            borderColor="border-purple-200"
            textColor="text-purple-800"
          />
          <RankPill
            label="4th"
            count={stats.choiceDistribution.fourthChoice}
            bgColor="bg-teal-50"
            borderColor="border-teal-200"
            textColor="text-teal-800"
          />
          <RankPill
            label="5th"
            count={stats.choiceDistribution.fifthChoice}
            bgColor="bg-slate-50"
            borderColor="border-slate-200"
            textColor="text-slate-800"
          />
          {stats.choiceDistribution.unranked > 0 && (
            <RankPill
              label="Unr"
              count={stats.choiceDistribution.unranked}
              bgColor="bg-rose-50"
              borderColor="border-rose-200"
              textColor="text-rose-800"
            />
          )}
        </div>
      </div>
    </div>
  );
};

interface RankPillProps {
  label: string;
  count: number;
  bgColor: string;
  borderColor: string;
  textColor: string;
}

const RankPill: React.FC<RankPillProps> = ({
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
