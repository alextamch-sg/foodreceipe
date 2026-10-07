/**
 * /api/recipes.js
 * Spoonacular recipe search and recipe details endpoint.
 * Compatible with Vercel and Node HTTP.
 */

import {
  searchSpoonacularRecipes,
  getSpoonacularRecipeInformation,
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

    // Otherwise, perform complexSearch
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
    const isQuota = sanitized.toLowerCase().includes('quota');
    const isRate = sanitized.toLowerCase().includes('rate');

    return res.status(isQuota ? 402 : isRate ? 429 : 500).json({
      success: false,
      error: sanitized,
      isDemo: true,
      fallbackUsed: true,
    });
  }
}
