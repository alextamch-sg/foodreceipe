/**
 * Shared server-side helper for Spoonacular API and fallback data
 */

const SPOONACULAR_BASE_URL = 'https://api.spoonacular.com';

/**
 * Shared Gemini model configuration
 */
export const DEFAULT_GEMINI_MODEL = process.env.GEMINI_MODEL || 'gemini-3.1-flash-lite';
export const FALLBACK_GEMINI_MODEL = 'gemini-3.8-flash';

export function getGeminiModel() {
  return process.env.GEMINI_MODEL || DEFAULT_GEMINI_MODEL;
}

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
  let msg = typeof error === 'string' ? error : error.message || 'Unknown error';

  // If error message is a stringified JSON object, extract the nested message
  try {
    const parsed = JSON.parse(msg);
    if (parsed.error?.message) {
      msg = parsed.error.message;
    } else if (parsed.message) {
      msg = parsed.message;
    }
  } catch (e) {
    // not JSON, keep as is
  }

  // Remove any potential keys or sensitive tokens
  return msg.replace(/[a-zA-Z0-9_-]{24,}/g, '[REDACTED]');
}

/**
 * Search Spoonacular recipes
 */
export async function searchSpoonacularRecipes({
  query = '',
  cuisine = '',
  number = 15,
  offset = 0,
  apiKey = process.env.SPOONACULAR_API_KEY,
  timeoutMs = 8000,
}) {
  if (!apiKey) {
    return {
      isDemo: true,
      message: 'SPOONACULAR_API_KEY not configured. Using curated culinary database.',
      results: getCuratedRecipes(query, cuisine, number, offset),
    };
  }

  const params = new URLSearchParams({
    apiKey,
    number: String(Math.min(number, 25)),
    addRecipeInformation: 'true',
    fillIngredients: 'true',
  });

  if (query) params.append('query', query);
  if (cuisine) params.append('cuisine', cuisine);
  if (offset > 0) params.append('offset', String(offset));

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
export function getCuratedRecipes(query = '', cuisine = '', limit = 15, offset = 0) {
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
    {
      id: 'curated-108',
      title: 'Taiwanese Braised Lu Rou Pork with Steamed Choy Sum & Eggs',
      servings: 4,
      readyInMinutes: 40,
      cuisines: ['Taiwanese', 'Chinese'],
      dishTypes: ['dinner', 'main course'],
      image: 'https://images.unsplash.com/photo-1569718212165-3a8278d5f624?auto=format&fit=crop&w=600&q=80',
      sourceUrl: 'https://heirloomtable.internal/recipes/lu-rou-fan',
      instructions: 'Slow braise lean minced pork and pork belly cubes with fried shallots, soy, and hard-boiled eggs. Serve with vibrant steamed choy sum.',
      extendedIngredients: [
        { id: 570, name: 'minced pork', original: '450g minced pork', amount: 450, unit: 'g' },
        { id: 571, name: 'choy sum', original: '350g tender choy sum', amount: 350, unit: 'g' },
        { id: 572, name: 'eggs', original: '4 hard boiled eggs', amount: 4, unit: 'pieces' },
        { id: 573, name: 'soy sauce', original: '3 tbsp dark and light soy sauce', amount: 45, unit: 'ml' },
      ],
    },
    {
      id: 'curated-109',
      title: 'Stir-Fried Beef with Scallions, Sweet Onions & Jasmine Rice',
      servings: 4,
      readyInMinutes: 20,
      cuisines: ['Chinese', 'Asian'],
      dishTypes: ['dinner', 'main course'],
      image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80',
      sourceUrl: 'https://heirloomtable.internal/recipes/scallion-beef',
      instructions: 'Flash-sear marinated beef tenderloin slices in high heat with sliced sweet onions and spring onions. Season with savory oyster sauce and ginger.',
      extendedIngredients: [
        { id: 580, name: 'beef', original: '400g lean beef tenderloin sliced', amount: 400, unit: 'g' },
        { id: 581, name: 'scallions', original: '3 bunches spring onions', amount: 3, unit: 'bunches' },
        { id: 582, name: 'onion', original: '1 large sweet yellow onion', amount: 200, unit: 'g' },
        { id: 583, name: 'jasmine rice', original: '400g jasmine rice', amount: 400, unit: 'g' },
      ],
    },
    {
      id: 'curated-110',
      title: 'Cantonese Steamed Chicken with Dried Shiitake & Goji Berries',
      servings: 4,
      readyInMinutes: 30,
      cuisines: ['Cantonese', 'Chinese'],
      dishTypes: ['dinner', 'main course'],
      image: 'https://images.unsplash.com/photo-1512058564366-18510be2db19?auto=format&fit=crop&w=600&q=80',
      sourceUrl: 'https://heirloomtable.internal/recipes/steamed-shiitake-chicken',
      instructions: 'Marinate sliced chicken with ginger, shaoxing wine, and sesame oil. Steam with plump shiitake and goji berries for natural sweetness.',
      extendedIngredients: [
        { id: 590, name: 'chicken thighs', original: '500g skinless chicken thighs', amount: 500, unit: 'g' },
        { id: 591, name: 'shiitake mushrooms', original: '6 dried shiitake caps rehydrated', amount: 6, unit: 'pieces' },
        { id: 592, name: 'ginger', original: '30g julienned ginger', amount: 30, unit: 'g' },
        { id: 593, name: 'sesame oil', original: '1 tbsp sesame oil', amount: 15, unit: 'ml' },
      ],
    },
    {
      id: 'curated-111',
      title: 'Japanese Comfort Chicken Oyakodon with Dashi & Soft Eggs',
      servings: 4,
      readyInMinutes: 25,
      cuisines: ['Japanese', 'Asian'],
      dishTypes: ['dinner', 'main course'],
      image: 'https://images.unsplash.com/photo-1569058242253-92a9c755a0ec?auto=format&fit=crop&w=600&q=80',
      sourceUrl: 'https://heirloomtable.internal/recipes/oyakodon',
      instructions: 'Simmer sliced chicken and tender sweet onions in mild dashi mirin broth. Drizzle whisked eggs until softly set over warm rice bowls.',
      extendedIngredients: [
        { id: 601, name: 'chicken thighs', original: '400g chicken thighs diced', amount: 400, unit: 'g' },
        { id: 602, name: 'eggs', original: '4 farm fresh eggs', amount: 4, unit: 'pieces' },
        { id: 603, name: 'onion', original: '1 large yellow onion sliced', amount: 180, unit: 'g' },
        { id: 604, name: 'jasmine rice', original: '400g steamed rice', amount: 400, unit: 'g' },
      ],
    },
    {
      id: 'curated-112',
      title: 'Crispy Pan-Seared Cod Fillets with Sautéed Baby Asparagus',
      servings: 4,
      readyInMinutes: 25,
      cuisines: ['Asian', 'Mediterranean'],
      dishTypes: ['dinner', 'main course'],
      image: 'https://images.unsplash.com/photo-1534939561126-855b8675edd7?auto=format&fit=crop&w=600&q=80',
      sourceUrl: 'https://heirloomtable.internal/recipes/pan-seared-cod',
      instructions: 'Sear thick Atlantic cod fillets in olive oil until golden crust forms. Serve alongside crisp tender asparagus sautéed with garlic chips.',
      extendedIngredients: [
        { id: 610, name: 'cod', original: '450g fresh cod fillets', amount: 450, unit: 'g' },
        { id: 611, name: 'asparagus', original: '300g tender baby asparagus', amount: 300, unit: 'g' },
        { id: 612, name: 'garlic', original: '4 cloves garlic sliced', amount: 4, unit: 'cloves' },
        { id: 613, name: 'potatoes', original: '300g steamed baby potatoes', amount: 300, unit: 'g' },
      ],
    },
    {
      id: 'curated-113',
      title: 'Sweet & Sour Golden Fish Fillets with Bell Peppers & Pineapple',
      servings: 4,
      readyInMinutes: 30,
      cuisines: ['Cantonese', 'Chinese'],
      dishTypes: ['dinner', 'main course'],
      image: 'https://images.unsplash.com/photo-1559847844-5315695dadae?auto=format&fit=crop&w=600&q=80',
      sourceUrl: 'https://heirloomtable.internal/recipes/sweet-sour-fish',
      instructions: 'Lightly dust white fish fillets with cornstarch and pan-fry. Toss gently in homestyle mild tomato glaze with sweet peppers and pineapple cubes.',
      extendedIngredients: [
        { id: 620, name: 'sea bass', original: '450g white fish fillets sliced', amount: 450, unit: 'g' },
        { id: 621, name: 'pepper', original: '1 sweet bell pepper sliced', amount: 150, unit: 'g' },
        { id: 622, name: 'roma tomatoes', original: '3 ripe tomatoes pureed', amount: 300, unit: 'g' },
        { id: 623, name: 'cornstarch', original: '3 tbsp cornstarch', amount: 30, unit: 'g' },
      ],
    },
    {
      id: 'curated-114',
      title: 'Garlic Tiger Prawns with Crisp Snow Peas & Sweet Corn',
      servings: 4,
      readyInMinutes: 20,
      cuisines: ['Cantonese', 'Asian'],
      dishTypes: ['dinner', 'main course'],
      image: 'https://images.unsplash.com/photo-1565680018434-b513d5e5fd47?auto=format&fit=crop&w=600&q=80',
      sourceUrl: 'https://heirloomtable.internal/recipes/garlic-prawns',
      instructions: 'Wok-sear shelled tiger prawns with minced garlic until pink and fragrant. Add crisp snow peas and sweet corn kernels for a sweet, vibrant family favorite.',
      extendedIngredients: [
        { id: 630, name: 'prawns', original: '400g fresh tiger prawns peeled', amount: 400, unit: 'g' },
        { id: 631, name: 'snow peas', original: '250g crisp snow peas trimmed', amount: 250, unit: 'g' },
        { id: 632, name: 'corn', original: '1 sweet corn cob kernels sliced', amount: 150, unit: 'g' },
        { id: 633, name: 'garlic', original: '4 cloves minced garlic', amount: 4, unit: 'cloves' },
      ],
    },
    {
      id: 'curated-115',
      title: 'Double-Boiled Lotus Root & Pork Spare Rib Nourishing Broth',
      servings: 4,
      readyInMinutes: 45,
      cuisines: ['Cantonese', 'Chinese'],
      dishTypes: ['soup', 'dinner'],
      image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80',
      sourceUrl: 'https://heirloomtable.internal/recipes/lotus-root-soup',
      instructions: 'Simmer fresh sliced lotus root wheels with blanched pork spare ribs, sweet red dates, and ginger for a soothing, immune-boosting traditional soup.',
      extendedIngredients: [
        { id: 640, name: 'pork spare ribs', original: '500g pork spare ribs', amount: 500, unit: 'g' },
        { id: 641, name: 'lotus root', original: '350g fresh lotus root sliced', amount: 350, unit: 'g' },
        { id: 642, name: 'ginger', original: '30g sliced ginger', amount: 30, unit: 'g' },
        { id: 643, name: 'scallions', original: '1 bunch scallions', amount: 1, unit: 'bunch' },
      ],
    },
    {
      id: 'curated-116',
      title: 'Silky Steamed Egg Custard with Minced Pork & Scallion Glaze',
      servings: 4,
      readyInMinutes: 20,
      cuisines: ['Chinese', 'Asian'],
      dishTypes: ['dinner', 'main course'],
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      sourceUrl: 'https://heirloomtable.internal/recipes/steamed-egg-custard',
      instructions: 'Steam velvety egg custard gently until like mirror glass. Top with lightly browned savory lean minced pork and a splash of scallion sesame oil.',
      extendedIngredients: [
        { id: 650, name: 'eggs', original: '4 large farm eggs whisked with warm broth', amount: 4, unit: 'pieces' },
        { id: 651, name: 'minced pork', original: '200g lean minced pork', amount: 200, unit: 'g' },
        { id: 652, name: 'scallions', original: '1 bunch chopped scallions', amount: 1, unit: 'bunch' },
        { id: 653, name: 'sesame oil', original: '1 tsp sesame oil', amount: 5, unit: 'ml' },
      ],
    },
    {
      id: 'curated-117',
      title: 'Japanese Miso Glazed Salmon with Edamame & Dashi Spinach',
      servings: 4,
      readyInMinutes: 25,
      cuisines: ['Japanese', 'Asian'],
      dishTypes: ['dinner', 'main course'],
      image: 'https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=600&q=80',
      sourceUrl: 'https://heirloomtable.internal/recipes/miso-salmon',
      instructions: 'Brush fresh salmon fillets with sweet white miso glaze and broil to caramelization. Serve with steamed young edamame and blanched sesame spinach.',
      extendedIngredients: [
        { id: 660, name: 'salmon fillets', original: '400g salmon portions', amount: 400, unit: 'g' },
        { id: 661, name: 'edamame', original: '200g shelled sweet edamame', amount: 200, unit: 'g' },
        { id: 662, name: 'spinach', original: '300g tender baby spinach', amount: 300, unit: 'g' },
        { id: 663, name: 'soy sauce', original: '1 tbsp light soy sauce', amount: 15, unit: 'ml' },
      ],
    },
    {
      id: 'curated-118',
      title: 'Cantonese Braised Beancurd Skin & Shiitake Claypot with Cabbage',
      servings: 4,
      readyInMinutes: 30,
      cuisines: ['Cantonese', 'Chinese'],
      dishTypes: ['dinner', 'main course'],
      image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
      sourceUrl: 'https://heirloomtable.internal/recipes/beancurd-cabbage-claypot',
      instructions: 'Braised rolled beancurd skin (fu zhu) with dried shiitake mushrooms, napa cabbage, and sliced carrots in rich, comforting vegetarian mushroom broth.',
      extendedIngredients: [
        { id: 670, name: 'tofu', original: '200g dried beancurd skin rolls rehydrated', amount: 200, unit: 'g' },
        { id: 671, name: 'cabbage', original: '400g tender sweet cabbage', amount: 400, unit: 'g' },
        { id: 672, name: 'shiitake mushrooms', original: '6 shiitake mushrooms sliced', amount: 6, unit: 'pieces' },
        { id: 673, name: 'carrot', original: '1 medium carrot sliced', amount: 150, unit: 'g' },
      ],
    },
    {
      id: 'curated-119',
      title: 'Golden Egg & Diced Chicken Fried Rice with Sweet Corn',
      servings: 4,
      readyInMinutes: 20,
      cuisines: ['Chinese', 'Asian'],
      dishTypes: ['dinner', 'main course'],
      image: 'https://images.unsplash.com/photo-1589302168068-964664d93dc0?auto=format&fit=crop&w=600&q=80',
      sourceUrl: 'https://heirloomtable.internal/recipes/egg-chicken-fried-rice',
      instructions: 'Wok-toss day-old jasmine rice with golden whipped eggs, diced chicken breast, sweet corn, and crisp scallions until fragrant and separated.',
      extendedIngredients: [
        { id: 680, name: 'chicken thighs', original: '300g diced chicken breast / thighs', amount: 300, unit: 'g' },
        { id: 681, name: 'jasmine rice', original: '500g cooked jasmine rice', amount: 500, unit: 'g' },
        { id: 682, name: 'eggs', original: '3 fresh farm eggs', amount: 3, unit: 'pieces' },
        { id: 683, name: 'corn', original: '150g sweet corn kernels', amount: 150, unit: 'g' },
      ],
    },
    {
      id: 'curated-120',
      title: 'Tender Beef & Tomato Stew with Flat Rice Noodles',
      servings: 4,
      readyInMinutes: 40,
      cuisines: ['Cantonese', 'Chinese'],
      dishTypes: ['dinner', 'main course'],
      image: 'https://images.unsplash.com/photo-1534422298391-e4f8c172dddb?auto=format&fit=crop&w=600&q=80',
      sourceUrl: 'https://heirloomtable.internal/recipes/beef-tomato-noodles',
      instructions: 'Simmer tender beef slices with ripe heirloom tomatoes, onions, and mild ginger broth. Pour over wide rice noodles with blanched bok choy.',
      extendedIngredients: [
        { id: 690, name: 'beef', original: '450g lean beef sliced', amount: 450, unit: 'g' },
        { id: 691, name: 'roma tomatoes', original: '5 ripe tomatoes chopped', amount: 500, unit: 'g' },
        { id: 692, name: 'bok choy', original: '250g fresh bok choy', amount: 250, unit: 'g' },
        { id: 693, name: 'noodle', original: '400g fresh flat rice noodles', amount: 400, unit: 'g' },
      ],
    },
    {
      id: 'curated-121',
      title: 'Steamed Minced Pork Patty with Water Chestnuts & Scallions',
      servings: 4,
      readyInMinutes: 25,
      cuisines: ['Cantonese', 'Chinese'],
      dishTypes: ['dinner', 'main course'],
      image: 'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=600&q=80',
      sourceUrl: 'https://heirloomtable.internal/recipes/steamed-pork-patty',
      instructions: 'Hand-whip minced pork with crunchy diced water chestnuts, ginger, and soy glaze. Steam on high heat for 12 minutes for a juicy, traditional family staple.',
      extendedIngredients: [
        { id: 700, name: 'minced pork', original: '450g fresh minced pork', amount: 450, unit: 'g' },
        { id: 701, name: 'scallions', original: '2 bunches chopped spring onions', amount: 2, unit: 'bunches' },
        { id: 702, name: 'ginger', original: '25g finely minced ginger', amount: 25, unit: 'g' },
        { id: 703, name: 'soy sauce', original: '2 tbsp light soy sauce', amount: 30, unit: 'ml' },
      ],
    },
    {
      id: 'curated-122',
      title: 'Cantonese Fresh Shrimp & Pork Wonton Soup with Xiao Bai Cai',
      servings: 4,
      readyInMinutes: 30,
      cuisines: ['Cantonese', 'Chinese'],
      dishTypes: ['soup', 'dinner'],
      image: 'https://images.unsplash.com/photo-1598515214211-89d3c73ae83b?auto=format&fit=crop&w=600&q=80',
      sourceUrl: 'https://heirloomtable.internal/recipes/wonton-soup',
      instructions: 'Plump wontons wrapped with minced pork and juicy shrimp chunks, simmered in clear yellow chicken broth with fresh xiao bai cai and sesame oil.',
      extendedIngredients: [
        { id: 710, name: 'prawns', original: '250g minced shrimp meat', amount: 250, unit: 'g' },
        { id: 711, name: 'minced pork', original: '250g lean minced pork', amount: 250, unit: 'g' },
        { id: 712, name: 'xiao bai cai', original: '300g tender greens', amount: 300, unit: 'g' },
        { id: 713, name: 'scallions', original: '1 bunch spring onions', amount: 1, unit: 'bunch' },
      ],
    },
    {
      id: 'curated-123',
      title: 'Fragrant Taiwanese Three-Cup Chicken (San Bei Ji) with Basil',
      servings: 4,
      readyInMinutes: 30,
      cuisines: ['Taiwanese', 'Chinese'],
      dishTypes: ['dinner', 'main course'],
      image: 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
      sourceUrl: 'https://heirloomtable.internal/recipes/three-cup-chicken',
      instructions: 'Braised bone-in chicken thigh pieces in sesame oil, light soy, and shaoxing rice wine with whole golden garlic cloves and fresh sweet basil leaves.',
      extendedIngredients: [
        { id: 720, name: 'chicken thighs', original: '550g chicken thighs cut bite size', amount: 550, unit: 'g' },
        { id: 721, name: 'basil', original: '1 cup fresh sweet basil leaves', amount: 50, unit: 'g' },
        { id: 722, name: 'garlic', original: '8 whole peeled garlic cloves', amount: 8, unit: 'cloves' },
        { id: 723, name: 'ginger', original: '40g thick sliced ginger', amount: 40, unit: 'g' },
      ],
    },
    {
      id: 'curated-124',
      title: 'Comforting Pumpkin & Minced Pork Golden Congee',
      servings: 4,
      readyInMinutes: 35,
      cuisines: ['Chinese', 'Asian'],
      dishTypes: ['dinner', 'main course'],
      image: 'https://images.unsplash.com/photo-1547592180-85f173990554?auto=format&fit=crop&w=600&q=80',
      sourceUrl: 'https://heirloomtable.internal/recipes/pumpkin-congee',
      instructions: 'Smooth rice congee slow-cooked with diced sweet Japanese pumpkin and seasoned lean minced pork until velvety and naturally sweet.',
      extendedIngredients: [
        { id: 730, name: 'pumpkin', original: '350g sweet pumpkin diced', amount: 350, unit: 'g' },
        { id: 731, name: 'minced pork', original: '250g lean minced pork', amount: 250, unit: 'g' },
        { id: 732, name: 'jasmine rice', original: '200g jasmine rice', amount: 200, unit: 'g' },
        { id: 733, name: 'ginger', original: '20g shredded ginger', amount: 20, unit: 'g' },
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

  const baseList = filtered.length ? filtered : catalog;

  // Support rotational offset so regenerating produces different ordering
  if (offset > 0 && baseList.length > 0) {
    const rot = offset % baseList.length;
    const rotated = [...baseList.slice(rot), ...baseList.slice(0, rot)];
    return rotated.slice(0, limit);
  }

  return baseList.slice(0, limit);
}

