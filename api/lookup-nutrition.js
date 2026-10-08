/**
 * /api/lookup-nutrition.js
 * Dedicated endpoint for NutriBalance MCP lookup_nutrition tool.
 */

import nutribalanceHandler from './nutribalance.js';

export default async function handler(req, res) {
  req.body = { ...req.body, action: 'lookup_nutrition' };
  return nutribalanceHandler(req, res);
}
