/**
 * /api/nutrition-score.js
 * Dedicated endpoint for NutriBalance MCP nutrition_score tool.
 */

import nutribalanceHandler from './nutribalance.js';

export default async function handler(req, res) {
  req.body = { ...req.body, action: 'nutrition_score' };
  return nutribalanceHandler(req, res);
}
