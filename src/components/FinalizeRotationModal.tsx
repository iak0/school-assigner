import React, { useState, useEffect, useRef } from 'react';
import { X, CheckCircle2, AlertCircle } from 'lucide-react';

interface FinalizeRotationModalProps {
  isOpen: boolean;
  onClose: () => void;
  onFinalize: (name: string, notes: string, clearBoard: boolean) => void;
  defaultName: string;
  hasAssignments: boolean;
}

export const FinalizeRotationModal: React.FC<FinalizeRotationModalProps> = ({
  isOpen,
  onClose,
  onFinalize,
  defaultName,
  hasAssignments,
}) => {
  const [name, setName] = useState(defaultName);
  const [notes, setNotes] = useState('');
  const [clearBoard, setClearBoard] = useState(true);
  const [nameError, setNameError] = useState(false);
  const nameInputRef = useRef<HTMLInputElement>(null);
  const modalRef = useRef<HTMLDivElement>(null);

  // Focus name input when modal opens
  useEffect(() => {
    if (isOpen) {
      setName(defaultName);
      setNotes('');
      setClearBoard(true);
      setNameError(false);
      setTimeout(() => nameInputRef.current?.focus(), 50);
    }
  }, [isOpen, defaultName]);

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

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setNameError(true);
      return;
    }
    onFinalize(name.trim(), notes.trim(), clearBoard);
    onClose();
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 animate-fade-in"
      role="dialog"
      aria-modal="true"
      aria-labelledby="modal-title"
    >
      <div
        ref={modalRef}
        className="bg-white rounded-2xl shadow-xl w-full max-w-md animate-slide-up"
      >
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-slate-200">
          <h2 id="modal-title" className="text-lg font-bold text-slate-900 flex items-center gap-2">
            <CheckCircle2 className="w-5 h-5 text-emerald-600" />
            Finalize Rotation
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

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          {/* Rotation Name */}
          <div>
            <label
              htmlFor="rotation-name"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Rotation Name
            </label>
            <input
              ref={nameInputRef}
              id="rotation-name"
              type="text"
              value={name}
              onChange={e => {
                setName(e.target.value);
                setNameError(false);
              }}
              onBlur={() => setNameError(!name.trim())}
              className={`w-full px-3 py-2 bg-white border rounded-xl text-sm transition-colors ${
                nameError
                  ? 'border-rose-400 focus:ring-rose-400'
                  : 'border-slate-200 focus:ring-blue-500'
              } focus:outline-none focus:ring-2`}
              placeholder="e.g., October 2026 Jobs"
              maxLength={50}
            />
            {nameError && (
              <p className="mt-1 text-xs text-rose-600 flex items-center gap-1">
                <AlertCircle className="w-3 h-3" /> Please enter a rotation name
              </p>
            )}
          </div>

          {/* Notes */}
          <div>
            <label
              htmlFor="rotation-notes"
              className="block text-sm font-medium text-slate-700 mb-1"
            >
              Notes (optional)
            </label>
            <textarea
              id="rotation-notes"
              value={notes}
              onChange={e => setNotes(e.target.value)}
              rows={3}
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm focus:ring-2 focus:ring-blue-500 focus:outline-none transition-colors"
              placeholder="e.g., Fall semester start, special events..."
              maxLength={200}
            />
          </div>

          {/* Clear Board Option */}
          <div className="bg-slate-50 rounded-xl p-3 border border-slate-200">
            <div className="flex items-start gap-3">
              <input
                type="radio"
                id="clear-board"
                name="board-action"
                value="clear"
                checked={clearBoard}
                onChange={() => setClearBoard(true)}
                className="mt-1 w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
              />
              <label htmlFor="clear-board" className="flex-1 cursor-pointer">
                <p className="font-medium text-slate-800">
                  Archive & clear board for next rotation
                </p>
                <p className="text-xs text-slate-500 mt-0.5">
                  All students move to Standby. Start fresh with clean assignments.
                </p>
              </label>
            </div>
            <div className="flex items-start gap-3 mt-2">
              <input
                type="radio"
                id="keep-draft"
                name="board-action"
                value="keep"
                checked={!clearBoard}
                onChange={() => setClearBoard(false)}
                className="mt-1 w-4 h-4 text-blue-600 border-slate-300 focus:ring-blue-500"
              />
              <label htmlFor="keep-draft" className="flex-1 cursor-pointer">
                <p className="font-medium text-slate-800">Archive & keep current board as draft</p>
                <p className="text-xs text-slate-500 mt-0.5">
                  Keep current assignments. Continue adjusting before next generation.
                </p>
              </label>
            </div>
          </div>

          {/* Warning if no assignments */}
          {!hasAssignments && (
            <div className="bg-amber-50 border border-amber-200 rounded-xl p-3 flex items-start gap-2">
              <AlertCircle className="w-5 h-5 text-amber-600 flex-shrink-0 mt-0.5" />
              <p className="text-xs text-amber-800">
                No current assignments to archive. The rotation will be saved with all students in
                Standby.
              </p>
            </div>
          )}

          {/* Actions */}
          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2.5 bg-blue-600 hover:bg-blue-700 text-white font-semibold rounded-xl shadow-sm transition-all"
            >
              Finalize Rotation 🔒
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
