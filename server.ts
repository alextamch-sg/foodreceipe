import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import healthHandler from './api/health.js';
import recipesHandler from './api/recipes.js';
import mealPlanHandler from './api/meal-plan.js';
import mcpHandler from './api/mcp.js';
import nutribalanceHandler from './api/nutribalance.js';
import calculateTdeeHandler from './api/calculate-tdee.js';
import lookupNutritionHandler from './api/lookup-nutrition.js';
import fixDeficiencyHandler from './api/fix-deficiency.js';
import nutritionScoreHandler from './api/nutrition-score.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = 3000;

app.use(express.json());

// API route handlers
app.all(['/api/health', '/api/health.js'], async (req, res) => {
  try {
    await healthHandler(req, res);
  } catch (err: any) {
    console.error('API health error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal API Error' });
    }
  }
});

app.all(['/api/recipes', '/api/recipes.js'], async (req, res) => {
  try {
    await recipesHandler(req, res);
  } catch (err: any) {
    console.error('API recipes error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal API Error' });
    }
  }
});

app.all(['/api/meal-plan', '/api/meal-plan.js'], async (req, res) => {
  try {
    await mealPlanHandler(req, res);
  } catch (err: any) {
    console.error('API meal-plan error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal API Error' });
    }
  }
});

// NutriBalance MCP connection check endpoint
app.all(['/api/mcp', '/api/mcp.js'], async (req, res) => {
  try {
    await mcpHandler(req, res);
  } catch (err: any) {
    console.error('API mcp error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal API Error' });
    }
  }
});

// NutriBalance unified data pull endpoint
app.all(['/api/nutribalance', '/api/nutribalance.js'], async (req, res) => {
  try {
    await nutribalanceHandler(req, res);
  } catch (err: any) {
    console.error('API nutribalance error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal API Error' });
    }
  }
});

// NutriBalance specialized endpoints
app.all(['/api/calculate-tdee', '/api/calculate-tdee.js', '/api/tdee', '/api/tdee.js'], async (req, res) => {
  try {
    await calculateTdeeHandler(req, res);
  } catch (err: any) {
    console.error('API calculate-tdee error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal API Error' });
    }
  }
});

app.all(['/api/lookup-nutrition', '/api/lookup-nutrition.js', '/api/nutrition', '/api/nutrition.js'], async (req, res) => {
  try {
    await lookupNutritionHandler(req, res);
  } catch (err: any) {
    console.error('API lookup-nutrition error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal API Error' });
    }
  }
});

app.all(['/api/fix-deficiency', '/api/fix-deficiency.js', '/api/deficiency', '/api/deficiency.js'], async (req, res) => {
  try {
    await fixDeficiencyHandler(req, res);
  } catch (err: any) {
    console.error('API fix-deficiency error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal API Error' });
    }
  }
});

app.all(['/api/nutrition-score', '/api/nutrition-score.js', '/api/score', '/api/score.js'], async (req, res) => {
  try {
    await nutritionScoreHandler(req, res);
  } catch (err: any) {
    console.error('API nutrition-score error:', err);
    if (!res.headersSent) {
      res.status(500).json({ error: err.message || 'Internal API Error' });
    }
  }
});

// Serve frontend: Vite middleware in dev, static files in prod
if (process.env.NODE_ENV === 'production') {
  app.use(express.static(path.resolve(__dirname, 'dist')));
  app.get('*', (_req, res) => {
    res.sendFile(path.resolve(__dirname, 'dist', 'index.html'));
  });
} else {
  const { createServer } = await import('vite');
  const vite = await createServer({
    server: {
      middlewareMode: true,
      host: '0.0.0.0',
      port: PORT,
      hmr: process.env.DISABLE_HMR !== 'true',
      watch: process.env.DISABLE_HMR === 'true' ? null : {},
    },
    appType: 'spa',
  });
  app.use(vite.middlewares);
}

app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server listening on http://0.0.0.0:${PORT}`);
});
