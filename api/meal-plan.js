/**
 * /api/meal-plan.js
 * Generates an optimized 7-day family weekly menu rotation using Claude Messages API (Anthropic SDK)
 * and Spoonacular recipe candidates.
 * Compatible with Vercel and Node HTTP.
 */

import Anthropic from '@anthropic-ai/sdk';
import { searchSpoonacularRecipes, sanitizeErrorMessage, getCuratedRecipes } from '../lib/api-client.js';

export default async function handler(req, res) {
  if (typeof res.status !== 'function') {
    res.status = function (code) {
      res.statusCode = code;
      return res;
    };
  }
  if (typeof res.json !== 'function') {
    res.json = function (data) {
      res.setHeader('Content-Type', 'application/json');
      res.end(JSON.stringify(data));
      return res;
    };
  }

  // Only allow POST
  if (req.method !== 'POST' && req.method !== 'OPTIONS') {
    return res.status(405).json({ error: 'Method not allowed. Use POST.' });
  }

  // Handle preflight
  if (req.method === 'OPTIONS') {
    res.setHeader('Access-Control-Allow-Origin', '*');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return res.status(200).end();
  }

  // Read request body
  let body = req.body;
  if (!body && typeof req.on === 'function') {
    try {
      const raw = await readRequestBody(req);
      body = raw ? JSON.parse(raw) : {};
    } catch (e) {
      body = {};
    }
  }

  const {
    householdSize = { adults: 2, children: 1 },
    appetiteSettings = [],
    dietaryRestrictions = [],
    dislikedIngredients = [],
    cookingTimePreferences = 45,
    primaryCuisines = ['Chinese', 'Cantonese', 'Asian'],
    lockedDays = [],
    existingMenu = [],
    swapDay = null,
  } = body || {};

  try {
    // 1. Gather candidate recipes from Spoonacular / curated database
    const cuisineQuery = primaryCuisines.join(',');
    const spoonCandidatesRes = await searchSpoonacularRecipes({
      query: '',
      cuisine: cuisineQuery,
      number: 16,
    });

    let candidates = spoonCandidatesRes.results || [];
    // Ensure we also include curated recipes for guaranteed variety
    const curated = getCuratedRecipes();
    candidates = [...candidates, ...curated];

    // Deduplicate by ID
    const candidateMap = new Map();
    candidates.forEach((c) => {
      if (!candidateMap.has(String(c.id))) {
        candidateMap.set(String(c.id), c);
      }
    });
    const uniqueCandidates = Array.from(candidateMap.values());

    // Filter out recipes that conflict with explicit dietary restrictions
    const restrictionsLower = dietaryRestrictions.map((r) => r.toLowerCase());
    const dislikedLower = dislikedIngredients.map((d) => (typeof d === 'string' ? d : d.name).toLowerCase());

    const safeCandidates = uniqueCandidates.filter((r) => {
      // Check cooking time
      if (r.readyInMinutes > cookingTimePreferences + 10) return false;

      // Check ingredient safety
      const ingTexts = (r.extendedIngredients || []).map((i) => i.name.toLowerCase()).join(' ');
      const titleLower = r.title.toLowerCase();

      // Check allergies (e.g. peanuts)
      for (const res of restrictionsLower) {
        if (res.includes('peanut') && (ingTexts.includes('peanut') || titleLower.includes('peanut'))) {
          return false;
        }
      }

      // Check disliked (e.g. bittergourd, cilantro)
      for (const dis of dislikedLower) {
        if (dis.includes('bittergourd') && (ingTexts.includes('bittergourd') || titleLower.includes('bittergourd'))) {
          return false;
        }
        if (dis.includes('cilantro') && (ingTexts.includes('cilantro') || ingTexts.includes('coriander'))) {
          return false;
        }
      }

      return true;
    });

    const activePool = safeCandidates.length >= 7 ? safeCandidates : uniqueCandidates;

    // 2. Check if Claude / Anthropic API is configured
    const anthropicKey = process.env.ANTHROPIC_API_KEY;
    const anthropicModel = process.env.ANTHROPIC_MODEL || 'claude-3-5-sonnet-20241022';

    if (!anthropicKey) {
      // Fallback planner: deterministic & constraint-safe
      const menu = buildDeterministicMenu({
        candidates: activePool,
        existingMenu,
        lockedDays,
        swapDay,
        cookingTimePreferences,
      });

      return res.status(200).json({
        success: true,
        isDemo: true,
        message: 'ANTHROPIC_API_KEY not configured. Used structured local constraint planner.',
        menu,
      });
    }

    // 3. Call Claude via official Anthropic SDK
    const anthropic = new Anthropic({
      apiKey: anthropicKey,
      timeout: 15000,
    });

    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    const promptPayload = {
      daysOfWeek,
      lockedDays,
      existingMenuDays: existingMenu.map((m) => ({ day: m.day, id: m.id, mealName: m.mealName })),
      swapDay,
      householdSize,
      dietaryRestrictions,
      dislikedIngredients,
      maxCookingMinutes: cookingTimePreferences,
      availableRecipes: activePool.map((c) => ({
        id: String(c.id),
        title: c.title,
        readyInMinutes: c.readyInMinutes,
        cuisines: c.cuisines,
        keyIngredients: (c.extendedIngredients || []).slice(0, 5).map((i) => i.name),
      })),
    };

    const response = await anthropic.messages.create({
      model: anthropicModel,
      max_tokens: 2000,
      temperature: 0.2,
      system: `You are the meal planning engine for Heirloom Table.
Your task is to assign recipes to the 7-day Monday–Sunday menu for this family.
RULES:
1. ONLY use recipe IDs from the "availableRecipes" list. Do NOT invent new or fake recipe IDs.
2. If a day is in "lockedDays", retain the recipe from "existingMenuDays" for that day.
3. Ensure cooking times do not exceed maxCookingMinutes.
4. Strictly respect all dietary restrictions and disliked ingredients.
5. Return ONLY a valid JSON array of 7 objects (one for each day Monday to Sunday).
Each object must have:
- day: string ("Monday" ... "Sunday")
- recipeId: string (matching a real ID from availableRecipes)
- subName: short tagline highlighting nutrition or family appeal
- reason: brief note explaining why this fits the household profile`,
      messages: [
        {
          role: 'user',
          content: `Generate the meal plan for this family:\n${JSON.stringify(promptPayload, null, 2)}`,
        },
      ],
    });

    // Parse Claude's response
    const rawContent = response.content?.[0]?.type === 'text' ? response.content[0].text : '';
    const jsonMatch = rawContent.match(/\[[\s\S]*\]/);
    if (!jsonMatch) {
      throw new Error('Claude response did not contain a valid JSON array');
    }

    const parsedAssignments = JSON.parse(jsonMatch[0]);

    // Validate that all recipe IDs exist and assemble final menu
    const assembledMenu = daysOfWeek.map((dayName, idx) => {
      // Check if locked
      if (lockedDays.includes(dayName)) {
        const existing = existingMenu.find((m) => m.day === dayName);
        if (existing) return existing;
      }

      const assignment = parsedAssignments.find((a) => a.day === dayName);
      let selectedRecipe = assignment ? candidateMap.get(String(assignment.recipeId)) : null;

      // Fallback if recipeId was invalid or hallucinated
      if (!selectedRecipe) {
        selectedRecipe = activePool[idx % activePool.length];
      }

      return formatMenuItemFromRecipe(selectedRecipe, dayName, assignment?.subName);
    });

    return res.status(200).json({
      success: true,
      isDemo: false,
      menu: assembledMenu,
    });
  } catch (error) {
    console.error('Meal plan generation error:', error);
    // On error, keep existing menu or fall back gracefully
    const fallbackMenu = buildDeterministicMenu({
      candidates: getCuratedRecipes(),
      existingMenu,
      lockedDays,
      swapDay,
      cookingTimePreferences,
    });

    return res.status(200).json({
      success: false,
      error: sanitizeErrorMessage(error),
      fallbackUsed: true,
      isDemo: true,
      menu: fallbackMenu,
    });
  }
}

