/**
 * /api/health.js
 * Checks whether Spoonacular and Gemini APIs are working using lightweight authenticated requests.
 * Compatible with Vercel serverless functions and Express/Node.
 */

import { GoogleGenAI } from '@google/genai';
import { fetchWithTimeout, sanitizeErrorMessage } from '../lib/api-client.js';

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

  const results = {
    status: 'unhealthy',
    timestamp: new Date().toISOString(),
    providers: {
      spoonacular: {
        status: 'not_configured',
        responseTimeMs: null,
        error: null,
      },
      gemini: {
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
          results.providers.spoonacular.error = 'Invalid Spoonacular API key or unauthorized';
        } else if (spoonRes.status === 402) {
          results.providers.spoonacular.error = 'Spoonacular API daily quota limit reached';
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

  // 2. Check Gemini API
  const geminiKey = process.env.GEMINI_API_KEY;
  if (!geminiKey) {
    results.providers.gemini.status = 'not_configured';
  } else {
    const geminiStart = Date.now();
    try {
      const ai = new GoogleGenAI({
        apiKey: geminiKey,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          },
        },
      });

      let timer;
      const timeoutPromise = new Promise((_, reject) => {
        timer = setTimeout(() => reject(new Error('Gemini health check timed out after 5000ms')), 5000);
      });

      const requestPromise = ai.models.generateContent({
        model: 'gemini-3.8-flash',
        contents: 'health_check_ping',
        config: {
          maxOutputTokens: 5,
        },
      });

      await Promise.race([requestPromise, timeoutPromise]);
      clearTimeout(timer);

      results.providers.gemini.responseTimeMs = Date.now() - geminiStart;
      results.providers.gemini.status = 'ok';
    } catch (err) {
      results.providers.gemini.responseTimeMs = Date.now() - geminiStart;
      results.providers.gemini.status = 'error';
      results.providers.gemini.error = sanitizeErrorMessage(err);
    }
  }

  // Determine overall status and HTTP response code
  const isSpoonOk = results.providers.spoonacular.status === 'ok';
  const isGeminiOk = results.providers.gemini.status === 'ok';

  if (isSpoonOk && isGeminiOk) {
    results.status = 'healthy';
    return res.status(200).json(results);
  } else {
    results.status = 'unhealthy';
    return res.status(503).json(results);
  }
}
