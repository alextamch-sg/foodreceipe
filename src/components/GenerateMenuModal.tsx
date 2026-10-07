import React from 'react';
import { HouseholdPreferences } from '../types';
import {
  Sparkles,
  X,
  CheckCircle2,
  Clock,
  ShieldCheck,
  RotateCw,
  ChefHat,
  AlertCircle,
  Key,
} from 'lucide-react';

interface GenerateMenuModalProps {
  isOpen: boolean;
  onClose: () => void;
  preferences: HouseholdPreferences;
  onGenerate: () => Promise<void>;
  isGenerating: boolean;
  error?: string | null;
  isDemo?: boolean;
}

export function GenerateMenuModal({
  isOpen,
  onClose,
  preferences,
  onGenerate,
  isGenerating,
  error,
  isDemo,
}: GenerateMenuModalProps) {
  if (!isOpen) return null;

  const totalMultiplier = preferences.members.reduce((acc, m) => {
    let mult = 1.0;
    if (m.appetite === 'Small') mult = (m.name.includes('Leo') || m.name.includes('Child')) ? 0.5 : 0.8;
    else if (m.appetite === 'Big') mult = 1.25;
    return acc + mult;
  }, 0);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-[#233F33] text-white rounded-lg">
              <Sparkles className="w-4 h-4 text-emerald-300" />
            </div>
            <div>
              <h2 className="font-editorial text-xl font-bold text-stone-900">
                Generate Weekly Menu
              </h2>
              <p className="text-xs text-stone-500">
                Claude Messages API & Spoonacular Recipe Engine
              </p>
            </div>
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
            Operating Constraints Sent to Engine:
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
                {preferences.dietaryRestrictions.join(', ') || 'None'}
              </span>
            </div>
          </div>
        </div>

        {/* Sensory Dislikes & Exclusions */}
        {preferences.dislikedIngredients.length > 0 && (
          <div className="mt-2.5 p-2.5 bg-stone-50 border border-stone-200/70 rounded-lg text-xs text-stone-600 flex items-center gap-2">
            <ChefHat className="w-4 h-4 text-[#C2410C] shrink-0" />
            <span>
              Excluding:{' '}
              <span className="font-semibold text-stone-800">
                {preferences.dislikedIngredients.map((d) => d.name).join(', ')}
              </span>
            </span>
          </div>
        )}

        {/* Demo Mode Notice */}
        {isDemo && (
          <div className="mt-3 p-2.5 bg-amber-50 border border-amber-200 rounded-lg text-xs text-amber-800 flex items-center gap-2">
            <Key className="w-4 h-4 text-amber-600 shrink-0" />
            <span>
              <strong>Demo Mode:</strong> Server environment keys are not configured yet. Using curated catalog. Add keys in Vercel to activate live APIs.
            </span>
          </div>
        )}

        {/* Error Notice */}
        {error && (
          <div className="mt-3 p-2.5 bg-rose-50 border border-rose-200 rounded-lg text-xs text-rose-800 flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>
              <strong>Generation Notice:</strong> {error}. Current menu retained safely.
            </span>
          </div>
        )}

        {/* Suggested Rotation Summary */}
        <div className="mt-4 space-y-3">
          <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500">
            How It Works
          </h3>

          <div className="p-3 bg-stone-50 rounded-xl border border-stone-200/70 text-xs text-stone-600 space-y-1.5 leading-relaxed">
            <p>1. Retrieves verified recipes from Spoonacular filtered by selected cuisines & cooking time.</p>
            <p>2. Prompts Claude via official Anthropic SDK to arrange recipes without hallucinations or allergen conflicts.</p>
            <p>3. Recalculates exact grocery weights with household portion scaling and pantry stock deductions.</p>
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
          <button
            type="button"
            disabled={isGenerating}
            onClick={onGenerate}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#233F33] hover:bg-[#192F26] rounded-lg shadow-2xs transition-all active:scale-[0.98] disabled:opacity-70"
          >
            {isGenerating ? (
              <>
                <RotateCw className="w-3.5 h-3.5 animate-spin" />
                <span>Consulting Claude & Spoonacular...</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
                <span>Generate Weekly Menu</span>
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