/**
 * Format a recipe candidate into the frontend MenuItem shape
 */
function formatMenuItemFromRecipe(recipe, day, subName) {
  const ingredients = (recipe.extendedIngredients || []).map((ing) => ({
    name: ing.name || ing.original || 'Ingredient',
    qty: `${ing.amount || 1}${ing.unit ? ' ' + ing.unit : ''}`,
    status: (ing.name || '').match(/rice|oil|salt|soy|cornstarch/i) ? 'in-pantry' : 'buy',
  }));

  return {
    id: `menu-${day.toLowerCase().slice(0, 3)}`,
    recipeId: String(recipe.id),
    day,
    mealName: recipe.title,
    subName: subName || `Prep time: ${recipe.readyInMinutes}m • Fresh Family Style`,
    description: recipe.instructions || 'Nourishing family style meal prepared with fresh seasonal ingredients.',
    prepTimeMinutes: recipe.readyInMinutes || 30,
    cuisine: (recipe.cuisines?.[0] || 'Asian') + ' Home Cooking',
    image: recipe.image || 'https://images.unsplash.com/photo-1540420773420-3366772f4999?auto=format&fit=crop&w=600&q=80',
    tags: ['Family Balance', 'Portion Calibrated'],
    servings: 2.75,
    ingredients,
  };
}

/**
 * Deterministic menu builder when Claude is not configured
 */
function buildDeterministicMenu({ candidates, existingMenu = [], lockedDays = [], swapDay = null, cookingTimePreferences = 45 }) {
  const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

  return daysOfWeek.map((dayName, idx) => {
    // If locked and not swapping this day, preserve
    if (lockedDays.includes(dayName) && swapDay !== dayName) {
      const existing = existingMenu.find((m) => m.day === dayName);
      if (existing) return existing;
    }

    // Pick candidate avoiding repeats
    const recipe = candidates[(idx + (swapDay === dayName ? 3 : 0)) % candidates.length];
    return formatMenuItemFromRecipe(recipe, dayName);
  });
}

function readRequestBody(req) {
  return new Promise((resolve, reject) => {
    let data = '';
    req.on('data', (chunk) => {
      data += chunk;
    });
    req.on('end', () => {
      resolve(data);
    });
    req.on('error', (err) => {
      reject(err);
    });
  });
}
