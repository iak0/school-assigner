import { Award, HelpCircle, Search, Sparkles, Trophy } from 'lucide-react';
import React from 'react';

import { MatchStatistics } from '../types';
import { MetricCard } from './MetricCard';
import { RankPill } from './RankPill';

interface StatsSidebarProps {
  stats: MatchStatistics;
}

export const StatsSidebar: React.FC<StatsSidebarProps> = ({ stats }) => {
  if (stats.assignedCount === 0) {
    return (
      <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-200/80 sticky top-16">
        <div className="text-center py-6 text-slate-500">
          <Sparkles className="w-8 h-8 mx-auto text-slate-300 mb-2" />
          <p className="font-medium text-slate-700 text-sm">No assignments yet</p>
          <p className="text-xs text-slate-400 mt-0.5">
            Generate matches or drag students to see stats
          </p>
        </div>
      </div>
    );
  }

  const firstChoicePercent =
    stats.assignedCount > 0
      ? Math.round((stats.choiceDistribution.firstChoice / stats.assignedCount) * 100)
      : 0;

  const topThreePercent =
    stats.assignedCount > 0
      ? Math.round(
          ((stats.choiceDistribution.firstChoice +
            stats.choiceDistribution.secondChoice +
            stats.choiceDistribution.thirdChoice) /
            stats.assignedCount) *
            100
        )
      : 0;

  const topThreeCount =
    stats.choiceDistribution.firstChoice +
    stats.choiceDistribution.secondChoice +
    stats.choiceDistribution.thirdChoice;

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
        <MetricCard
          icon={<Search className="w-4.5 h-4.5" />}
          value={`${stats.assignedCount} / ${stats.totalSlots}`}
          label="Slots Filled"
          iconBgColor="bg-purple-500"
          iconColor="text-white"
          textColor="text-purple-950"
          borderColor="border-purple-200"
          bgColor="bg-purple-50"
        />

        {/* #1 Choice Count */}
        <MetricCard
          icon={<Sparkles className="w-4.5 h-4.5" />}
          value={stats.choiceDistribution.firstChoice}
          subLabel={`(${firstChoicePercent}%)`}
          label="Students Got #1 Choice"
          iconBgColor="bg-amber-500"
          iconColor="text-white"
          textColor="text-amber-950"
          borderColor="border-amber-200"
          bgColor="bg-amber-50"
        />

        {/* Top 3 Choices - NEW */}
        <MetricCard
          icon={<Award className="w-4.5 h-4.5" />}
          value={topThreeCount}
          subLabel={`(${topThreePercent}%)`}
          label="Students Got Top 3 Choices"
          iconBgColor="bg-teal-500"
          iconColor="text-white"
          textColor="text-teal-950"
          borderColor="border-teal-200"
          bgColor="bg-teal-50"
        />

        {/* Average Rank */}
        <MetricCard
          icon={<Award className="w-4.5 h-4.5" />}
          value={stats.averageRank ? `#${stats.averageRank}` : 'N/A'}
          label="Avg Preference Rank"
          iconBgColor="bg-blue-500"
          iconColor="text-white"
          textColor="text-blue-950"
          borderColor="border-blue-200"
          bgColor="bg-blue-50"
        />

        {/* % of Optimality */}
        <MetricCard
          icon={<Trophy className="w-4.5 h-4.5" />}
          value={`${stats.optimalityPercentage}%`}
          label="% of Optimality"
          iconBgColor="bg-emerald-500"
          iconColor="text-white"
          textColor="text-emerald-950"
          borderColor="border-emerald-200"
          bgColor="bg-emerald-50"
          tooltip={{
            title: 'Target % of Optimality',
            description:
              'How close the current assignment is to the theoretical best possible outcome.',
            formula: (
              <div className="space-y-0.5 font-mono text-[9px] bg-slate-800 p-1.5 rounded text-slate-300">
                <div>Current Score / Theoretical Optimum × 100</div>
              </div>
            ),
            note: (
              <p>
                Theoretical Optimum: Same students/preferences/adjustments, but{' '}
                <strong>ignoring all locks & manual moves</strong>. Shows if your manual changes
                improve or reduce overall optimality.
              </p>
            ),
          }}
        />

        {/* Score - LAST, styled like other cards with gray */}
        <MetricCard
          icon={<HelpCircle className="w-4.5 h-4.5" />}
          value={`${stats.rawUtilityScore.toLocaleString()} pts`}
          label="Score"
          iconBgColor="bg-slate-400"
          iconColor="text-white"
          textColor="text-slate-900"
          borderColor="border-slate-200"
          bgColor="bg-slate-50"
          tooltip={{
            title: 'Optimization Metric',
            description: 'Raw score the algorithm maximizes:',
            formula: (
              <div className="space-y-0.5 font-mono text-[9px] bg-slate-800 p-1.5 rounded text-slate-300">
                <div>• 1st Choice: +100 pts</div>
                <div>• 2nd Choice: +70 pts</div>
                <div>• 3rd Choice: +45 pts</div>
                <div>• 4th Choice: +25 pts</div>
                <div>• 5th Choice: +10 pts</div>
                <div>• Adjustment Bonus: -45 to +45 pts</div>
              </div>
            ),
          }}
        />
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
