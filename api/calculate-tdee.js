/**
 * /api/calculate-tdee.js
 * Dedicated endpoint for NutriBalance MCP calculate_tdee tool.
 */

import nutribalanceHandler from './nutribalance.js';

export default async function handler(req, res) {
  // Ensure req.query / body has action set to calculate_tdee
  req.body = { ...req.body, action: 'calculate_tdee' };
  return nutribalanceHandler(req, res);
}
