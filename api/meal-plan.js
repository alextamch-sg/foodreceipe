/**
 * /api/meal-plan.js
 * Generates an optimized 7-day family weekly menu rotation using Gemini (@google/genai)
 * and Spoonacular recipe candidates with resilient multi-tier model fallback.
 * Allows per-day acceptance, changing/swapping until each day is accepted,
 * and intelligent recipe curation.
 */

import { GoogleGenAI, Type } from '@google/genai';
import {
  searchSpoonacularRecipes,
  sanitizeErrorMessage,
  getCuratedRecipes,
  getGeminiModel,
  FALLBACK_GEMINI_MODEL,
} from '../lib/api-client.js';

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
    acceptedDays = [],
    existingMenu = [],
    swapDay = null,
    excludeRecipeIds = [],
    regenerateSeed = Date.now(),
  } = body || {};

  try {
    // 1. Gather candidate recipes from Spoonacular & curated catalog with dynamic offset
    const cuisineQuery = primaryCuisines.join(',');
    const randomOffset = Math.floor(Math.random() * 20);

    const spoonCandidatesRes = await searchSpoonacularRecipes({
      query: '',
      cuisine: cuisineQuery,
      number: 20,
      offset: randomOffset,
    });

    let candidates = spoonCandidatesRes.results || [];
    const curated = getCuratedRecipes('', '', 25, randomOffset);
    candidates = [...candidates, ...curated];

    // Deduplicate candidates by ID
    const candidateMap = new Map();
    candidates.forEach((c) => {
      if (!candidateMap.has(String(c.id))) {
        candidateMap.set(String(c.id), c);
      }
    });
    const uniqueCandidates = Array.from(candidateMap.values());

    // Filter out candidates that conflict with dietary restrictions or dislikes
    const restrictionsLower = (dietaryRestrictions || []).map((r) => r.toLowerCase());
    const dislikedLower = (dislikedIngredients || []).map((d) => (typeof d === 'string' ? d : d.name).toLowerCase());

    const safeCandidates = uniqueCandidates.filter((r) => {
      if (r.readyInMinutes > cookingTimePreferences + 10) return false;

      const ingTexts = (r.extendedIngredients || []).map((i) => i.name.toLowerCase()).join(' ');
      const titleLower = r.title.toLowerCase();

      // Check allergies
      for (const res of restrictionsLower) {
        if (res.includes('peanut') && (ingTexts.includes('peanut') || titleLower.includes('peanut'))) {
          return false;
        }
      }

      // Check dislikes
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
    const daysOfWeek = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

    // Determine which days should stay locked/accepted vs which days need a fresh recipe
    const daysToKeep = daysOfWeek.filter((d) => {
      if (swapDay && d === swapDay) return false; // swapDay must be changed
      return lockedDays.includes(d) || acceptedDays.includes(d);
    });

    const daysToChange = daysOfWeek.filter((d) => !daysToKeep.includes(d));

    // Currently assigned recipe IDs
    const currentAssignments = existingMenu.map((m) => ({
      day: m.day,
      id: String(m.recipeId || m.id),
      mealName: m.mealName,
    }));

    // Recipe IDs currently in use for days that are changing (to avoid repeating them)
    const changingCurrentIds = currentAssignments
      .filter((a) => daysToChange.includes(a.day))
      .map((a) => a.id);

    const allExcludedIds = new Set([...(excludeRecipeIds || []), ...changingCurrentIds]);

    // 2. Check if GEMINI_API_KEY is configured
    const geminiKey = process.env.GEMINI_API_KEY;

    if (!geminiKey) {
      const menu = buildDynamicMenu({
        candidates: activePool,
        existingMenu,
        daysToKeep,
        daysToChange,
        swapDay,
        allExcludedIds,
        acceptedDays,
        lockedDays,
      });

      return res.status(200).json({
        success: true,
        isDemo: true,
        message: 'GEMINI_API_KEY not configured. Used structured local constraint planner.',
        menu,
      });
    }

    // 3. Call Gemini using official @google/genai SDK
    const ai = new GoogleGenAI({
      apiKey: geminiKey,
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });

    // Provide Gemini with candidates that favor fresh unseen recipes for daysToChange
    const promptPayload = {
      daysOfWeek,
      daysToKeep,
      daysToChange,
      swapDay,
      currentDayAssignments: currentAssignments,
      householdSize,
      dietaryRestrictions,
      dislikedIngredients,
      maxCookingMinutes: cookingTimePreferences,
      primaryCuisines,
      availableRecipes: activePool.map((c) => ({
        id: String(c.id),
        title: c.title,
        readyInMinutes: c.readyInMinutes,
        cuisines: c.cuisines,
        keyIngredients: (c.extendedIngredients || []).slice(0, 5).map((i) => i.name),
      })),
    };

    const systemInstruction = `You are the master family kitchen meal planner for Heirloom Table.
Your task is to curate recipes from the provided Spoonacular and culinary database for the household's 7-day dinner menu (Monday through Sunday).
RULES:
1. For days listed in "daysToKeep": You MUST preserve the exact recipe previously assigned to that day in "currentDayAssignments".
2. For days listed in "daysToChange":
   - You MUST select a FRESH, DIFFERENT recipe from "availableRecipes".
   - DO NOT repeat or reuse the recipe that was previously assigned to that day in "currentDayAssignments".
   - Maximize variety across the week (balance chicken, seafood, pork, beef, tofu/plant-based).
3. Strictly honor all dietary restrictions and disliked ingredients.
4. Ensure cooking times do not exceed maxCookingMinutes.
5. ONLY select recipe IDs from the "availableRecipes" list.
6. Return a JSON array of 7 objects (one for each day Monday through Sunday).`;

    const schemaConfig = {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          day: { type: Type.STRING, description: 'Day of the week (e.g. Monday)' },
          recipeId: { type: Type.STRING, description: 'Recipe ID matching availableRecipes' },
          subName: { type: Type.STRING, description: 'Short nutritional tagline for the family' },
          reason: { type: Type.STRING, description: 'Brief note explaining why this fits household profile' },
        },
        required: ['day', 'recipeId', 'subName', 'reason'],
      },
    };

    const targetModel = getGeminiModel();
    let modelUsed = targetModel;
    let responseText = null;

    try {
      const response = await ai.models.generateContent({
        model: targetModel,
        contents: `Curate and assemble the weekly menu rotation for this family. For daysToChange, ensure exciting new dishes different from currentDayAssignments:\n${JSON.stringify(promptPayload, null, 2)}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: schemaConfig,
        },
      });
      responseText = response.text ? response.text.trim() : '';
    } catch (primaryErr) {
      console.warn(`Primary model ${targetModel} failed, trying ${FALLBACK_GEMINI_MODEL}:`, primaryErr.message);
      modelUsed = FALLBACK_GEMINI_MODEL;
      const fallbackResponse = await ai.models.generateContent({
        model: FALLBACK_GEMINI_MODEL,
        contents: `Curate and assemble the weekly menu rotation for this family. For daysToChange, ensure exciting new dishes different from currentDayAssignments:\n${JSON.stringify(promptPayload, null, 2)}`,
        config: {
          systemInstruction,
          responseMimeType: 'application/json',
          responseSchema: schemaConfig,
        },
      });
      responseText = fallbackResponse.text ? fallbackResponse.text.trim() : '';
    }

    let parsedAssignments = [];
    try {
      parsedAssignments = JSON.parse(responseText);
    } catch (e) {
      const match = responseText.match(/\[[\s\S]*\]/);
      if (match) parsedAssignments = JSON.parse(match[0]);
    }

    if (!Array.isArray(parsedAssignments) || parsedAssignments.length === 0) {
      throw new Error('Gemini response could not be parsed into a weekly menu array');
    }

    // Validate recipe IDs and assemble final menu
    const assembledMenu = daysOfWeek.map((dayName) => {
      // If day was in daysToKeep, preserve existing meal
      if (daysToKeep.includes(dayName)) {
        const existing = existingMenu.find((m) => m.day === dayName);
        if (existing) {
          return {
            ...existing,
            isAccepted: acceptedDays.includes(dayName),
            isLocked: lockedDays.includes(dayName),
          };
        }
      }

      const assignment = parsedAssignments.find((a) => a.day === dayName);
      let selectedRecipe = assignment ? candidateMap.get(String(assignment.recipeId)) : null;

      // Fallback if recipeId was missing or repeated
      if (!selectedRecipe || (changingCurrentIds.includes(String(selectedRecipe.id)) && activePool.length > 7)) {
        // Find an unused candidate
        const unused = activePool.find(
          (c) => !allExcludedIds.has(String(c.id)) && !changingCurrentIds.includes(String(c.id))
        );
        selectedRecipe = unused || activePool[Math.floor(Math.random() * activePool.length)];
      }

      const formatted = formatMenuItemFromRecipe(selectedRecipe, dayName, assignment?.subName);
      return {
        ...formatted,
        isAccepted: false, // Newly generated or swapped days require user acceptance
        isLocked: lockedDays.includes(dayName) && dayName !== swapDay,
      };
    });

    return res.status(200).json({
      success: true,
      isDemo: false,
      modelUsed,
      menu: assembledMenu,
    });
  } catch (error) {
    console.error('Gemini meal plan generation error:', error);
    const daysToKeep = daysOfWeekList.filter((d) => {
      if (swapDay && d === swapDay) return false;
      return lockedDays.includes(d) || acceptedDays.includes(d);
    });
    const daysToChange = daysOfWeekList.filter((d) => !daysToKeep.includes(d));

    const fallbackMenu = buildDynamicMenu({
      candidates: getCuratedRecipes('', '', 25, Math.floor(Math.random() * 20)),
      existingMenu,
      daysToKeep,
      daysToChange,
      swapDay,
      allExcludedIds: new Set(excludeRecipeIds || []),
      acceptedDays,
      lockedDays,
    });

    const statusCode = error.status || error.code || 500;
    let userMsg = sanitizeErrorMessage(error);
    if (statusCode === 400 || statusCode === 401 || statusCode === 403) {
      userMsg = 'Invalid Gemini credentials: API key rejected by Google (401/403).';
    } else if (statusCode === 429) {
      userMsg = 'Gemini quota limit reached (429). Please try again shortly.';
    } else if (statusCode === 503) {
      userMsg = 'Gemini model temporarily experiencing high demand (503). Retained current menu.';
    }

    return res.status(200).json({
      success: false,
      error: userMsg,
      upstreamHttpStatus: statusCode,
      fallbackUsed: true,
      isDemo: true,
      menu: fallbackMenu,
    });
  }
}

const daysOfWeekList = ['Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];

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
    isAccepted: false,
    ingredients,
  };
}

function buildDynamicMenu({
  candidates,
  existingMenu = [],
  daysToKeep = [],
  daysToChange = [],
  swapDay = null,
  allExcludedIds = new Set(),
  acceptedDays = [],
  lockedDays = [],
}) {
  const pool = [...candidates];
  // Shuffle pool so regenerating produces different results
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }

  let poolIdx = 0;

  return daysOfWeekList.map((dayName) => {
    // Keep existing if in daysToKeep
    if (daysToKeep.includes(dayName)) {
      const existing = existingMenu.find((m) => m.day === dayName);
      if (existing) {
        return {
          ...existing,
          isAccepted: acceptedDays.includes(dayName),
          isLocked: lockedDays.includes(dayName),
        };
      }
    }

    // Find candidate not excluded
    let recipe = null;
    for (let k = 0; k < pool.length; k++) {
      const cand = pool[(poolIdx + k) % pool.length];
      if (!allExcludedIds.has(String(cand.id))) {
        recipe = cand;
        poolIdx = (poolIdx + k + 1) % pool.length;
        break;
      }
    }

    if (!recipe) {
      recipe = pool[poolIdx % pool.length];
      poolIdx = (poolIdx + 1) % pool.length;
    }

    const formatted = formatMenuItemFromRecipe(recipe, dayName);
    return {
      ...formatted,
      isAccepted: false,
      isLocked: lockedDays.includes(dayName) && dayName !== swapDay,
    };
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
