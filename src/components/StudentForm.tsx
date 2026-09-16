import React from "react";
import { Role } from "../types";
import { Sparkles, X, Check } from "lucide-react";

const PREFERENCE_RANKS = [
  { index: 0, label: "1st Choice", emoji: "🥇", color: "amber" },
  { index: 1, label: "2nd Choice", emoji: "🥈", color: "blue" },
  { index: 2, label: "3rd Choice", emoji: "✨", color: "purple" },
  { index: 3, label: "4th Choice", emoji: "🔹", color: "teal" },
  { index: 4, label: "5th Choice", emoji: "🔸", color: "slate" },
] as const;

const FOCUS_COLORS: Record<string, string> = {
  amber: "focus:ring-amber-500",
  blue: "focus:ring-blue-500",
  purple: "focus:ring-purple-500",
  teal: "focus:ring-teal-500",
  slate: "focus:ring-slate-500",
};

interface PreferenceSelectProps {
  value: string;
  onChange: (value: string) => void;
  roles: Role[];
  rank: typeof PREFERENCE_RANKS[number];
}

const PreferenceSelect: React.FC<PreferenceSelectProps> = ({
  value,
  onChange,
  roles,
  rank,
}) => {
  const focusColor = FOCUS_COLORS[rank.color];

  return (
    <div className={`bg-white p-2 rounded-xl border-2 border-${rank.color}-200`}>
      <span className="text-[11px] font-bold text-${rank.color}-800 flex items-center gap-1 mb-1">
        <span>{rank.emoji}</span> {rank.label}
      </span>
      <select
        value={value}
        onChange={(e) => onChange(e.target.value)}
        className={`w-full bg-slate-50 border border-slate-200 rounded-lg p-1.5 text-xs ${focusColor}`}
      >
        <option value="">-- None --</option>
        {roles.map((r) => (
          <option key={r.id} value={r.id}>
            {r.icon} {r.name}
          </option>
        ))}
      </select>
    </div>
  );
};

interface StudentFormProps {
  roles: Role[];
  initialData?: {
    name: string;
    applicationScore: number;
    preferences: string[];
    notes: string;
  };
  onSave: (data: {
    name: string;
    applicationScore: number;
    preferences: string[];
    notes: string;
  }) => void;
  onCancel: () => void;
  title: string;
  submitLabel: string;
  isEditing?: boolean;
}

export const StudentForm: React.FC<StudentFormProps> = ({
  roles,
  initialData = { name: "", applicationScore: 0, preferences: [], notes: "" },
  onSave,
  onCancel,
  title,
  submitLabel,
  isEditing = false,
}) => {
  const [name, setName] = React.useState(initialData.name);
  const [applicationScore, setApplicationScore] = React.useState(initialData.applicationScore);
  const [preferences, setPreferences] = React.useState<string[]>(initialData.preferences);
  const [notes, setNotes] = React.useState(initialData.notes);

  const handlePreferenceChange = (index: number, value: string) => {
    const newPrefs = [...preferences];
    newPrefs[index] = value;

    // Filter out duplicates and empty values
    const filtered = newPrefs.filter((p, idx, self) => p && self.indexOf(p) === idx);
    setPreferences(filtered);
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    // Ensure exactly 5 preferences (pad with empty strings)
    const finalPreferences = [...preferences];
    while (finalPreferences.length < 5) {
      finalPreferences.push("");
    }

    onSave({
      name: name.trim(),
      applicationScore,
      preferences: finalPreferences,
      notes: notes.trim(),
    });
  };

  const scoreOptions = [-3, -2, -1, 0, 1, 2, 3];

  return (
    <div className="bg-white rounded-xl border border-blue-200 p-4 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-blue-200 mb-4">
        <h3 className="font-bold text-slate-800 text-base flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-blue-600" />
          {title}
        </h3>
        <button
          onClick={onCancel}
          className="text-slate-400 hover:text-slate-600"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">Student Full Name</label>
            <input
              type="text"
              required
              placeholder="e.g. Maya Lin"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Teacher Adjustment (-3 to +3)
            </label>
            <div className="flex items-center gap-1 bg-white p-1 rounded-xl border border-slate-300">
              {scoreOptions.map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setApplicationScore(val)}
                  className={`flex-1 py-1.5 rounded-lg text-xs font-bold transition-all ${
                    applicationScore === val
                      ? val > 0
                        ? "bg-emerald-600 text-white shadow-sm"
                        : val < 0
                        ? "bg-rose-600 text-white shadow-sm"
                        : "bg-slate-700 text-white shadow-sm"
                      : "text-slate-600 hover:bg-slate-100"
                  }`}
                >
                  {val > 0 ? `+${val}` : val}
                </button>
              ))}
            </div>
            <div className="text-[11px] text-slate-500 mt-1 flex justify-between">
              <span>-3 (Missing)</span>
              <span>0 (Neutral)</span>
              <span>+3 {isEditing ? "(Outstanding)" : "(Decisive)"}</span>
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-3">
          {PREFERENCE_RANKS.map((rank) => (
            <PreferenceSelect
              key={rank.index}
              value={preferences[rank.index] || ""}
              onChange={(value) => handlePreferenceChange(rank.index, value)}
              roles={roles}
              rank={rank}
            />
          ))}
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">Teacher Notes (Optional)</label>
          <input
            type="text"
            placeholder="e.g. Needs to pair with a quiet partner, loves books..."
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
            className="w-full px-3 py-2 bg-white border border-slate-300 rounded-xl focus:ring-2 focus:ring-blue-500 focus:outline-none text-xs"
          />
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <button
            type="button"
            onClick={onCancel}
            className="px-4 py-2 border border-slate-300 bg-white text-slate-700 rounded-xl text-xs font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-xl text-xs font-semibold shadow-sm flex items-center gap-1.5"
          >
            <Check className="w-4 h-4" />
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
};