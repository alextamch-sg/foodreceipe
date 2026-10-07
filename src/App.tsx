/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { TabType, ShoppingItem, CategoryGroup, HouseholdPreferences, MenuItem } from './types';
import {
  initialCategories,
  initialPreferences,
  initialWeeklyMenu,
} from './data/initialData';
import { Header } from './components/Header';
import { ShoppingListScreen } from './components/ShoppingListScreen';
import { PreferencesScreen } from './components/PreferencesScreen';
import { WeeklyMenuScreen } from './components/WeeklyMenuScreen';
import { AddCustomItemModal } from './components/AddCustomItemModal';
import { EditQtyModal } from './components/EditQtyModal';
import { GenerateMenuModal } from './components/GenerateMenuModal';
import { Toast } from './components/Toast';

export default function App() {
  const [activeTab, setActiveTab] = useState<TabType>('shopping');

  // Persistence in localStorage
  const [categories, setCategories] = useState<CategoryGroup[]>(() => {
    const saved = localStorage.getItem('heirloom_categories');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return initialCategories;
  });

  const [preferences, setPreferences] = useState<HouseholdPreferences>(() => {
    const saved = localStorage.getItem('heirloom_preferences');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return initialPreferences;
  });

  const [weeklyMenu, setWeeklyMenu] = useState<MenuItem[]>(() => {
    const saved = localStorage.getItem('heirloom_menu');
    if (saved) {
      try {
        return JSON.parse(saved);
      } catch (e) {
        console.error(e);
      }
    }
    return initialWeeklyMenu;
  });

  // Modal states
  const [isAddCustomOpen, setIsAddCustomOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<ShoppingItem | null>(null);
  const [isGenerateOpen, setIsGenerateOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Sync to local storage
  useEffect(() => {
    localStorage.setItem('heirloom_categories', JSON.stringify(categories));
  }, [categories]);

  useEffect(() => {
    localStorage.setItem('heirloom_preferences', JSON.stringify(preferences));
  }, [preferences]);

  useEffect(() => {
    localStorage.setItem('heirloom_menu', JSON.stringify(weeklyMenu));
  }, [weeklyMenu]);

  // Shopping list item toggling
  const handleToggleItem = (itemId: string) => {
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        items: cat.items.map((item) =>
          item.id === itemId
            ? { ...item, isChecked: !item.isChecked }
            : item
        ),
      }))
    );
  };

  // Edit quantity & price
  const handleSaveEditQty = (
    itemId: string,
    updatedQty: string,
    updatedPrice?: number,
    updatedCalc?: string
  ) => {
    setCategories((prev) =>
      prev.map((cat) => ({
        ...cat,
        items: cat.items.map((item) =>
          item.id === itemId
            ? {
                ...item,
                quantityNote: updatedQty,
                price: updatedPrice,
                calcNote: updatedCalc,
              }
            : item
        ),
      }))
    );
    setToastMessage('Item quantity and pricing updated!');
  };

  // Add custom grocery item
  const handleAddCustomItem = (newItem: ShoppingItem, categoryId: string) => {
    setCategories((prev) =>
      prev.map((cat) =>
        cat.id === categoryId
          ? { ...cat, items: [newItem, ...cat.items] }
          : cat
      )
    );
    setToastMessage(`Added "${newItem.name}" to shopping list!`);
  };

  // Copy plain text list
  const handleCopyList = () => {
    const lines: string[] = [
      '🛒 HEIRLOOM TABLE • CONSOLIDATED GROCERY LIST',
      `Calculated for Oct 21 – Oct 27 (2 Adults + 1 Child)\n`,
    ];

    categories.forEach((cat) => {
      const activeItems = cat.items.filter((i) => !i.isChecked);
      if (activeItems.length > 0) {
        lines.push(`\n📁 ${cat.title}:`);
        activeItems.forEach((i) => {
          const priceStr = i.price ? ` [SGD $${i.price.toFixed(2)}]` : '';
          lines.push(`  • ${i.name} (${i.quantityNote})${priceStr}`);
          if (i.calcNote) lines.push(`    ↳ ${i.calcNote}`);
        });
      }
    });

    const text = lines.join('\n');
    navigator.clipboard.writeText(text);
    setToastMessage('Shopping list copied to clipboard!');
  };

  // Export to WhatsApp format
  const handleExportWhatsApp = () => {
    const lines: string[] = [
      '*🥬 HEIRLOOM TABLE • GROCERY RUN*',
      '_Oct 21 – Oct 27 (Household Yield 2.75x)_\n',
    ];

    categories.forEach((cat) => {
      const toBuy = cat.items.filter((i) => !i.isChecked && !i.pantryDeducted);
      if (toBuy.length > 0) {
        lines.push(`*${cat.title.toUpperCase()}*`);
        toBuy.forEach((i) => {
          const price = i.price ? ` ~ SGD $${i.price.toFixed(2)}` : '';
          lines.push(`▫️ ${i.name} - *${i.quantityNote}*${price}`);
        });
        lines.push('');
      }
    });

    const text = lines.join('\n');
    navigator.clipboard.writeText(text);

    // Also offer WhatsApp link
    const encoded = encodeURIComponent(text);
    const whatsappUrl = `https://wa.me/?text=${encoded}`;
    // We copy directly and notify the user
    setToastMessage('Exported to WhatsApp! Text copied to clipboard.');
    window.open?.(whatsappUrl, '_blank');
  };

  // Print list
  const handlePrintList = () => {
    window.print();
  };

  // Toggle pantry math
  const handleTogglePantryMath = () => {
    setPreferences((prev) => ({
      ...prev,
      showPantryDeductionsMath: !prev.showPantryDeductionsMath,
    }));
  };

  // Reset to original defaults
  const handleResetDefaults = () => {
    if (window.confirm('Reset all groceries and preferences to defaults?')) {
      setCategories(initialCategories);
      setPreferences(initialPreferences);
      setWeeklyMenu(initialWeeklyMenu);
      setToastMessage('Restored kitchen blueprint defaults!');
    }
  };

  const handleSavePreferences = () => {
    setToastMessage('Preferences successfully saved!');
  };

  // Swapping a meal in weekly menu
  const handleSwapMeal = (mealId: string) => {
    setWeeklyMenu((prev) =>
      prev.map((item) =>
        item.id === mealId
          ? {
              ...item,
              mealName: item.mealName.includes('Curry')
                ? 'Cantonese Steamed Chicken with Dried Lily & Fungus'
                : 'Braised Minced Pork & Scallion Ginger Noodles',
              subName: 'Calibrated Seasonal Homestyle Comfort',
            }
          : item
      )
    );
    setToastMessage('Meal rotation swapped and calibrated!');
  };

  const handleApplyMenuRotation = () => {
    setToastMessage('New weekly rotation applied to shopping list!');
  };

  // Count of unchecked shopping items
  const activeCartCount = categories.flatMap((c) => c.items).filter((i) => !i.isChecked).length;

  return (
    <div className="min-h-screen bg-[#F8F9F5] flex flex-col font-sans selection:bg-[#233F33] selection:text-white">
      {/* Top Navigation */}
      <Header
        activeTab={activeTab}
        setActiveTab={setActiveTab}
        onGenerateClick={() => setIsGenerateOpen(true)}
        onRefreshClick={() => {
          setToastMessage('Pantry inventory & recipe math synchronized!');
        }}
        cartCount={activeCartCount}
      />

      {/* Screen View Switcher */}
      <main className="flex-1">
        {activeTab === 'shopping' && (
          <ShoppingListScreen
            categories={categories}
            preferences={preferences}
            onToggleItem={handleToggleItem}
            onEditQty={(item) => setEditingItem(item)}
            onAddItem={() => setIsAddCustomOpen(true)}
            onCopyList={handleCopyList}
            onExportWhatsApp={handleExportWhatsApp}
            onPrintList={handlePrintList}
            onTogglePantryMath={handleTogglePantryMath}
          />
        )}

        {activeTab === 'preferences' && (
          <PreferencesScreen
            preferences={preferences}
            onUpdatePreferences={(updated) => setPreferences(updated)}
            onSavePreferences={handleSavePreferences}
            onResetDefaults={handleResetDefaults}
          />
        )}

        {activeTab === 'menu' && (
          <WeeklyMenuScreen
            menuItems={weeklyMenu}
            preferences={preferences}
            onGenerateClick={() => setIsGenerateOpen(true)}
            onViewShoppingList={() => setActiveTab('shopping')}
            onSwapMeal={handleSwapMeal}
          />
        )}
      </main>

      {/* Modals & Toasts */}
      <AddCustomItemModal
        isOpen={isAddCustomOpen}
        onClose={() => setIsAddCustomOpen(false)}
        categories={categories}
        onAdd={handleAddCustomItem}
      />

      <EditQtyModal
        isOpen={Boolean(editingItem)}
        item={editingItem}
        onClose={() => setEditingItem(null)}
        onSave={handleSaveEditQty}
      />

      <GenerateMenuModal
        isOpen={isGenerateOpen}
        onClose={() => setIsGenerateOpen(false)}
        preferences={preferences}
        onApplyRotation={handleApplyMenuRotation}
      />

      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />
    </div>
  );
}
