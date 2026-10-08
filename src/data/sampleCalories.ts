import { HouseholdMember, MenuItem } from '../types';

// Sample values for the demo only — not produced by a nutrition engine.

// Estimated kcal for one standard (1.0x) portion of each seed dinner
const SAMPLE_DINNER_CALORIES: Record<string, number> = {
  'Ginger Soy Chicken Thighs & Garlic Broccoli Medley': 520,
  'Silken Tofu & Minced Pork Claypot': 480,
  'Steamed Sea Bass with Ginger Scallions & Tomato Egg Soup': 450,
  'Slow Simmer Pork Rib & Winter Melon Broth': 560,
  'Mild Golden Chicken Curry & Fragrant Jasmine Rice': 680,
  'Teriyaki Glazed Salmon Fillets with Steamed Greens': 610,
  'Homestyle Poached Ginger Chicken & Noodle Bowl': 540,
};

// Same portion rule used for the household serving multiplier
export function getMemberPortion(member: HouseholdMember): number {
  if (member.appetite === 'Small') {
    return member.name.includes('Leo') || member.name.includes('Child') ? 0.5 : 0.8;
  }
  if (member.appetite === 'Big') return 1.25;
  return 1.0;
}

// Fallback target for members saved before the calorie field existed
export function getDailyCalorieTarget(member: HouseholdMember): number {
  if (member.dailyCalorieTarget !== undefined) return member.dailyCalorieTarget;
  if (member.roleDescription.startsWith('Child') || member.name.includes('Leo')) return 1400;
  return member.appetite === 'Big' ? 2400 : 2000;
}

// Standard-portion kcal for a dinner; generated dinners get a stable sample value
export function getSampleDinnerCalories(meal: MenuItem): number {
  const known = SAMPLE_DINNER_CALORIES[meal.mealName];
  if (known) return known;
  const hash = [...meal.mealName].reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return 450 + (hash % 11) * 25;
}
