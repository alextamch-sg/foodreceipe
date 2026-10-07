import { TabType } from '../types';
import { RefreshCw, Bell, FileText, Sparkles } from 'lucide-react';

interface HeaderProps {
  activeTab: TabType;
  setActiveTab: (tab: TabType) => void;
  onGenerateClick: () => void;
  onRefreshClick: () => void;
  cartCount: number;
}

export function Header({
  activeTab,
  setActiveTab,
  onGenerateClick,
  onRefreshClick,
  cartCount,
}: HeaderProps) {
  return (
    <header className="bg-white border-b border-stone-200 sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
        {/* Brand Zone */}
        <div className="flex items-center gap-8">
          <button
            onClick={() => setActiveTab('shopping')}
            className="flex items-center gap-2.5 text-left group focus:outline-none"
          >
            <div className="w-8 h-8 rounded-lg bg-[#233F33] flex items-center justify-center text-white font-serif font-bold text-lg shadow-xs group-hover:bg-[#1a3026] transition-colors">
              H
            </div>
            <span className="font-serif font-bold text-xl text-[#1F3329] tracking-tight">
              Heirloom Table
            </span>
          </button>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center space-x-1 lg:space-x-6 text-sm">
            <button
              onClick={() => setActiveTab('menu')}
              className={`px-3 py-5 font-medium transition-all relative ${
                activeTab === 'menu'
                  ? 'text-[#233F33] font-semibold'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Weekly Menu
              {activeTab === 'menu' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#233F33]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('shopping')}
              className={`px-3 py-5 font-medium transition-all relative ${
                activeTab === 'shopping'
                  ? 'text-[#233F33] font-semibold'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Shopping List
              {cartCount > 0 && (
                <span className="ml-1.5 px-1.5 py-0.2 bg-stone-100 text-stone-700 rounded-full text-xs font-mono">
                  {cartCount}
                </span>
              )}
              {activeTab === 'shopping' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#233F33]" />
              )}
            </button>
            <button
              onClick={() => setActiveTab('preferences')}
              className={`px-3 py-5 font-medium transition-all relative ${
                activeTab === 'preferences'
                  ? 'text-[#233F33] font-semibold'
                  : 'text-stone-500 hover:text-stone-900'
              }`}
            >
              Household & Preferences
              {activeTab === 'preferences' && (
                <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#233F33]" />
              )}
            </button>
          </nav>
        </div>

        {/* Right Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          <button
            onClick={onRefreshClick}
            title="Sync inventory & recipes"
            className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
          </button>

          <button
            title="Notifications"
            className="p-2 text-stone-500 hover:text-stone-800 hover:bg-stone-100 rounded-lg relative transition-colors"
          >
            <Bell className="w-4 h-4" />
            <span className="absolute top-2 right-2 w-2 h-2 bg-amber-500 rounded-full ring-2 ring-white" />
          </button>

          {activeTab !== 'shopping' && (
            <button
              onClick={() => setActiveTab('shopping')}
              className="hidden sm:inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold text-stone-700 bg-white border border-stone-200 rounded-lg hover:bg-stone-50 shadow-2xs transition-colors"
            >
              <FileText className="w-3.5 h-3.5 text-stone-500" />
              View Shopping List
            </button>
          )}

          <button
            onClick={onGenerateClick}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#233F33] hover:bg-[#1a3026] rounded-lg shadow-2xs transition-all active:scale-[0.98]"
          >
            <Sparkles className="w-3.5 h-3.5 text-emerald-300" />
            <span className="hidden sm:inline">Generate Weekly Menu</span>
            <span className="sm:hidden">Generate</span>
          </button>

          {/* User Avatar */}
          <div className="relative ml-1">
            <img
              src="https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=160&h=160&q=80"
              alt="Sarah"
              className="w-8 h-8 rounded-full object-cover ring-2 ring-stone-200 shadow-2xs"
            />
            <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 rounded-full ring-1.5 ring-white" />
          </div>
        </div>
      </div>

      {/* Mobile nav pills */}
      <div className="flex md:hidden border-t border-stone-100 px-4 py-2 gap-2 overflow-x-auto bg-[#FBFBFA]">
        <button
          onClick={() => setActiveTab('shopping')}
          className={`px-3 py-1 text-xs rounded-md whitespace-nowrap ${
            activeTab === 'shopping'
              ? 'bg-[#233F33] text-white font-medium'
              : 'text-stone-600 bg-stone-100'
          }`}
        >
          Shopping List ({cartCount})
        </button>
        <button
          onClick={() => setActiveTab('menu')}
          className={`px-3 py-1 text-xs rounded-md whitespace-nowrap ${
            activeTab === 'menu'
              ? 'bg-[#233F33] text-white font-medium'
              : 'text-stone-600 bg-stone-100'
          }`}
        >
          Weekly Menu
        </button>
        <button
          onClick={() => setActiveTab('preferences')}
          className={`px-3 py-1 text-xs rounded-md whitespace-nowrap ${
            activeTab === 'preferences'
              ? 'bg-[#233F33] text-white font-medium'
              : 'text-stone-600 bg-stone-100'
          }`}
        >
          Household & Preferences
        </button>
      </div>
    </header>
  );
}
