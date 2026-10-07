/**
 * /api/health.js
 * Comprehensive diagnostic health check for Gemini and Spoonacular APIs.
 * Separately inspects authentication, model discovery, generation readiness,
 * and upstream HTTP status codes.
 * Compatible with Vercel serverless functions and Express/Node.
 */

import { GoogleGenAI } from '@google/genai';
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
        upstreamHttpStatus: null,
        responseTimeMs: null,
        error: null,
      },
      gemini: {
        status: 'not_configured',
        upstreamHttpStatus: null,
        responseTimeMs: null,
        authVerified: false,
        generationVerified: false,
        error: null,
        model: 'gemini-3.1-flash-lite',
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
      const spoonRes = await fetchWithTimeout(spoonUrl, {}, 6000);
      results.providers.spoonacular.responseTimeMs = Date.now() - spoonStart;
      results.providers.spoonacular.upstreamHttpStatus = spoonRes.status;

      if (spoonRes.ok) {
        results.providers.spoonacular.status = 'ok';
      } else {
        results.providers.spoonacular.status = 'error';
        if (spoonRes.status === 401 || spoonRes.status === 403) {
          results.providers.spoonacular.error = 'Invalid Spoonacular API key or unauthorized (401/403)';
        } else if (spoonRes.status === 402) {
          results.providers.spoonacular.error = 'Spoonacular daily API request quota exceeded (402)';
        } else if (spoonRes.status === 429) {
          results.providers.spoonacular.error = 'Spoonacular rate limit exceeded (429)';
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

      // Phase A: Test authentication by listing available models
      let modelsListed = false;
      try {
        const modelList = await ai.models.list();
        let count = 0;
        for await (const _ of modelList) {
          count++;
          if (count >= 1) {
            modelsListed = true;
            break;
          }
        }
      } catch (authErr) {
        const authStatus = authErr.status || authErr.code || 401;
        results.providers.gemini.upstreamHttpStatus = authStatus;
        results.providers.gemini.status = 'error';
        results.providers.gemini.authVerified = false;

        if (authStatus === 400 || authStatus === 401 || authStatus === 403) {
          results.providers.gemini.error = 'Invalid credentials: GEMINI_API_KEY was rejected by Google API (401/403)';
        } else if (authStatus === 429) {
          results.providers.gemini.error = 'Quota limit reached during auth check (429).';
        } else {
          results.providers.gemini.error = `Authentication check failed: ${sanitizeErrorMessage(authErr)}`;
        }
        throw authErr;
      }

      if (modelsListed) {
        results.providers.gemini.authVerified = true;
      }

      // Phase B: Test generation capability with lightweight ping
      // We test gemini-3.1-flash-lite as the reliable low-latency probe
      try {
        const genRes = await ai.models.generateContent({
          model: 'gemini-3.1-flash-lite',
          contents: 'Say hi in one word',
        });

        if (genRes.text) {
          results.providers.gemini.generationVerified = true;
          results.providers.gemini.status = 'ok';
          results.providers.gemini.upstreamHttpStatus = 200;
          results.providers.gemini.responseTimeMs = Date.now() - geminiStart;
        } else {
          throw new Error('Empty generation response');
        }
      } catch (genErr) {
        results.providers.gemini.responseTimeMs = Date.now() - geminiStart;
        results.providers.gemini.generationVerified = false;
        const errStatus = genErr.status || genErr.code || (genErr.message?.includes('503') ? 503 : 500);
        results.providers.gemini.upstreamHttpStatus = errStatus;

        if (errStatus === 503) {
          // Model high demand spike, but key is 100% authenticated
          results.providers.gemini.status = 'degraded';
          results.providers.gemini.error = 'Authentication verified. Model generation temporarily busy (503 high demand spike).';
        } else if (errStatus === 429) {
          results.providers.gemini.status = 'error';
          results.providers.gemini.error = 'Quota limit reached: Rate limit or daily quota exceeded (429).';
        } else if (errStatus === 404) {
          results.providers.gemini.status = 'error';
          results.providers.gemini.error = 'Configured model not found or unsupported (404).';
        } else {
          results.providers.gemini.status = 'error';
          results.providers.gemini.error = `Generation check failed (${errStatus}): ${sanitizeErrorMessage(genErr)}`;
        }
      }
    } catch (err) {
      // Caught during Phase A auth
      results.providers.gemini.responseTimeMs = Date.now() - geminiStart;
    }
  }

  // 3. Determine Overall System Status
  const isSpoonOk = results.providers.spoonacular.status === 'ok';
  const isGeminiOk = results.providers.gemini.status === 'ok';
  const isGeminiDegraded = results.providers.gemini.status === 'degraded';

  if (isSpoonOk && isGeminiOk) {
    results.status = 'healthy';
    return res.status(200).json(results);
  } else if (isGeminiOk || (isGeminiDegraded && results.providers.gemini.authVerified)) {
    // If Gemini is authenticated, return informative status
    results.status = isSpoonOk ? 'healthy' : 'unhealthy';
    return res.status(isSpoonOk ? 200 : 503).json(results);
  } else {
    results.status = 'unhealthy';
    return res.status(503).json(results);
  }
}
