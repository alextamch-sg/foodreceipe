export type TabType = 'menu' | 'shopping' | 'preferences';

export interface ShoppingItem {
  id: string;
  name: string;
  category: string;
  quantityNote: string;
  calcNote?: string;
  inPantryNote?: string;
  pantryDeducted?: boolean;
  price?: number;
  savedPrice?: number;
  isChecked: boolean;
  storeName?: string;
  subCategory?: string;
  warningNote?: string;
  checkedNote?: string;
}

export interface CategoryGroup {
  id: string;
  title: string;
  iconName: string;
  items: ShoppingItem[];
}

export interface HouseholdMember {
  id: string;
  initial: string;
  name: string;
  badge?: string;
  badgeColor?: 'orange' | 'green' | 'default';
  roleDescription: string;
  appetite: 'Small' | 'Normal' | 'Big';
  multiplier: number;
}

export interface RecurringItem {
  id: string;
  name: string;
  frequency: string;
  icon: string;
}

export interface TrackedPantryItem {
  id: string;
  name: string;
  location: string;
  quantity: string;
  reorderSoon?: boolean;
}

export interface HouseholdPreferences {
  adults: number;
  children: number;
  members: HouseholdMember[];
  preferredFruits: string[];
  recurringItems: RecurringItem[];
  primaryCuisines: { name: string; isDefault?: boolean; active: boolean }[];
  dietaryRestrictions: string[];
  dislikedIngredients: { name: string; byWhom: string }[];
  maxCookingTime: number;
  weeklyBudget: number;
  showBudgetTracking: boolean;
  showPantryDeductionsMath: boolean;
  evergreenStaples: { name: string; inStock: boolean }[];
  trackedInventory: TrackedPantryItem[];
}

export interface MenuItem {
  id: string;
  day: string;
  mealName: string;
  subName: string;
  description: string;
  prepTimeMinutes: number;
  cuisine: string;
  image: string;
  tags: string[];
  servings: number;
  ingredients: { name: string; qty: string; status: 'in-pantry' | 'buy' }[];
}
