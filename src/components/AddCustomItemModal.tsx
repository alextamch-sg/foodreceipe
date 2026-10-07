import React, { useState } from 'react';
import { CategoryGroup, ShoppingItem } from '../types';
import { X, Plus, DollarSign } from 'lucide-react';

interface AddCustomItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  categories: CategoryGroup[];
  onAdd: (item: ShoppingItem, categoryId: string) => void;
}

export function AddCustomItemModal({
  isOpen,
  onClose,
  categories,
  onAdd,
}: AddCustomItemModalProps) {
  const [name, setName] = useState('');
  const [category, setCategory] = useState(categories[0]?.id || 'meat-seafood');
  const [quantity, setQuantity] = useState('');
  const [price, setPrice] = useState('');
  const [notes, setNotes] = useState('');

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    const newItem: ShoppingItem = {
      id: `item-custom-${Date.now()}`,
      name: name.trim(),
      category,
      quantityNote: quantity.trim() || '1 item',
      calcNote: notes.trim() || undefined,
      price: price ? parseFloat(price) : undefined,
      isChecked: false,
    };

    onAdd(newItem, category);
    setName('');
    setQuantity('');
    setPrice('');
    setNotes('');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
      <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-xl border border-stone-200">
        <div className="flex items-center justify-between pb-4 border-b border-stone-100">
          <h2 className="font-editorial text-xl font-bold text-stone-900">
            Add Custom Grocery Item
          </h2>
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
              Ingredient / Item Name *
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Fresh Coriander / Cilantro"
              className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#233F33] focus:bg-white"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Category
              </label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#233F33]"
              >
                {categories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.title}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Quantity / Unit
              </label>
              <input
                type="text"
                value={quantity}
                onChange={(e) => setQuantity(e.target.value)}
                placeholder="e.g. 200g or 2 bunches"
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#233F33]"
              />
            </div>
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
                placeholder="0.00"
                className="w-full pl-12 pr-3 py-2 text-sm font-mono bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#233F33]"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-stone-700 mb-1">
              Recipe Math or Market Note (Optional)
            </label>
            <input
              type="text"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="e.g. For Friday curry and weekend marinade"
              className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#233F33]"
            />
          </div>

          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-stone-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-100 rounded-lg transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#233F33] hover:bg-[#192F26] rounded-lg shadow-2xs transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              Add to Grocery List
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
