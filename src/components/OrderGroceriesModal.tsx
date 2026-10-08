import React, { useState, useEffect } from 'react';
import { X, Check, Truck, Info } from 'lucide-react';

interface OrderGroceriesModalProps {
  isOpen: boolean;
  onClose: () => void;
  listSubtotal: number;
  itemCount: number;
}

// Sample vendor pricing for the demo — not live prices
const SAMPLE_VENDORS = [
  { id: 'fairprice', name: 'NTUC FairPrice', priceFactor: 1.0, deliveryFee: 3.99 },
  { id: 'shengsiong', name: 'Sheng Siong', priceFactor: 0.94, deliveryFee: 5.0 },
  { id: 'grab', name: 'Grab', priceFactor: 1.08, deliveryFee: 2.5 },
];

const MOCK_DELIVERY_SLOTS = [
  'Today, 6:00 PM – 8:00 PM',
  'Tomorrow, 10:00 AM – 12:00 PM',
  'Tomorrow, 6:00 PM – 8:00 PM',
];

export function OrderGroceriesModal({
  isOpen,
  onClose,
  listSubtotal,
  itemCount,
}: OrderGroceriesModalProps) {
  const [vendorId, setVendorId] = useState(SAMPLE_VENDORS[0].id);
  const [slot, setSlot] = useState(MOCK_DELIVERY_SLOTS[0]);
  const [isConfirmed, setIsConfirmed] = useState(false);

  useEffect(() => {
    if (isOpen) {
      setVendorId(SAMPLE_VENDORS[0].id);
      setSlot(MOCK_DELIVERY_SLOTS[0]);
      setIsConfirmed(false);
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const vendors = SAMPLE_VENDORS.map((v) => {
    const subtotal = listSubtotal * v.priceFactor;
    return { ...v, subtotal, total: subtotal + v.deliveryFee };
  });
  const selectedVendor = vendors.find((v) => v.id === vendorId) || vendors[0];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs no-print">
      <div className="bg-white rounded-2xl max-w-lg w-full p-6 shadow-xl border border-stone-200 max-h-[90vh] overflow-y-auto">
        <div className="flex items-center justify-between pb-3 border-b border-stone-100">
          <div>
            <h3 className="font-editorial text-lg font-bold text-stone-900">
              Order Groceries
            </h3>
            <p className="text-xs text-stone-500 font-semibold">
              Same shopping list • {itemCount} items to buy
            </p>
          </div>
          <button
            onClick={onClose}
            className="p-1 text-stone-400 hover:text-stone-700 rounded-lg hover:bg-stone-100 transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Demo disclaimer */}
        <div className="mt-4 p-3 bg-[#FFF4ED] border border-[#FED7C2] rounded-lg flex items-start gap-2">
          <Info className="w-4 h-4 text-[#D94F26] shrink-0 mt-0.5" />
          <div>
            <p className="text-xs font-bold text-[#C2410C]">
              Sample prices — demo only
            </p>
            <p className="text-[11px] text-stone-600 mt-0.5">
              No real order is placed and no payment occurs.
            </p>
          </div>
        </div>

        {isConfirmed ? (
          <div className="mt-4">
            <div className="p-4 bg-[#EBF2ED] border border-[#C8DACF] rounded-xl">
              <div className="flex items-center gap-2 mb-2">
                <div className="w-6 h-6 rounded-full bg-[#233F33] text-white flex items-center justify-center shrink-0">
                  <Check className="w-3.5 h-3.5 stroke-[3]" />
                </div>
                <p className="text-sm font-bold text-[#1F3329]">
                  Demo order confirmed (simulated)
                </p>
              </div>
              <div className="text-xs text-stone-700 space-y-1">
                <p>
                  Vendor: <span className="font-semibold">{selectedVendor.name}</span>
                </p>
                <p>
                  Delivery slot: <span className="font-semibold">{slot}</span>
                </p>
                <p>
                  Sample total:{' '}
                  <span className="font-semibold font-mono">
                    SGD ${selectedVendor.total.toFixed(2)}
                  </span>
                </p>
              </div>
              <p className="text-[11px] text-stone-500 mt-3">
                This is a simulation. Nothing was ordered and nothing was charged.
              </p>
            </div>

            <div className="flex items-center justify-end pt-4">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-white bg-[#233F33] hover:bg-[#192F26] rounded-lg shadow-2xs transition-colors"
              >
                Done
              </button>
            </div>
          </div>
        ) : (
          <div className="mt-4 space-y-4">
            {/* Vendor comparison */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1.5">
                Choose a vendor
              </label>
              <div className="space-y-2">
                {vendors.map((v) => {
                  const isSelected = v.id === selectedVendor.id;
                  return (
                    <button
                      key={v.id}
                      type="button"
                      onClick={() => setVendorId(v.id)}
                      className={`w-full p-3 rounded-xl border text-left transition-all ${
                        isSelected
                          ? 'bg-white border-[#233F33] ring-2 ring-[#233F33]/20'
                          : 'bg-stone-50 border-stone-200 hover:border-stone-300'
                      }`}
                    >
                      <div className="flex items-center justify-between gap-3">
                        <span className="text-sm font-bold text-stone-800">
                          {v.name}
                        </span>
                        <span className="text-sm font-bold text-stone-900 font-mono">
                          SGD ${v.total.toFixed(2)}
                        </span>
                      </div>
                      <div className="flex items-center justify-between gap-3 text-[11px] text-stone-500 font-mono mt-1">
                        <span>
                          Groceries ${v.subtotal.toFixed(2)} + Delivery ${v.deliveryFee.toFixed(2)}
                        </span>
                        <span>Total</span>
                      </div>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mock delivery slot */}
            <div>
              <label className="block text-xs font-bold text-stone-700 mb-1">
                Delivery slot (mock)
              </label>
              <select
                value={slot}
                onChange={(e) => setSlot(e.target.value)}
                className="w-full px-3 py-2 text-sm bg-stone-50 border border-stone-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-[#233F33]"
              >
                {MOCK_DELIVERY_SLOTS.map((s) => (
                  <option key={s} value={s}>
                    {s}
                  </option>
                ))}
              </select>
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
                type="button"
                onClick={() => setIsConfirmed(true)}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#233F33] hover:bg-[#192F26] rounded-lg shadow-2xs transition-colors"
              >
                <Truck className="w-3.5 h-3.5" />
                Confirm Demo Order
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
