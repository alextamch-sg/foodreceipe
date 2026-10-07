import React, { useState, useMemo } from 'react';
import { CategoryGroup, ShoppingItem, HouseholdPreferences } from '../types';
import { ImgWithFallback } from './ImgWithFallback';
import {
  Copy,
  Printer,
  Plus,
  Search,
  ExternalLink,
  Check,
  Sparkles,
  ShoppingBag,
  CircleDollarSign,
  PackageCheck,
  Fish,
  Salad,
  Apple,
  Egg,
  Soup,
  Box,
  Share2,
  AlertTriangle,
} from 'lucide-react';

interface ShoppingListScreenProps {
  categories: CategoryGroup[];
  preferences: HouseholdPreferences;
  onToggleItem: (itemId: string) => void;
  onEditQty: (item: ShoppingItem) => void;
  onAddItem: () => void;
  onCopyList: () => void;
  onExportWhatsApp: () => void;
  onPrintList: () => void;
  onTogglePantryMath: () => void;
}

export function ShoppingListScreen({
  categories,
  preferences,
  onToggleItem,
  onEditQty,
  onAddItem,
  onCopyList,
  onExportWhatsApp,
  onPrintList,
  onTogglePantryMath,
}: ShoppingListScreenProps) {
  const [filterMode, setFilterMode] = useState<'all' | 'unchecked' | 'checked'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Flatten items for global metrics
  const allItems = useMemo(() => {
    return categories.flatMap((cat) => cat.items);
  }, [categories]);

  const checkedItems = useMemo(() => {
    return allItems.filter((i) => i.isChecked);
  }, [allItems]);

  const uncheckedItems = useMemo(() => {
    return allItems.filter((i) => !i.isChecked);
  }, [allItems]);

  // Pricing calculations
  const totalEstimatedCost = useMemo(() => {
    return allItems
      .filter((i) => i.price && !i.pantryDeducted)
      .reduce((sum, i) => sum + (i.price || 0), 0);
  }, [allItems]);

  const totalSavedPantry = useMemo(() => {
    return allItems
      .filter((i) => i.savedPrice)
      .reduce((sum, i) => sum + (i.savedPrice || 0), 0);
  }, [allItems]);

  const pricedItemsCount = useMemo(() => {
    return allItems.filter((i) => i.price !== undefined).length;
  }, [allItems]);

  const pantryDeductedCount = useMemo(() => {
    return allItems.filter((i) => i.pantryDeducted || (i.calcNote && i.calcNote.includes('In Pantry'))).length;
  }, [allItems]);

  const targetBudget = preferences.weeklyBudget || 120.0;
  const underBudget = Math.max(0, targetBudget - totalEstimatedCost);
  const progressPercent = Math.round((checkedItems.length / (allItems.length || 1)) * 100);

  // Filtered categories
  const filteredCategories = useMemo(() => {
    return categories
      .map((cat) => {
        const items = cat.items.filter((item) => {
          // Status filter
          if (filterMode === 'checked' && !item.isChecked) return false;
          if (filterMode === 'unchecked' && item.isChecked) return false;

          // Search query
          if (searchQuery.trim()) {
            const q = searchQuery.toLowerCase();
            const matchesName = item.name.toLowerCase().includes(q);
            const matchesNote = item.calcNote?.toLowerCase().includes(q) || false;
            const matchesQty = item.quantityNote.toLowerCase().includes(q);
            if (!matchesName && !matchesNote && !matchesQty) return false;
          }
          return true;
        });

        // Compute subtotal for this category
        const subtotal = items
          .filter((i) => i.price && !i.pantryDeducted)
          .reduce((sum, i) => sum + (i.price || 0), 0);

        return {
          ...cat,
          filteredItems: items,
          subtotal,
        };
      })
      .filter((cat) => cat.filteredItems.length > 0);
  }, [categories, filterMode, searchQuery]);

  // Icon mapping
  const getCategoryIcon = (iconName: string) => {
    switch (iconName) {
      case 'meat':
        return <Fish className="w-4 h-4 text-stone-600" />;
      case 'sprout':
        return <Salad className="w-4 h-4 text-stone-600" />;
      case 'apple':
        return <Apple className="w-4 h-4 text-stone-600" />;
      case 'egg':
        return <Egg className="w-4 h-4 text-stone-600" />;
      case 'bowl':
        return <Soup className="w-4 h-4 text-stone-600" />;
      default:
        return <Box className="w-4 h-4 text-stone-600" />;
    }
  };

  return (
    <div className="pb-28 pt-6 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Top Banner Tag */}
      <div className="mb-2">
        <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#EEF4F0] text-[#244E3B] rounded-full text-xs font-semibold tracking-tight border border-[#D5E5DB]">
          <span className="w-1.5 h-1.5 rounded-full bg-[#244E3B]" />
          Smart Batch Consolidation • Real-Time Inventory
        </span>
      </div>

      {/* Header Row: Title & Actions */}
      <div className="flex flex-col lg:flex-row lg:items-end lg:justify-between gap-4 mb-8">
        <div>
          <h1 className="font-editorial text-3xl sm:text-4xl text-[#1E3027] tracking-tight">
            Consolidated Grocery Shopping List
          </h1>
          <p className="text-sm text-stone-500 mt-1">
            Calculated for <span className="font-semibold text-stone-700">Oct 21 – Oct 27 (Monday–Sunday)</span> • Household size: <span className="font-semibold text-stone-700">{preferences.adults} Adults + {preferences.children} Child</span>
          </p>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap no-print">
          <button
            onClick={onCopyList}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 shadow-2xs transition-colors"
          >
            <Copy className="w-3.5 h-3.5 text-stone-500" />
            Copy List
          </button>
          <button
            onClick={onPrintList}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 shadow-2xs transition-colors"
          >
            <Printer className="w-3.5 h-3.5 text-stone-500" />
            Print List
          </button>
          <button
            onClick={onAddItem}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#233F33] hover:bg-[#192F26] rounded-lg shadow-2xs transition-all active:scale-[0.98]"
          >
            <Plus className="w-3.5 h-3.5" />
            + Add Custom Item
          </button>
        </div>
      </div>

      {/* 3 Metric Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8">
        {/* Metric 1: Shopping Progress */}
        <div className="bg-white border border-stone-200/80 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-stone-100 rounded-md text-stone-600">
                <ShoppingBag className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-stone-600 tracking-tight">Shopping Progress</span>
            </div>
            <span className="px-2 py-0.5 bg-stone-100 text-stone-700 text-xs font-semibold rounded-md font-mono">
              {progressPercent}%
            </span>
          </div>

          <div className="mb-2">
            <span className="text-2xl font-bold text-stone-900 tracking-tight font-mono">
              {checkedItems.length} of {allItems.length}
            </span>{' '}
            <span className="text-xs text-stone-500 font-medium">items bought</span>
          </div>

          {/* Progress Bar */}
          <div className="w-full bg-stone-100 h-2 rounded-full overflow-hidden mb-3">
            <div
              className="bg-[#E46B44] h-full rounded-full transition-all duration-300"
              style={{ width: `${progressPercent}%` }}
            />
          </div>

          <p className="text-[11px] text-stone-500 font-medium">
            {uncheckedItems.length} remaining for today's market visit
          </p>
        </div>

        {/* Metric 2: Estimated Budget */}
        <div className="bg-white border border-stone-200/80 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-stone-100 rounded-md text-stone-600">
                <CircleDollarSign className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-stone-600 tracking-tight">Estimated Budget</span>
            </div>
            <span className="px-2 py-0.5 bg-stone-100 text-stone-600 text-xs font-medium rounded-md font-mono">
              Target: SGD ${targetBudget.toFixed(2)}
            </span>
          </div>

          <div className="mb-2">
            <span className="text-2xl font-bold text-stone-900 tracking-tight font-mono">
              Est. SGD ${totalEstimatedCost.toFixed(2)}
            </span>
          </div>

          <p className="text-xs text-stone-600 font-medium mb-1">
            {pricedItemsCount} of {allItems.length} items priced •{' '}
            <span className="text-[#2C6E49] font-semibold">
              Under target budget by SGD ${underBudget.toFixed(2)}
            </span>
          </p>

          <p className="text-[11px] text-stone-400">
            Based on recent FairPrice & Wet Market averages
          </p>
        </div>

        {/* Metric 3: Home Pantry Deductions */}
        <div className="bg-white border border-stone-200/80 rounded-xl p-5 shadow-2xs">
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center gap-2">
              <div className="p-1.5 bg-amber-50 rounded-md text-amber-700">
                <PackageCheck className="w-4 h-4" />
              </div>
              <span className="text-xs font-semibold text-stone-600 tracking-tight">Home Pantry Deductions</span>
            </div>
            <span className="px-2 py-0.5 bg-[#FFF2EB] text-[#D94F26] text-xs font-semibold rounded-md font-mono">
              Saved ~ SGD ${totalSavedPantry.toFixed(2)}
            </span>
          </div>

          <div className="mb-2">
            <span className="text-2xl font-bold text-stone-900 tracking-tight font-mono">
              {pantryDeductedCount} ingredients
            </span>
          </div>

          <p className="text-xs text-stone-600 font-medium mb-1">
            Automatically deducted from stock (Sauces, Spices & Rice buffer)
          </p>

          <p className="text-[11px] text-stone-400">
            Zero food waste system enabled
          </p>
        </div>
      </div>

      {/* Filter / Search Bar Row */}
      <div className="bg-white border border-stone-200/80 rounded-xl p-3 mb-6 shadow-2xs flex flex-col md:flex-row md:items-center md:justify-between gap-3">
        {/* Status segment pills */}
        <div className="flex items-center gap-1.5 bg-stone-100 p-1 rounded-lg self-start">
          <button
            onClick={() => setFilterMode('all')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              filterMode === 'all'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            All ({allItems.length})
          </button>
          <button
            onClick={() => setFilterMode('unchecked')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              filterMode === 'unchecked'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Unchecked ({uncheckedItems.length})
          </button>
          <button
            onClick={() => setFilterMode('checked')}
            className={`px-3 py-1.5 text-xs font-semibold rounded-md transition-all ${
              filterMode === 'checked'
                ? 'bg-white text-stone-900 shadow-2xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            Checked ({checkedItems.length})
          </button>
        </div>

        {/* Search & Toggle */}
        <div className="flex items-center gap-4 flex-1 md:justify-end">
          <div className="relative flex-1 max-w-sm">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search ingredients..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-stone-50 border border-stone-200 rounded-lg text-stone-800 placeholder-stone-400 focus:outline-none focus:ring-1 focus:ring-[#233F33] focus:bg-white transition-all"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer select-none text-xs font-medium text-stone-600 whitespace-nowrap">
            <button
              type="button"
              role="switch"
              aria-checked={preferences.showPantryDeductionsMath}
              onClick={onTogglePantryMath}
              className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${
                preferences.showPantryDeductionsMath ? 'bg-[#233F33]' : 'bg-stone-200'
              }`}
            >
              <span
                className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                  preferences.showPantryDeductionsMath ? 'translate-x-4' : 'translate-x-0'
                }`}
              />
            </button>
            <span className="hidden sm:inline">Show Pantry Deductions & Math</span>
            <span className="sm:hidden">Math & Pantry</span>
          </label>
        </div>
      </div>

      {/* Featured Dinners Highlight Banner */}
      <div className="bg-white border border-[#E4EAE6] rounded-xl p-5 mb-8 shadow-2xs overflow-hidden">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex-1 pr-2">
            <div className="flex items-center gap-1.5 text-[#A53F28] font-bold text-xs uppercase tracking-wider mb-1.5">
              <Sparkles className="w-3.5 h-3.5" />
              <span>THIS WEEK'S FEATURED DINNERS</span>
            </div>
            <h2 className="font-editorial text-xl sm:text-2xl text-[#1E3027] font-semibold tracking-tight">
              Fresh Garlic Broccoli Medley & Comforting Tomato Egg Soup
            </h2>
            <p className="text-xs text-stone-600 mt-2 leading-relaxed max-w-2xl">
              Ingredients below reflect combined pantry needs for Monday's crisp wok-tossed broccoli with toasted garlic chips and Wednesday's steaming heirloom tomato egg drop broth.
            </p>
          </div>

          {/* Right Thumbnails */}
          <div className="flex items-center gap-3 shrink-0">
            <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden border border-stone-200/60 shadow-2xs">
              <ImgWithFallback
                src="https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=300&q=80"
                alt="Broccoli Medley"
                className="w-full h-full object-cover"
                fallbackText="Garlic Broccoli"
              />
            </div>
            <div className="flex flex-col gap-2">
              <div className="w-20 h-13 sm:w-24 sm:h-13 rounded-lg overflow-hidden border border-stone-200/60 shadow-2xs">
                <ImgWithFallback
                  src="https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=300&q=80"
                  alt="Tomato Egg Soup"
                  className="w-full h-full object-cover"
                  fallbackText="Tomato Soup"
                />
              </div>
              <div className="w-20 h-13 sm:w-24 sm:h-13 rounded-lg overflow-hidden border border-stone-200/60 shadow-2xs">
                <ImgWithFallback
                  src="https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=300&q=80"
                  alt="Soup broth"
                  className="w-full h-full object-cover"
                  fallbackText="Soup Broth"
                />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Categorized Sections */}
      <div className="space-y-6">
        {filteredCategories.map((cat) => (
          <div
            key={cat.id}
            className="bg-white border border-stone-200/80 rounded-xl overflow-hidden shadow-2xs"
          >
            {/* Category Header */}
            <div className="bg-[#FAFBF9] px-5 py-3.5 border-b border-stone-200/60 flex items-center justify-between">
              <div className="flex items-center gap-2.5">
                <div className="p-1.5 bg-stone-100 rounded-md">
                  {getCategoryIcon(cat.iconName)}
                </div>
                <h3 className="font-semibold text-sm text-[#1F3329] tracking-tight">
                  {cat.title}
                </h3>
                <span className="text-xs text-stone-500 font-normal">
                  {cat.filteredItems.length} items
                </span>
              </div>

              <div className="text-xs font-semibold text-stone-600 font-mono">
                Subtotal: SGD ${cat.subtotal.toFixed(2)}
              </div>
            </div>

            {/* Items List */}
            <div className="divide-y divide-stone-100">
              {cat.filteredItems.map((item) => (
                <div
                  key={item.id}
                  className={`px-5 py-3.5 flex flex-col sm:flex-row sm:items-center justify-between gap-3 transition-colors ${
                    item.isChecked ? 'bg-stone-50/60' : 'hover:bg-[#FAFBF9]'
                  }`}
                >
                  {/* Left: Checkbox & Name & Deductions */}
                  <div className="flex items-start sm:items-center gap-3.5 flex-1 min-w-0">
                    <button
                      type="button"
                      onClick={() => onToggleItem(item.id)}
                      className={`w-5 h-5 mt-0.5 sm:mt-0 rounded flex items-center justify-center transition-all shrink-0 ${
                        item.isChecked
                          ? 'bg-[#2563EB] text-white shadow-2xs'
                          : 'border border-stone-300 bg-white hover:border-[#233F33]'
                      }`}
                    >
                      {item.isChecked && <Check className="w-3.5 h-3.5 stroke-[3]" />}
                    </button>

                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span
                          className={`text-sm font-semibold tracking-tight transition-all ${
                            item.isChecked
                              ? 'line-through text-stone-400'
                              : 'text-stone-800'
                          }`}
                        >
                          {item.name}
                        </span>

                        {item.quantityNote && (
                          <span className="px-2 py-0.5 bg-stone-100 text-stone-600 rounded text-[11px] font-medium font-mono">
                            {item.quantityNote}
                          </span>
                        )}

                        {item.warningNote && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-[#FFF4ED] text-[#D94F26] rounded text-[11px] font-semibold border border-[#FED7C2]">
                            <AlertTriangle className="w-3 h-3" />
                            {item.warningNote}
                          </span>
                        )}
                      </div>

                      {/* Math & Context Note */}
                      {item.calcNote && (preferences.showPantryDeductionsMath || item.isChecked) && (
                        <p
                          className={`text-xs mt-0.5 leading-snug ${
                            item.isChecked ? 'text-stone-400' : 'text-stone-500'
                          }`}
                        >
                          {item.calcNote}
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Right: Edit Button & Price Tag */}
                  <div className="flex items-center gap-3 self-end sm:self-center shrink-0">
                    {!item.isChecked && !item.pantryDeducted && (
                      <button
                        onClick={() => onEditQty(item)}
                        className="px-2.5 py-1 text-[11px] font-medium text-stone-600 bg-stone-50 hover:bg-stone-100 border border-stone-200 rounded transition-colors"
                      >
                        Edit Qty{item.quantityNote ? `: ${item.quantityNote}` : ''}
                      </button>
                    )}

                    {/* Price / Deduction status */}
                    <div className="text-right min-w-[80px]">
                      {item.savedPrice ? (
                        <span className="text-xs font-semibold text-[#2D6A4F] font-mono">
                          Saved SGD ${item.savedPrice.toFixed(2)}
                        </span>
                      ) : item.price !== undefined ? (
                        <div className="flex items-center gap-1.5 justify-end">
                          <span
                            className={`text-xs font-semibold font-mono ${
                              item.isChecked ? 'text-stone-400' : 'text-stone-900'
                            }`}
                          >
                            SGD {item.price.toFixed(2)}
                          </span>
                          {item.storeName && (
                            <span className="inline-flex items-center text-[10px] text-stone-500 hover:text-stone-700">
                              {item.storeName}
                              <ExternalLink className="w-2.5 h-2.5 ml-0.5 opacity-60" />
                            </span>
                          )}
                        </div>
                      ) : item.pantryDeducted ? (
                        <span className="text-xs font-medium text-stone-400">
                          In Pantry
                        </span>
                      ) : item.checkedNote ? (
                        <span className="text-xs font-medium text-stone-400">
                          {item.checkedNote}
                        </span>
                      ) : (
                        <span className="text-xs text-stone-400">Checked</span>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>

      {/* Sticky Bottom Summary Bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 bg-white/95 backdrop-blur-md border-t border-stone-200 shadow-lg px-4 sm:px-6 py-3 no-print">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          {/* Status on left */}
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-full bg-[#1F3329] text-white flex items-center justify-center text-xs font-bold font-mono shrink-0">
              {checkedItems.length}
            </div>
            <div>
              <p className="text-xs font-bold text-stone-900">
                {checkedItems.length} of {allItems.length} items completed
              </p>
              <p className="text-[11px] text-stone-500">
                Total Est:{' '}
                <span className="font-semibold text-stone-700 font-mono">
                  SGD ${totalEstimatedCost.toFixed(2)}
                </span>{' '}
                • ({allItems.length - pricedItemsCount} items pending price)
              </p>
            </div>
          </div>

          {/* Action buttons on right */}
          <div className="flex items-center gap-2 self-end sm:self-center">
            <button
              onClick={onPrintList}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 shadow-2xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5 text-stone-500" />
              Print List
            </button>
            <button
              onClick={onExportWhatsApp}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#233F33] hover:bg-[#192F26] rounded-lg shadow-2xs transition-all active:scale-[0.98]"
            >
              <Share2 className="w-3.5 h-3.5" />
              Export to WhatsApp / Copy
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
