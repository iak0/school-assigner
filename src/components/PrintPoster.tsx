import React from 'react';
import { Student, Role, Assignment } from '../types';
import { getDetailedAssignments } from '../engine/matcher';
import { Printer, Download, Copy, Check, Sparkles } from 'lucide-react';

interface PrintPosterProps {
  students: Student[];
  roles: Role[];
  assignments: Assignment[];
}

export const PrintPoster: React.FC<PrintPosterProps> = ({ students, roles, assignments }) => {
  const [copied, setCopied] = React.useState(false);
  const detailedAssignments = getDetailedAssignments(students, roles, assignments);

  const assignmentsByRole = new Map<string, typeof detailedAssignments>();
  for (const role of roles) {
    assignmentsByRole.set(role.id, []);
  }

  const unassigned: typeof detailedAssignments = [];
  for (const item of detailedAssignments) {
    if (item.roleId && assignmentsByRole.has(item.roleId)) {
      assignmentsByRole.get(item.roleId)!.push(item);
    } else {
      unassigned.push(item);
    }
  }

  const handlePrint = () => {
    window.print();
  };

  const handleExportJson = () => {
    const data = {
      exportedAt: new Date().toISOString(),
      roles,
      students,
      assignments,
    };
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `classroom-job-assignments-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleCopySummary = () => {
    let text = `🌟 Classroom Job Assignments 🌟\n\n`;
    for (const role of roles) {
      const assigned = assignmentsByRole.get(role.id) || [];
      const names = assigned.map((a) => a.studentName).join(', ') || '(Open)';
      text += `${role.icon || '⭐'} ${role.name}: ${names}\n`;
    }
    if (unassigned.length > 0) {
      text += `\n📦 Standby / Reserve:\n${unassigned.map((a) => a.studentName).join(', ')}\n`;
    }

    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      {/* Top Action Bar (hidden in print) */}
      <div className="no-print bg-white rounded-2xl p-6 border border-slate-200 shadow-sm flex flex-col md:flex-row items-start md:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-2xl">🖨️</span>
            <h2 className="text-xl font-bold text-slate-800">Printable Poster & Export</h2>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Print a classroom jobs chart for your wall or export the assignment data.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          <button
            type="button"
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3.5 py-2.5 rounded-xl transition-all text-xs border border-slate-200"
          >
            {copied ? <Check className="w-4 h-4 text-emerald-600" /> : <Copy className="w-4 h-4" />}
            {copied ? 'Copied to Clipboard!' : 'Copy Summary'}
          </button>
          <button
            type="button"
            onClick={handleExportJson}
            className="flex items-center gap-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold px-3.5 py-2.5 rounded-xl transition-all text-xs border border-slate-200"
          >
            <Download className="w-4 h-4" />
            Download JSON
          </button>
          <button
            type="button"
            onClick={handlePrint}
            className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold px-4 py-2.5 rounded-xl shadow-sm transition-all text-xs"
          >
            <Printer className="w-4 h-4" />
            Print Classroom Poster
          </button>
        </div>
      </div>

      {/* Printable Poster Area */}
      <div className="bg-white rounded-3xl p-8 border-2 border-slate-200 shadow-md print:shadow-none print:border-none print:p-2">
        {/* Poster Header */}
        <div className="text-center pb-6 border-b-2 border-slate-100 mb-8">
          <div className="inline-flex items-center gap-2 px-3 py-1 bg-amber-100 text-amber-900 rounded-full text-xs font-bold uppercase tracking-wider mb-2 print:border print:border-amber-300">
            <Sparkles className="w-3.5 h-3.5" /> Grade 4 Classroom Community
          </div>
          <h1 className="text-3xl sm:text-4xl font-extrabold text-slate-900 tracking-tight">
            Our Classroom Leaders & Helpers 🎒
          </h1>
          <p className="text-slate-500 text-sm mt-1">
            Working together to make our classroom a wonderful place to learn!
          </p>
        </div>

        {/* Roles & Assigned Helpers Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-5">
          {roles.map((role) => {
            const assignedList = assignmentsByRole.get(role.id) || [];

            return (
              <div
                key={role.id}
                className="bg-slate-50/80 rounded-2xl p-5 border border-slate-200/90 flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-center gap-3 mb-2">
                    <span className="text-3xl">{role.icon || '⭐'}</span>
                    <div>
                      <h3 className="font-extrabold text-slate-900 text-base leading-tight">
                        {role.name}
                      </h3>
                      <span className="text-[11px] text-slate-500 font-medium">
                        {role.capacity} {role.capacity === 1 ? 'Helper' : 'Helpers'}
                      </span>
                    </div>
                  </div>

                  {role.description && (
                    <p className="text-xs text-slate-500 mb-3 italic">
                      "{role.description}"
                    </p>
                  )}
                </div>

                {/* Assigned Names */}
                <div className="pt-3 border-t border-slate-200/70 space-y-1.5">
                  {assignedList.length > 0 ? (
                    assignedList.map((a) => (
                      <div
                        key={a.studentId}
                        className="bg-white px-3 py-1.5 rounded-xl border border-slate-200 text-xs font-bold text-slate-800 flex items-center justify-between shadow-2xs"
                      >
                        <span>{a.studentName}</span>
                        <span className="text-amber-500 text-xs">⭐</span>
                      </div>
                    ))
                  ) : (
                    <div className="text-xs text-slate-400 italic py-1 text-center">
                      (No helper assigned)
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>

        {/* Standby / Reserve Section */}
        {unassigned.length > 0 && (
          <div className="mt-8 pt-6 border-t-2 border-slate-100">
            <div className="bg-blue-50/60 rounded-2xl p-5 border border-blue-200">
              <h3 className="font-bold text-blue-950 text-sm mb-1 flex items-center gap-1.5">
                <span>🌟</span> Classroom Assistants on Reserve:
              </h3>
              <p className="text-xs text-blue-700/80 mb-3">
                Ready to assist with special projects, daily teamwork, and upcoming role rotations:
              </p>
              <div className="flex flex-wrap gap-2">
                {unassigned.map((a) => (
                  <span
                    key={a.studentId}
                    className="bg-white px-3 py-1 rounded-lg border border-blue-200 text-xs font-semibold text-slate-800 shadow-2xs"
                  >
                    {a.studentName}
                  </span>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
