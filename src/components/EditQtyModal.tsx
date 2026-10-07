import React, { useState, useEffect } from 'react';
import { ShoppingItem } from '../types';
import { X, Check } from 'lucide-react';

interface EditQtyModalProps {
  item: ShoppingItem | null;
  isOpen: boolean;
  onClose: () => void;
  onSave: (itemId: string, updatedQty: string, updatedPrice?: number, updatedCalc?: string) => void;
}

export function EditQtyModal({
  item,
  isOpen,
  onClose,
  onSave,
}: EditQtyModalProps) {
  const [qty, setQty] = useState('');
  const [price, setPrice] = useState('');
  const [calcNote, setCalcNote] = useState('');

  useEffect(() => {
    if (item) {
      setQty(item.quantityNote);
      setPrice(item.price !== undefined ? item.price.toString() : '');
      setCalcNote(item.calcNote || '');
    }
  }, [item]);

  if (!isOpen || !item) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSave(
      item.id,
      qty.trim() || item.quantityNote,
      price ? parseFloat(price) : item.price,
      calcNote.trim() || item.calcNote
    );
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-xl border border-stone-200">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div>
            <h3 className="font-editorial text-lg font-bold text-stone-900">
              Adjust Quantity & Price
            </h3>
            <p className="text-xs text-stone-500 font-semibold truncate max-w-[240px]">
              {item.name}
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Quantity / Measure
            </label>
            <input
              type="text"
              required
              value={qty}
              onChange={(e) => setQty(e.target.value)}
              className="w-full px-3 py-2 text-sm font-mono bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#233F33]"
              placeholder="e.g. 650g"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Estimated Price (SGD)
            </label>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-stone-400 text-xs font-mono">
                SGD
              </span>
              <input
                type="number"
                step="0.05"
                min="0"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                className="w-full pl-12 pr-3 py-2 text-sm font-mono bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#233F33]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Household Deduction Note
            </label>
            <textarea
              rows={2}
              value={calcNote}
              onChange={(e) => setCalcNote(e.target.value)}
              className="w-full px-3 py-2 text-xs bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#233F33]"
              placeholder="e.g. Needed: 850g - In Pantry: 200g = Buy 650g"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-3.5 py-1.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#233F33] hover:bg-[#192F26] rounded-lg shadow-2xs transition-colors"
            >
              <Check className="w-3.5 h-3.5" />
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
