/**
 * /api/health.js
 * Checks whether Spoonacular and Claude APIs are working.
 * Compatible with Vercel serverless functions and Express/Node.
 */

import Anthropic from '@anthropic-ai/sdk';
import { fetchWithTimeout, sanitizeErrorMessage } from '../lib/api-client.js';

export default async function handler(req, res) {
  // Ensure res has standard helper methods if running in pure Node http
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

  const results = {
    status: 'unhealthy',
    timestamp: new Date().toISOString(),
    providers: {
      spoonacular: {
        status: 'not_configured',
        responseTimeMs: null,
        error: null,
      },
      claude: {
        status: 'not_configured',
        responseTimeMs: null,
        error: null,
      },
    },
  };

  // 1. Check Spoonacular API
  const spoonacularKey = process.env.SPOONACULAR_API_KEY;
  if (!spoonacularKey) {
    results.providers.spoonacular.status = 'not_configured';
  } else {
    const spoonStart = Date.now();
    try {
      const spoonUrl = `https://api.spoonacular.com/recipes/complexSearch?number=1&apiKey=${encodeURIComponent(spoonacularKey)}`;
      const spoonRes = await fetchWithTimeout(spoonUrl, {}, 5000);
      results.providers.spoonacular.responseTimeMs = Date.now() - spoonStart;

      if (spoonRes.ok) {
        results.providers.spoonacular.status = 'ok';
      } else {
        results.providers.spoonacular.status = 'error';
        if (spoonRes.status === 401 || spoonRes.status === 403) {
          results.providers.spoonacular.error = 'Invalid API key or unauthorized';
        } else if (spoonRes.status === 402) {
          results.providers.spoonacular.error = 'API daily quota limit reached';
        } else {
          results.providers.spoonacular.error = `HTTP ${spoonRes.status}: ${spoonRes.statusText}`;
        }
      }
    } catch (err) {
      results.providers.spoonacular.responseTimeMs = Date.now() - spoonStart;
      results.providers.spoonacular.status = 'error';
      results.providers.spoonacular.error = sanitizeErrorMessage(err);
    }
  }

  // 2. Check Claude / Anthropic API
  const anthropicKey = process.env.ANTHROPIC_API_KEY;
  const anthropicModel = process.env.ANTHROPIC_MODEL || 'claude-3-5-haiku-20241022';

  if (!anthropicKey) {
    results.providers.claude.status = 'not_configured';
  } else {
    const claudeStart = Date.now();
    try {
      const anthropic = new Anthropic({
        apiKey: anthropicKey,
        timeout: 5000,
      });

      // Lightweight test request
      await anthropic.messages.create({
        model: anthropicModel,
        max_tokens: 1,
        messages: [{ role: 'user', content: 'health_check' }],
      });

      results.providers.claude.responseTimeMs = Date.now() - claudeStart;
      results.providers.claude.status = 'ok';
    } catch (err) {
      results.providers.claude.responseTimeMs = Date.now() - claudeStart;
      results.providers.claude.status = 'error';
      results.providers.claude.error = sanitizeErrorMessage(err);
    }
  }

  // Determine overall status and HTTP response code
  const isSpoonOk = results.providers.spoonacular.status === 'ok';
  const isClaudeOk = results.providers.claude.status === 'ok';

  if (isSpoonOk && isClaudeOk) {
    results.status = 'healthy';
    return res.status(200).json(results);
  } else {
    results.status = 'unhealthy';
    return res.status(503).json(results);
  }
}
