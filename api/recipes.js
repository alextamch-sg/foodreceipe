/**
 * /api/recipes.js
 * Spoonacular recipe search and recipe details endpoint.
 * Compatible with Vercel and Node HTTP.
 */

import {
  searchSpoonacularRecipes,
  getSpoonacularRecipeInformation,
  generateRecipesWithGemini,
  getRecipeDetailsWithGemini,
  getCuratedRecipes,
  sanitizeErrorMessage,
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

  // Parse query parameters
  const url = new URL(req.url, `http://${req.headers.host || 'localhost'}`);
  const searchParams = url.searchParams;

  const id = searchParams.get('id');
  const query = searchParams.get('query') || '';
  const cuisine = searchParams.get('cuisine') || '';
  const number = parseInt(searchParams.get('number') || '10', 10);

  try {
    // If requesting specific recipe details by ID
    if (id) {
      const result = await getSpoonacularRecipeInformation({ id });
      return res.status(200).json({
        success: true,
        ...result,
      });
    }

    // Otherwise, perform recipe search
    const searchResult = await searchSpoonacularRecipes({
      query,
      cuisine,
      number: Math.min(Math.max(number, 1), 20),
    });

    return res.status(200).json({
      success: true,
      ...searchResult,
    });
  } catch (error) {
    const sanitized = sanitizeErrorMessage(error);
    console.warn(`Spoonacular unavailable or limit reached: ${sanitized}. Utilizing Gemini AI to complete recipe task.`);

    try {
      if (id) {
        const geminiRecipe = await getRecipeDetailsWithGemini(id);
        return res.status(200).json({
          success: true,
          source: 'gemini',
          spoonacularQuotaExceeded: true,
          recipe: geminiRecipe,
        });
      }

      const geminiResults = await generateRecipesWithGemini({
        query,
        cuisine,
        number: Math.min(Math.max(number, 1), 20),
      });

      return res.status(200).json({
        success: true,
        source: 'gemini',
        spoonacularQuotaExceeded: true,
        message: 'Spoonacular usage limit reached. Curated fresh recipes using Gemini AI.',
        results: geminiResults,
      });
    } catch (fallbackError) {
      return res.status(200).json({
        success: true,
        source: 'curated',
        results: getCuratedRecipes(query, cuisine, number),
      });
    }
  }
}
