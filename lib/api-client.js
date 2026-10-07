/**
 * Shared server-side helper for Spoonacular API and fallback data
 */

const SPOONACULAR_BASE_URL = 'https://api.spoonacular.com';

/**
 * Fetch with timeout helper
 */
export async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
    });
    clearTimeout(id);
    return response;
  } catch (error) {
    clearTimeout(id);
    if (error.name === 'AbortError') {
      throw new Error(`Request timed out after ${timeoutMs}ms`);
    }
    throw error;
  }
}

/**
 * Sanitize error message to prevent leaking sensitive details
 */
export function sanitizeErrorMessage(error) {
  if (!error) return null;
  const msg = typeof error === 'string' ? error : error.message || 'Unknown error';
  // Remove any potential keys or sensitive headers
  return msg.replace(/[a-zA-Z0-9_-]{24,}/g, '[REDACTED]');
}

/**
 * Search Spoonacular recipes
 */
export async function searchSpoonacularRecipes({
  query = '',
  cuisine = '',
  number = 10,
  apiKey = process.env.SPOONACULAR_API_KEY,
  timeoutMs = 8000,
}) {
  if (!apiKey) {
    return {
      isDemo: true,
      message: 'SPOONACULAR_API_KEY not configured. Using curated culinary database.',
      results: getCuratedRecipes(query, cuisine, number),
    };
  }

  const params = new URLSearchParams({
    apiKey,
    number: String(Math.min(number, 20)),
    addRecipeInformation: 'true',
    fillIngredients: 'true',
  });

  if (query) params.append('query', query);
  if (cuisine) params.append('cuisine', cuisine);

  const url = `${SPOONACULAR_BASE_URL}/recipes/complexSearch?${params.toString()}`;
  const response = await fetchWithTimeout(url, {}, timeoutMs);

  if (!response.ok) {
    if (response.status === 401 || response.status === 403) {
      throw new Error('Spoonacular API key is invalid or unauthorized');
    }
    if (response.status === 402) {
      throw new Error('Spoonacular daily API request quota exceeded');
    }
    if (response.status === 429) {
      throw new Error('Spoonacular rate limit exceeded. Please try again shortly');
    }
    throw new Error(`Spoonacular API returned HTTP status ${response.status}`);
  }

  const data = await response.json();
  const results = (data.results || []).map((r) => normalizeSpoonacularRecipe(r));

  return {
    isDemo: false,
    results,
  };
}

/**
 * Retrieve recipe details by ID
 */
export async function getSpoonacularRecipeInformation({
  id,
  apiKey = process.env.SPOONACULAR_API_KEY,
  timeoutMs = 8000,
}) {
  // If it's a curated demo recipe id
  if (typeof id === 'string' && id.startsWith('curated-')) {
    const curated = getCuratedRecipes().find((r) => r.id === id);
    if (curated) {
      return { isDemo: true, recipe: curated };
    }
  }

  if (!apiKey) {
    const curated = getCuratedRecipes().find((r) => String(r.id) === String(id)) || getCuratedRecipes()[0];
    return {
      isDemo: true,
      message: 'SPOONACULAR_API_KEY not configured. Using curated culinary database.',
      recipe: curated,
    };
  }

  const url = `${SPOONACULAR_BASE_URL}/recipes/${encodeURIComponent(id)}/information?apiKey=${encodeURIComponent(apiKey)}`;
  const response = await fetchWithTimeout(url, {}, timeoutMs);

  if (!response.ok) {
    if (response.status === 404) {
      throw new Error(`Recipe with ID ${id} not found`);
    }
    if (response.status === 402) {
      throw new Error('Spoonacular daily API request quota exceeded');
    }
    throw new Error(`Spoonacular API error: HTTP ${response.status}`);
  }

  const data = await response.json();
  return {
    isDemo: false,
    recipe: normalizeSpoonacularRecipe(data),
  };
}

/**
 * Standardize recipe structure
 */
