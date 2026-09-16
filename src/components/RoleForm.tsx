import React from "react";
import { Sparkles, X, Check } from "lucide-react";

const EMOJI_OPTIONS = [
  "🚶‍♂️",
  "🚪",
  "📄",
  "💻",
  "🧼",
  "🌱",
  "📚",
  "✏️",
  "⚽",
  "🍎",
  "📅",
  "⭐",
  "🎨",
  "🔔",
  "🧹",
  "🥤",
  "🎒",
  "🧩",
];

interface RoleFormProps {
  initialData?: {
    name: string;
    capacity: number;
    description: string;
    icon: string;
  };
  onSave: (data: {
    name: string;
    capacity: number;
    description: string;
    icon: string;
  }) => void;
  onCancel: () => void;
  title: string;
  submitLabel: string;
}

export const RoleForm: React.FC<RoleFormProps> = ({
  initialData = { name: "", capacity: 1, description: "", icon: "⭐" },
  onSave,
  onCancel,
  title,
  submitLabel,
}) => {
  const [name, setName] = React.useState(initialData.name);
  const [capacity, setCapacity] = React.useState(initialData.capacity);
  const [description, setDescription] = React.useState(initialData.description);
  const [icon, setIcon] = React.useState(initialData.icon);

  const handleIconChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (!val) {
      setIcon("⭐");
      return;
    }
    if (typeof Intl !== "undefined" && "Segmenter" in Intl) {
      const segmenter = new (Intl as any).Segmenter("en", {
        granularity: "grapheme",
      });
      const segments = Array.from(segmenter.segment(val));
      if (segments.length > 0) {
        setIcon((segments[segments.length - 1] as any).segment);
        return;
      }
    }
    setIcon(Array.from(val).pop() || "⭐");
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    onSave({
      name: name.trim(),
      capacity: Math.max(1, capacity),
      description: description.trim(),
      icon,
    });
  };

  return (
    <div className="bg-blue-50/70 border-2 border-blue-200 rounded-2xl p-5 shadow-md transition-all flex flex-col justify-between min-h-[280px]">
      <form onSubmit={handleSubmit} className="space-y-3 flex-1 min-w-0">
        <div className="flex items-center justify-between pb-2 border-b border-blue-200 mb-2">
          <h3 className="font-bold text-slate-800 text-sm flex items-center gap-1.5">
            <Sparkles className="w-3.5 h-3.5 text-blue-600" />
            {title}
          </h3>
          <button
            type="button"
            onClick={onCancel}
            className="text-slate-400 hover:text-slate-600 p-1"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-4 gap-2">
          <div className="col-span-2 min-w-0">
            <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
              Job Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Line Leader..."
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
              Slots
            </label>
            <input
              type="number"
              min="1"
              max="10"
              required
              value={capacity}
              onChange={(e) => setCapacity(parseInt(e.target.value) || 1)}
              className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm font-semibold text-center"
            />
          </div>

          <div>
            <label className="block text-[10px] font-semibold text-slate-700 mb-0.5 flex items-center justify-between">
              <span>Icon</span>
              <span className="text-[9px] text-blue-600 font-normal">⌘+Ctrl+Space</span>
            </label>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                maxLength={4}
                value={icon}
                onChange={handleIconChange}
                className="w-9 h-9 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-xl text-center shadow-xs"
                placeholder="⭐"
                title="Type or paste any emoji. Press ⌘+Ctrl+Space on Mac or Win+. on Windows."
              />
              <div className="flex flex-wrap gap-0.5 max-w-[120px]">
                {EMOJI_OPTIONS.slice(0, 10).map((em) => (
                  <button
                    key={em}
                    type="button"
                    onClick={() => setIcon(em)}
                    className={`text-xs p-0.5 rounded hover:bg-white transition-all ${
                      icon === em
                        ? "bg-white shadow-xs scale-110"
                        : "opacity-70 hover:opacity-100"
                    }`}
                  >
                    {em}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div>
          <label className="block text-[10px] font-semibold text-slate-700 mb-0.5">
            Description / Duties (Optional)
          </label>
          <input
            type="text"
            placeholder="What does a student do in this role?"
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-2.5 py-1.5 bg-white border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none text-sm"
          />
        </div>

        <div className="flex justify-end gap-1.5 pt-1">
          <button
            type="button"
            onClick={onCancel}
            className="px-3 py-1.5 border border-slate-300 bg-white text-slate-700 rounded-lg text-xs font-medium hover:bg-slate-50"
          >
            Cancel
          </button>
          <button
            type="submit"
            className="px-4 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs font-semibold shadow-sm flex items-center gap-1"
          >
            <Check className="w-3.5 h-3.5" />
            {submitLabel}
          </button>
        </div>
      </form>
    </div>
  );
};