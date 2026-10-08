/**
 * /api/fix-deficiency.js
 * Dedicated endpoint for NutriBalance MCP fix_deficiency tool.
 */

import nutribalanceHandler from './nutribalance.js';

export default async function handler(req, res) {
  req.body = { ...req.body, action: 'fix_deficiency' };
  return nutribalanceHandler(req, res);
}
