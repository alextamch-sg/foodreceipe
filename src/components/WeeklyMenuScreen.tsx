import React, { useState } from 'react';
import { MenuItem, HouseholdPreferences } from '../types';
import { ImgWithFallback } from './ImgWithFallback';
import {
  Calendar,
  Clock,
  Sparkles,
  Users,
  CheckCircle2,
  ShoppingCart,
  ChevronRight,
  Flame,
  ChefHat,
  RefreshCw,
} from 'lucide-react';

interface WeeklyMenuScreenProps {
  menuItems: MenuItem[];
  preferences: HouseholdPreferences;
  onGenerateClick: () => void;
  onViewShoppingList: () => void;
  onSwapMeal?: (mealId: string) => void;
}

export function WeeklyMenuScreen({
  menuItems,
  preferences,
  onGenerateClick,
  onViewShoppingList,
  onSwapMeal,
}: WeeklyMenuScreenProps) {
  const [selectedDay, setSelectedDay] = useState<string>('Wednesday');

  const selectedMeal = menuItems.find((m) => m.day === selectedDay) || menuItems[0];

  const totalMultiplier = preferences.members.reduce((acc, m) => {
    let mult = 1.0;
    if (m.appetite === 'Small') mult = 0.5;
    else if (m.appetite === 'Big') mult = 1.25;
    return acc + mult;
  }, 0);

  return (
    <div className="pb-28 pt-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Top Banner Tag */}
      <div className="mb-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EEF4F0] text-[#244E3B] rounded-full text-xs font-semibold tracking-tight border border-[#D5E5DB]">
          <Calendar className="w-3.5 h-3.5 text-[#244E3B]" />
          OCT 21 – OCT 27 • 7-DAY NUTRITION & PORTION BALANCED ROTATION
        </span>
      </div>

      {/* Header Row */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-editorial text-3xl sm:text-4xl text-[#1E3027] tracking-tight">
            Weekly Family Menu Plan
          </h1>
          <p className="text-sm text-stone-500 mt-1 max-w-2xl">
            Auto-consolidated based on household portion multiplier (<span className="font-semibold text-stone-700">{totalMultiplier.toFixed(2)}x</span>), pantry stock, and zero-allergen safety.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={onViewShoppingList}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 shadow-2xs transition-colors"
          >
            <ShoppingCart className="w-3.5 h-3.5 text-stone-500" />
            Consolidated Shopping List
          </button>
          <button
            onClick={onGenerateClick}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#233F33] hover:bg-[#192F26] rounded-lg shadow-2xs transition-all active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            Generate New Rotation
          </button>
        </div>
      </div>

      {/* Week Day Selector Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5 mb-8">
        {menuItems.map((item) => {
          const isSelected = item.day === selectedDay;
          return (
            <button
              key={item.id}
              onClick={() => setSelectedDay(item.day)}
              className={`p-3 rounded-xl border text-left transition-all relative overflow-hidden ${
                isSelected
                  ? 'bg-white border-[#233F33] ring-2 ring-[#233F33]/20 shadow-xs'
                  : 'bg-white/70 border-stone-200 hover:border-stone-300 hover:bg-white'
              }`}
            >
              <div className="flex items-center justify-between text-xs font-semibold text-stone-500 mb-1">
                <span>{item.day.slice(0, 3)}</span>
                <span className="text-[10px] text-stone-400 font-mono">
                  {item.prepTimeMinutes}m
                </span>
              </div>
              <p
                className={`text-xs font-bold line-clamp-1 leading-snug ${
                  isSelected ? 'text-[#1F3329]' : 'text-stone-800'
                }`}
              >
                {item.mealName.split('&')[0]}
              </p>
              <div className="mt-2 flex items-center gap-1 text-[10px] text-stone-400">
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
                <span>{item.cuisine.split(' ')[0]}</span>
              </div>
            </button>
          );
        })}
      </div>

      {/* Selected Day Feature Card */}
      {selectedMeal && (
        <div className="bg-white border border-stone-200/80 rounded-2xl overflow-hidden shadow-2xs mb-8">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-0">
            {/* Visual Cover */}
            <div className="lg:col-span-5 relative h-64 lg:h-auto min-h-[300px]">
              <ImgWithFallback
                src={selectedMeal.image}
                alt={selectedMeal.mealName}
                className="w-full h-full object-cover"
                fallbackText={selectedMeal.mealName}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent lg:hidden" />
              <div className="absolute top-4 left-4 flex gap-2">
                <span className="px-2.5 py-1 bg-white/90 backdrop-blur-xs text-stone-900 rounded-full text-xs font-bold shadow-2xs">
                  {selectedMeal.day} Dinner
                </span>
                <span className="px-2.5 py-1 bg-[#233F33]/90 backdrop-blur-xs text-emerald-200 rounded-full text-xs font-bold shadow-2xs">
                  {selectedMeal.cuisine}
                </span>
              </div>
            </div>

            {/* Details Content */}
            <div className="lg:col-span-7 p-6 sm:p-8 flex flex-col justify-between">
              <div>
                <div className="flex items-center gap-3 text-xs text-stone-500 mb-2 font-mono">
                  <span className="flex items-center gap-1 font-semibold text-stone-700">
                    <Clock className="w-3.5 h-3.5 text-stone-500" />
                    {selectedMeal.prepTimeMinutes} mins prep
                  </span>
                  <span>•</span>
                  <span className="flex items-center gap-1 font-semibold text-stone-700">
                    <Users className="w-3.5 h-3.5 text-stone-500" />
                    Yield: {totalMultiplier.toFixed(2)}x portions
                  </span>
                  <span>•</span>
                  <span className="text-emerald-700 font-semibold">
                    Under {preferences.maxCookingTime}m target
                  </span>
                </div>

                <h2 className="font-editorial text-2xl sm:text-3xl font-bold text-[#1E3027] tracking-tight mb-2">
                  {selectedMeal.mealName}
                </h2>

                <p className="text-xs sm:text-sm font-semibold text-[#B45309] mb-3">
                  {selectedMeal.subName}
                </p>

                <p className="text-sm text-stone-600 leading-relaxed mb-6">
                  {selectedMeal.description}
                </p>

                {/* Recipe Ingredients & Pantry Breakdown */}
                <div className="mb-6">
                  <h3 className="text-xs font-bold uppercase tracking-wider text-stone-500 mb-3 flex items-center justify-between">
                    <span>Key Ingredients Consolidation</span>
                    <span className="text-[11px] font-normal normal-case text-stone-400">
                      Auto-matched with Pantry & Shopping List
                    </span>
                  </h3>

                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                    {selectedMeal.ingredients.map((ing, idx) => (
                      <div
                        key={idx}
                        className="p-2.5 bg-stone-50 border border-stone-200/70 rounded-lg flex items-center justify-between text-xs"
                      >
                        <span className="font-semibold text-stone-800">
                          {ing.name}
                        </span>
                        <div className="flex items-center gap-2">
                          <span className="font-mono text-stone-600 font-medium">
                            {ing.qty}
                          </span>
                          {ing.status === 'in-pantry' ? (
                            <span className="px-1.5 py-0.5 bg-[#E8F4EC] text-[#2D6A4F] text-[10px] font-semibold rounded">
                              Pantry
                            </span>
                          ) : (
                            <span className="px-1.5 py-0.5 bg-stone-200 text-stone-700 text-[10px] font-semibold rounded">
                              In Cart
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Action row */}
              <div className="pt-4 border-t border-stone-200 flex items-center justify-between gap-4">
                <div className="flex items-center gap-1.5 text-xs text-stone-500">
                  <ChefHat className="w-4 h-4 text-stone-400" />
                  <span>
                    Respects all household allergy & kid-mild restrictions
                  </span>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      if (onSwapMeal) onSwapMeal(selectedMeal.id);
                    }}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-stone-700 bg-stone-100 hover:bg-stone-200 rounded-lg transition-colors"
                  >
                    <RefreshCw className="w-3.5 h-3.5" />
                    Swap Recipe
                  </button>
                  <button
                    onClick={onViewShoppingList}
                    className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#233F33] hover:bg-[#192F26] rounded-lg shadow-2xs transition-colors"
                  >
                    Check Ingredients
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Weekly Schedule Overview Table */}
      <div className="bg-white border border-stone-200/80 rounded-xl overflow-hidden shadow-2xs">
        <div className="p-4 bg-[#FAFBF9] border-b border-stone-200/60 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-stone-600" />
            <h3 className="font-semibold text-sm text-[#1F3329]">
              Full 7-Day Dinner Calendar
            </h3>
          </div>
          <span className="text-xs text-stone-500">
            Total Est. Prep: ~235 mins / week
          </span>
        </div>

        <div className="divide-y divide-stone-100">
          {menuItems.map((item) => (
            <div
              key={item.id}
              onClick={() => setSelectedDay(item.day)}
              className={`p-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 cursor-pointer transition-colors ${
                selectedDay === item.day ? 'bg-[#FAFBF9]' : 'hover:bg-stone-50/60'
              }`}
            >
              <div className="flex items-center gap-4">
                <span className="w-24 text-xs font-bold text-stone-500 uppercase tracking-wider">
                  {item.day}
                </span>
                <div>
                  <h4 className="text-sm font-bold text-stone-800">
                    {item.mealName}
                  </h4>
                  <p className="text-xs text-stone-500 mt-0.5">
                    {item.cuisine} • {item.prepTimeMinutes} mins
                  </p>
                </div>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-center">
                <span className="px-2 py-0.5 bg-stone-100 text-stone-600 text-xs rounded font-mono">
                  {item.ingredients.length} items
                </span>
                <ChevronRight className="w-4 h-4 text-stone-400" />
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