export function normalizeSpoonacularRecipe(r) {
  const ingredients = (r.extendedIngredients || []).map((ing) => ({
    id: ing.id,
    name: ing.nameClean || ing.name || '',
    original: ing.original || '',
    amount: ing.amount || 1,
    unit: ing.unit || '',
    measures: ing.measures ? {
      metric: {
        amount: ing.measures.metric?.amount || ing.amount || 1,
        unitShort: ing.measures.metric?.unitShort || ing.unit || '',
      },
    } : null,
  }));

  return {
    id: String(r.id),
    title: r.title || 'Untitled Dish',
    servings: r.servings || 4,
    readyInMinutes: r.readyInMinutes || 30,
    sourceUrl: r.sourceUrl || '',
    image: r.image || '',
    cuisines: r.cuisines || [],
    dishTypes: r.dishTypes || [],
    instructions: r.instructions || (r.analyzedInstructions?.[0]?.steps?.map((s) => s.step).join(' ') || ''),
    extendedIngredients: ingredients,
  };
}

/**
 * Curated high-fidelity fallback recipes matching Asian family dining & dietary safety
 */
export function getCuratedRecipes(query = '', cuisine = '', limit = 10) {
  const catalog = [
    {
      id: 'curated-101',
      title: 'Ginger Soy Chicken Thighs & Crisp Garlic Broccoli',
      servings: 4,
      readyInMinutes: 25,
      cuisines: ['Chinese', 'Asian'],
      dishTypes: ['dinner', 'main course'],
      image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
      sourceUrl: 'https://heirloomtable.internal/recipes/ginger-chicken',
      instructions: 'Sear sliced chicken thighs with minced ginger and scallions. Toss broccoli florets in a hot wok with golden sliced garlic chips and light soy glaze.',
      extendedIngredients: [
        { id: 501, name: 'chicken thighs', original: '650g boneless chicken thighs', amount: 650, unit: 'g' },
        { id: 502, name: 'broccoli', original: '2 large heads broccoli (600g)', amount: 600, unit: 'g' },
        { id: 503, name: 'ginger', original: '50g fresh ginger root', amount: 50, unit: 'g' },
        { id: 504, name: 'garlic', original: '4 cloves garlic', amount: 4, unit: 'cloves' },
        { id: 505, name: 'soy sauce', original: '2 tbsp light soy sauce', amount: 30, unit: 'ml' },
      ],
    },
    {
      id: 'curated-102',
      title: 'Silken Tofu & Minced Pork Claypot with Shiitake',
      servings: 4,
      readyInMinutes: 30,
      cuisines: ['Cantonese', 'Chinese'],
      dishTypes: ['dinner', 'main course'],
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      sourceUrl: 'https://heirloomtable.internal/recipes/tofu-claypot',
      instructions: 'Gently brown lean minced pork with rehydrated shiitake. Simmer diced silken tofu in mild broth with a drop of sesame oil until velvet smooth.',
      extendedIngredients: [
        { id: 510, name: 'silken tofu', original: '2 boxes silken tofu (600g)', amount: 600, unit: 'g' },
        { id: 511, name: 'minced pork', original: '400g lean minced pork', amount: 400, unit: 'g' },
        { id: 512, name: 'shiitake mushrooms', original: '4 dried shiitake mushrooms', amount: 4, unit: 'pieces' },
        { id: 513, name: 'sesame oil', original: '1 tsp sesame oil', amount: 5, unit: 'ml' },
      ],
    },
    {
      id: 'curated-103',
      title: 'Steamed Sea Bass with Scallion Ginger & Tomato Egg Soup',
      servings: 4,
      readyInMinutes: 35,
      cuisines: ['Cantonese', 'Chinese'],
      dishTypes: ['dinner', 'main course', 'soup'],
      image: 'https://images.unsplash.com/photo-1547592166-23ac45744acd?auto=format&fit=crop&w=600&q=80',
      sourceUrl: 'https://heirloomtable.internal/recipes/steamed-seabass',
      instructions: 'Steam fresh whole sea bass over ginger slices for 8 minutes. Drizzle with sizzling scallion oil and seasoned soy. Serve with tomato egg drop soup.',
      extendedIngredients: [
        { id: 520, name: 'sea bass', original: '1 whole sea bass cleaned (~700g)', amount: 700, unit: 'g' },
        { id: 521, name: 'roma tomatoes', original: '6 medium ripe roma tomatoes', amount: 6, unit: 'pieces' },
        { id: 522, name: 'eggs', original: '4 fresh farm eggs', amount: 4, unit: 'pieces' },
        { id: 523, name: 'scallions', original: '2 bunches scallions', amount: 2, unit: 'bunches' },
        { id: 524, name: 'shaoxing wine', original: '1 tbsp shaoxing wine', amount: 15, unit: 'ml' },
      ],
    },
    {
      id: 'curated-104',
      title: 'Slow Simmer Pork Rib & Cooling Winter Melon Broth',
      servings: 4,
      readyInMinutes: 45,
      cuisines: ['Cantonese', 'Chinese'],
      dishTypes: ['soup', 'dinner'],
      image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80',
      sourceUrl: 'https://heirloomtable.internal/recipes/winter-melon-soup',
      instructions: 'Blanch spare ribs. Simmer with thick winter melon wedges and sliced ginger for a crystal-clear, nourishing double-boiled broth.',
      extendedIngredients: [
        { id: 530, name: 'pork spare ribs', original: '500g pork spare ribs', amount: 500, unit: 'g' },
        { id: 531, name: 'winter melon', original: '500g fresh winter melon sliced', amount: 500, unit: 'g' },
        { id: 532, name: 'ginger', original: '40g sliced ginger', amount: 40, unit: 'g' },
        { id: 533, name: 'cabbage', original: '1 small round cabbage head (800g)', amount: 800, unit: 'g' },
      ],
    },
    {
      id: 'curated-105',
      title: 'Mild Golden Chicken Curry with Fragrant Jasmine Rice',
      servings: 4,
      readyInMinutes: 35,
      cuisines: ['Asian', 'Chinese'],
      dishTypes: ['dinner', 'main course'],
      image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80',
      sourceUrl: 'https://heirloomtable.internal/recipes/mild-curry',
      instructions: 'Simmer chicken thighs and potatoes in a mild, kid-friendly yellow turmeric curry with coconut milk. Serve over jasmine rice.',
      extendedIngredients: [
        { id: 540, name: 'chicken thighs', original: '450g boneless chicken thighs', amount: 450, unit: 'g' },
        { id: 541, name: 'jasmine rice', original: '500g jasmine fragrant rice', amount: 500, unit: 'g' },
        { id: 542, name: 'potatoes', original: '2 medium potatoes', amount: 300, unit: 'g' },
      ],
    },
    {
      id: 'curated-106',
      title: 'Teriyaki Glazed Salmon Fillets with Steamed Bok Choy',
      servings: 4,
      readyInMinutes: 25,
      cuisines: ['Japanese', 'Asian'],
      dishTypes: ['dinner', 'main course'],
      image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80',
      sourceUrl: 'https://heirloomtable.internal/recipes/teriyaki-salmon',
      instructions: 'Pan-sear salmon fillets until skin is crisp. Glaze with reduced teriyaki sauce and serve alongside steamed bok choy tossed in sesame oil.',
      extendedIngredients: [
        { id: 550, name: 'salmon fillets', original: '350g salmon fillets (2 portions)', amount: 350, unit: 'g' },
        { id: 551, name: 'bok choy', original: '400g fresh bok choy / xiao bai cai', amount: 400, unit: 'g' },
        { id: 552, name: 'soy sauce', original: '2 tbsp soy sauce', amount: 30, unit: 'ml' },
      ],
    },
    {
      id: 'curated-107',
      title: 'Homestyle Poached Ginger Chicken & Noodle Bowl',
      servings: 4,
      readyInMinutes: 40,
      cuisines: ['Cantonese', 'Chinese'],
      dishTypes: ['dinner', 'main course'],
      image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=600&q=80',
      sourceUrl: 'https://heirloomtable.internal/recipes/poached-chicken',
      instructions: 'Poach tender chicken with ginger and scallions. Serve with noodles in aromatic clear broth and steamed greens.',
      extendedIngredients: [
        { id: 560, name: 'chicken thighs', original: '400g chicken thighs', amount: 400, unit: 'g' },
        { id: 561, name: 'bok choy', original: '200g bok choy', amount: 200, unit: 'g' },
        { id: 562, name: 'scallions', original: '1 bunch spring onions', amount: 1, unit: 'bunch' },
        { id: 563, name: 'ginger', original: '50g fresh ginger', amount: 50, unit: 'g' },
      ],
    },
  ];

  let filtered = catalog;
  if (query) {
    const q = query.toLowerCase();
    filtered = filtered.filter((r) =>
      r.title.toLowerCase().includes(q) ||
      r.extendedIngredients.some((i) => i.name.toLowerCase().includes(q))
    );
  }
  if (cuisine) {
    const c = cuisine.toLowerCase();
    filtered = filtered.filter((r) =>
      r.cuisines.some((cuis) => cuis.toLowerCase().includes(c))
    );
  }

  return (filtered.length ? filtered : catalog).slice(0, limit);
}
