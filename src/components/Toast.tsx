import { useEffect } from 'react';
import { Check, X } from 'lucide-react';

interface ToastProps {
  message: string | null;
  onClose: () => void;
}

export function Toast({ message, onClose }: ToastProps) {
  useEffect(() => {
    if (!message) return;
    const timer = setTimeout(() => {
      onClose();
    }, 3000);
    return () => clearTimeout(timer);
  }, [message, onClose]);

  if (!message) return null;

  return (
    <div className="fixed bottom-16 sm:bottom-20 right-4 sm:right-8 z-50 animate-in fade-in slide-in-from-bottom-3 duration-200">
      <div className="bg-[#1E3027] text-white px-4 py-3 rounded-xl shadow-xl flex items-center gap-3 border border-stone-700/50">
        <div className="w-5 h-5 rounded-full bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
          <Check className="w-3.5 h-3.5 stroke-[2.5]" />
        </div>
        <span className="text-xs font-semibold tracking-tight">{message}</span>
        <button
          onClick={onClose}
          className="text-stone-400 hover:text-white p-0.5 rounded transition-colors"
        >
          <X className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
}
