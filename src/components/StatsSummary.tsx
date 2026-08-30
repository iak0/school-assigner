import React, { useState } from 'react';
import { MatchStatistics } from '../types';
import { Sparkles, Trophy, Award, Heart, HelpCircle } from 'lucide-react';

interface StatsSummaryProps {
  stats: MatchStatistics;
}

export const StatsSummary: React.FC<StatsSummaryProps> = ({ stats }) => {
  const [showFormulaTooltip, setShowFormulaTooltip] = useState(false);

  return (
    <div className="bg-white rounded-2xl p-5 shadow-sm border border-slate-200/80 mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-slate-100">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">📊</span>
            <h3 className="text-lg font-bold text-slate-800">Assignment Happiness & Stats</h3>
            <span className="bg-amber-100 text-amber-800 text-xs font-semibold px-2.5 py-0.5 rounded-full border border-amber-200">
              {stats.assignedCount} / {stats.totalSlots} Slots Filled
            </span>
          </div>
          <p className="text-xs text-slate-500 mt-0.5">
            {stats.totalStudents} total students • {stats.unassignedCount} students currently on standby / reserve
          </p>
        </div>

        {/* Subtle, unemphasized raw utility score display */}
        <div className="relative flex items-center gap-2 self-start lg:self-center bg-slate-50 border border-slate-200 px-3 py-1.5 rounded-xl">
          <div className="text-right">
            <span className="text-[11px] uppercase tracking-wider text-slate-400 font-semibold block leading-tight">
              Raw Utility Score
            </span>
            <span className="font-mono text-xs font-medium text-slate-600">
              {stats.rawUtilityScore.toLocaleString()} pts
            </span>
          </div>
          <button
            type="button"
            className="text-slate-400 hover:text-slate-600 p-1 rounded transition-colors"
            onClick={() => setShowFormulaTooltip(!showFormulaTooltip)}
            title="How is the raw utility score calculated?"
          >
            <HelpCircle className="w-3.5 h-3.5" />
          </button>

          {showFormulaTooltip && (
            <div className="absolute right-0 top-full mt-2 w-72 p-3 bg-slate-900 text-slate-100 text-xs rounded-xl shadow-xl z-30 border border-slate-700 leading-relaxed">
              <div className="font-semibold text-amber-400 mb-1 flex items-center gap-1">
                <span>⚡</span> Optimization Metric
              </div>
              <p className="mb-2 text-slate-300">
                This is the raw score the matching algorithm maximizes:
              </p>
              <div className="space-y-1 font-mono text-[11px] bg-slate-800 p-2 rounded-lg text-slate-300">
                <div>• 1st Choice: +100 pts</div>
                <div>• 2nd Choice: +70 pts</div>
                <div>• 3rd Choice: +45 pts</div>
                <div>• 4th Choice: +25 pts</div>
                <div>• 5th Choice: +10 pts</div>
                <div>• Letter Bonus: -45 to +45 pts</div>
              </div>
              <p className="mt-2 text-[10px] text-slate-400">
                Rearranging or locking students live updates this score.
              </p>
            </div>
          )}
        </div>
      </div>

      {/* Main Metric Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-4">
        {/* Top 2 Choices % */}
        <div className="bg-gradient-to-br from-emerald-50 to-teal-50/50 border border-emerald-200/70 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-emerald-500 text-white flex items-center justify-center shadow-sm">
            <Trophy className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-emerald-950">{stats.topTwoPercent}%</div>
            <div className="text-xs text-emerald-800 font-medium">Got Top 2 Choices</div>
          </div>
        </div>

        {/* 1st Choice Count */}
        <div className="bg-gradient-to-br from-amber-50 to-orange-50/50 border border-amber-200/70 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-500 text-white flex items-center justify-center shadow-sm">
            <Sparkles className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-amber-950">
              {stats.choiceDistribution.firstChoice}
              <span className="text-xs font-normal text-amber-700 ml-1">
                ({stats.assignedCount > 0 ? Math.round((stats.choiceDistribution.firstChoice / stats.assignedCount) * 100) : 0}%)
              </span>
            </div>
            <div className="text-xs text-amber-800 font-medium">Got #1 Choice</div>
          </div>
        </div>

        {/* Average Rank */}
        <div className="bg-gradient-to-br from-blue-50 to-sky-50/50 border border-blue-200/70 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-blue-500 text-white flex items-center justify-center shadow-sm">
            <Award className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-blue-950">
              {stats.averageRank ? `#${stats.averageRank}` : 'N/A'}
            </div>
            <div className="text-xs text-blue-800 font-medium">Avg Preference Rank</div>
          </div>
        </div>

        {/* Overall Happiness */}
        <div className="bg-gradient-to-br from-purple-50 to-indigo-50/50 border border-purple-200/70 rounded-xl p-3.5 flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-purple-500 text-white flex items-center justify-center shadow-sm">
            <Heart className="w-5 h-5" />
          </div>
          <div>
            <div className="text-xl font-extrabold text-purple-950">{stats.satisfactionPercentage}%</div>
            <div className="text-xs text-purple-800 font-medium">Satisfaction Index</div>
          </div>
        </div>
      </div>

      {/* Preference Distribution Breakdown */}
      <div className="mt-4 pt-3 border-t border-slate-100 flex flex-wrap items-center gap-2 text-xs">
        <span className="text-slate-500 font-medium mr-1">Distribution:</span>
        <span className="bg-amber-50 text-amber-800 border border-amber-200 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-amber-500"></span>
          1st: <b>{stats.choiceDistribution.firstChoice}</b>
        </span>
        <span className="bg-blue-50 text-blue-800 border border-blue-200 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-blue-500"></span>
          2nd: <b>{stats.choiceDistribution.secondChoice}</b>
        </span>
        <span className="bg-purple-50 text-purple-800 border border-purple-200 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-purple-500"></span>
          3rd: <b>{stats.choiceDistribution.thirdChoice}</b>
        </span>
        <span className="bg-teal-50 text-teal-800 border border-teal-200 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-teal-500"></span>
          4th: <b>{stats.choiceDistribution.fourthChoice}</b>
        </span>
        <span className="bg-slate-50 text-slate-800 border border-slate-200 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1">
          <span className="w-2 h-2 rounded-full bg-slate-500"></span>
          5th: <b>{stats.choiceDistribution.fifthChoice}</b>
        </span>
        {stats.choiceDistribution.unranked > 0 && (
          <span className="bg-rose-50 text-rose-800 border border-rose-200 px-2.5 py-1 rounded-lg font-medium flex items-center gap-1">
            <span className="w-2 h-2 rounded-full bg-rose-500"></span>
            Unranked: <b>{stats.choiceDistribution.unranked}</b>
          </span>
        )}
        <span className="ml-auto text-slate-400 text-[11px]">
          {stats.unassignedCount} students waiting for next rotation
        </span>
      </div>
    </div>
  );
};
