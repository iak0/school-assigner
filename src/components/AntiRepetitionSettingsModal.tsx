import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, AlertCircle, Info } from 'lucide-react';

interface AntiRepetitionConfig {
  recencyWindow: number;
  avoidanceStrictness: 'strict' | 'balanced';
  standbyPriority: boolean;
}

interface AntiRepetitionSettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  config: AntiRepetitionConfig;
  onUpdateConfig: (config: AntiRepetitionConfig) => void;
  rotationHistoryLength: number;
}

export const AntiRepetitionSettingsModal: React.FC<AntiRepetitionSettingsModalProps> = ({
  isOpen,
  onClose,
  config,
  onUpdateConfig,
  rotationHistoryLength,
}) => {
  const [localConfig, setLocalConfig] = useState(config);
  const modalRef = useRef<HTMLDivElement>(null);

  // Sync with props when they change
  useEffect(() => {
    setLocalConfig(config);
  }, [config]);

  // Close on Escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('keydown', handleKeyDown);
    }
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (modalRef.current && !modalRef.current.contains(e.target as Node)) {
        onClose();
      }
    };
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
    }
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const handleSave = () => {
    onUpdateConfig(localConfig);
    onClose();
  };

  const recencyOptions = [
    {
      value: 1,
      label: '1 rotation (last cycle only)',
      description: 'Only avoid immediate repeats',
    },
    { value: 2, label: '2 rotations (recommended)', description: 'Avoid jobs from last 2 cycles' },
    { value: 3, label: '3 rotations', description: 'Avoid jobs from last 3 cycles' },
    { value: 99, label: 'All history', description: 'Never repeat any past job' },
  ];

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="settings-modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2
            id="settings-modal-title"
            className="text-lg font-bold text-slate-900 flex items-center gap-2"
          >
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Anti-Repetition Settings
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-4 space-y-6 max-h-[70vh] overflow-y-auto">
          {/* Recency Window */}
          <div>
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
              Recency Window
              <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Avoid assigning students to jobs they held within the past X rotations.
              {rotationHistoryLength > 0 &&
                ` Currently ${rotationHistoryLength} rotation${rotationHistoryLength !== 1 ? 's' : ''} in history.`}
            </p>
            <div className="space-y-2">
              {recencyOptions.map(option => (
                <label
                  key={option.value}
                  className={`flex items-center gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    localConfig.recencyWindow === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="recency-window"
                    value={option.value}
                    checked={localConfig.recencyWindow === option.value}
                    onChange={() => setLocalConfig({ ...localConfig, recencyWindow: option.value })}
                    className="w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <div>
                    <p className="font-medium text-slate-900">{option.label}</p>
                    <p className="text-xs text-slate-500">{option.description}</p>
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Avoidance Strictness */}
          <div className="border-t border-slate-100 pt-6">
            <label className="block text-sm font-medium text-slate-700 mb-2 flex items-center gap-1.5">
              Avoidance Strictness
              <Info className="w-3.5 h-3.5 text-slate-400 cursor-help" />
            </label>
            <p className="text-xs text-slate-500 mb-3">
              Choose whether to completely forbid repeats or just heavily penalize them.
            </p>
            <div className="space-y-2">
              {[
                {
                  value: 'strict' as const,
                  label: 'Strict',
                  description:
                    'Never assign a student to a job they held within the recency window (hard ban)',
                  warning: 'May leave slots unfilled if no other options',
                },
                {
                  value: 'balanced' as const,
                  label: 'Balanced (Recommended)',
                  description:
                    'Strong penalty but allows repeats if no other preferred roles available',
                  warning: null,
                },
              ].map(option => (
                <label
                  key={option.value}
                  className={`flex items-start gap-3 p-3 rounded-xl border-2 cursor-pointer transition-all ${
                    localConfig.avoidanceStrictness === option.value
                      ? 'border-blue-500 bg-blue-50'
                      : 'border-slate-200 hover:border-slate-300 hover:bg-slate-50'
                  }`}
                >
                  <input
                    type="radio"
                    name="avoidance-strictness"
                    value={option.value}
                    checked={localConfig.avoidanceStrictness === option.value}
                    onChange={() =>
                      setLocalConfig({ ...localConfig, avoidanceStrictness: option.value })
                    }
                    className="mt-1 w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
                  />
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <p className="font-medium text-slate-900">{option.label}</p>
                      {option.value === 'balanced' && (
                        <span className="text-xs bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded-full">
                          Recommended
                        </span>
                      )}
                    </div>
                    <p className="text-xs text-slate-500 mt-0.5">{option.description}</p>
                    {option.warning && (
                      <p className="text-xs text-amber-700 mt-1 flex items-center gap-1">
                        <AlertCircle className="w-3 h-3" /> {option.warning}
                      </p>
                    )}
                  </div>
                </label>
              ))}
            </div>
          </div>

          {/* Standby Priority */}
          <div className="border-t border-slate-100 pt-6">
            <label className="flex items-start gap-3 cursor-pointer">
              <input
                type="checkbox"
                checked={localConfig.standbyPriority}
                onChange={e =>
                  setLocalConfig({ ...localConfig, standbyPriority: e.target.checked })
                }
                className="mt-1 w-4 h-4 text-blue-600 border-slate-300 rounded focus:ring-blue-500"
              />
              <div>
                <p className="font-medium text-slate-900">Standby Priority</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Students who were in the Standby/Reserve pool last rotation get a fairness boost
                  (+35 utility points) on all their choices for the next rotation, guaranteeing
                  they're prioritized for a job.
                </p>
                <p className="text-xs text-emerald-700 mt-1 flex items-center gap-1">
                  <CheckCircle2 className="w-3 h-3" /> Recommended: Keep enabled for fairness
                </p>
              </div>
            </label>
          </div>

          {/* Info about current history */}
          {rotationHistoryLength > 0 && (
            <div className="bg-blue-50 border border-blue-200 rounded-xl p-3">
              <p className="text-xs text-blue-800 flex items-center gap-1.5">
                <Info className="w-3.5 h-3.5 flex-shrink-0" />
                <span>
                  <strong>
                    {rotationHistoryLength} rotation{rotationHistoryLength !== 1 ? 's' : ''}
                  </strong>{' '}
                  in history. Settings apply to future generations.
                </span>
              </p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex gap-2 p-4 border-t border-slate-200 bg-slate-50 rounded-b-2xl">
          <button
            type="button"
            onClick={onClose}
            className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition-all"
          >
            Save Settings
          </button>
        </div>
      </div>
    </div>
  );
};
