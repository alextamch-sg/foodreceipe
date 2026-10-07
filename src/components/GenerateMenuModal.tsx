import React, { useState } from 'react';
import { HouseholdPreferences } from '../types';
import {
  Sparkles,
  X,
  CheckCircle2,
  Clock,
  DollarSign,
  ShieldCheck,
  RotateCw,
  ChefHat,
} from 'lucide-react';

interface GenerateMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: HouseholdPreferences;
  onApplyRotation: () => void;
}

export function GenerateMenuModal({
  isOpen,
  onClose,
  preferences,
  onApplyRotation,
}: GenerateMenuModalProps) {
  const [isGenerating, setIsGenerating] = useState(false);
  const [generated, setGenerated] = useState(false);

  if (!isOpen) return null;

  const totalMultiplier = preferences.members.reduce((acc, m) => {
    let mult = 1.0;
    if (m.appetite === 'Small') mult = 0.5;
    else if (m.appetite === 'Big') mult = 1.25;
    return acc + mult;
  }, 0);

  const handleGenerate = () => {
    setIsGenerating(true);
    setTimeout(() => {
      setIsGenerating(false);
      setGenerated(true);
    }, 900);
  };

  const handleApply = () => {
    onApplyRotation();
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#233F33] text-white rounded-lg">
              <Sparkles className="w-4 h-4 text-emerald-300" />
            </div>
            <h2 className="font-editorial text-xl font-bold text-stone-900">
              Generate Weekly Menu
            </h2>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Operating Blueprint Constraints */}
        <div className="mt-4 p-3.5 bg-[#FAFBF9] border border-[#E0E7E2] rounded-xl text-xs space-y-2">
          <div className="font-bold text-[#1E3027] flex items-center gap-1.5">
            <ShieldCheck className="w-4 h-4 text-[#2D6A4F]" />
            Operating Constraints Active:
          </div>
          <div className="grid grid-cols-2 gap-2 text-stone-600">
            <div>
              • Portion yield:{' '}
              <span className="font-semibold text-stone-800">
                {totalMultiplier.toFixed(2)}x standard
              </span>
            </div>
            <div>
              • Max cooking time:{' '}
              <span className="font-semibold text-stone-800">
                {preferences.maxCookingTime} mins
              </span>
            </div>
            <div>
              • Budget target:{' '}
              <span className="font-semibold text-stone-800">
                SGD ${preferences.weeklyBudget.toFixed(2)}
              </span>
            </div>
            <div>
              • Zero allergen:{' '}
              <span className="font-semibold text-stone-800">
                {preferences.dietaryRestrictions.join(', ')}
              </span>
            </div>
          </div>
        </div>

        {/* Suggested Rotation Summary */}
        <div className="mt-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
            Calibrated 7-Day Lineup
          </h3>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70 space-y-1.5 text-xs">
            <div className="flex justify-between items-center font-medium text-stone-700">
              <span className="font-bold text-stone-900">Mon:</span> Ginger Soy Chicken & Wok Broccoli (25m)
            </div>
            <div className="flex justify-between items-center font-medium text-stone-700">
              <span className="font-bold text-stone-900">Tue:</span> Silken Tofu & Minced Pork Claypot (30m)
            </div>
            <div className="flex justify-between items-center font-medium text-stone-700">
              <span className="font-bold text-stone-900">Wed:</span> Steamed Sea Bass & Tomato Egg Soup (35m)
            </div>
            <div className="flex justify-between items-center font-medium text-stone-700">
              <span className="font-bold text-stone-900">Thu:</span> Slow Simmer Pork Rib & Winter Melon (45m)
            </div>
            <div className="flex justify-between items-center font-medium text-stone-700">
              <span className="font-bold text-stone-900">Fri:</span> Mild Golden Chicken Curry & Jasmine Rice (35m)
            </div>
            <div className="flex justify-between items-center font-medium text-stone-700">
              <span className="font-bold text-stone-900">Sat:</span> Teriyaki Glazed Salmon & Steamed Greens (25m)
            </div>
            <div className="flex justify-between items-center font-medium text-stone-700">
              <span className="font-bold text-stone-900">Sun:</span> Poached Ginger Chicken & Noodle Bowl (40m)
            </div>
          </div>

          <div className="p-2.5 bg-[#FFF2EB] border border-[#FED7C2] rounded-lg text-xs text-[#C2410C] flex items-center gap-2">
            <ChefHat className="w-4 h-4 shrink-0" />
            <span>
              All recipes avoid bittergourd & David's cilantro restriction, using ginger-scallion aromatics.
            </span>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-5 mt-4 border-t border-stone-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
          >
            Cancel
          </button>
          {isGenerating ? (
            <button
              disabled
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#233F33]/80 rounded-lg"
            >
              <RotateCw className="w-3.5 h-3.5 animate-spin" />
              Generating & Consolidating...
            </button>
          ) : (
            <button
              type="button"
              onClick={handleApply}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#233F33] hover:bg-[#192F26] rounded-lg shadow-2xs transition-all active:scale-[0.98]"
            >
              <CheckCircle2 className="w-3.5 h-3.5" />
              Apply to Shopping List & Calendar
            </button>
          )}
        </div>
      </div>
    </div>
  );
}
