/**
 * /api/mcp.js
 * Checks and verifies the connection to the NutriBalance MCP server on Smithery:
 * https://server.smithery.ai/NutriBalance/nutribalance-mcp
 *
 * Compatible with Vercel serverless functions and Express/Node.
 */

export const DEFAULT_MCP_URL =
  process.env.NUTRIBALANCE_MCP_URL ||
  'https://server.smithery.ai/NutriBalance/nutribalance-mcp';

export const NUTRIBALANCE_TOOLS = [
  {
    name: 'calculate_tdee',
    description: 'Calculates Basal Metabolic Rate (BMR), Total Daily Energy Expenditure (TDEE), and personalized daily macronutrient targets (protein, carbs, fats) based on user biometrics and goals.',
    parameters: {
      type: 'object',
      properties: {
        age: { type: 'number', description: 'Age in years' },
        gender: { type: 'string', enum: ['male', 'female'], description: 'Biological sex' },
        weightKg: { type: 'number', description: 'Weight in kilograms' },
        heightCm: { type: 'number', description: 'Height in centimeters' },
        activityLevel: {
          type: 'string',
          enum: ['sedentary', 'light', 'moderate', 'active', 'very_active'],
          description: 'Activity level multiplier'
        },
        goal: {
          type: 'string',
          enum: ['lose_weight', 'maintain', 'gain_muscle'],
          description: 'Nutritional and fitness objective'
        }
      },
      required: ['age', 'gender', 'weightKg', 'heightCm']
    }
  },
  {
    name: 'lookup_nutrition',
    description: 'Retrieves complete nutritional and micronutrient profiles for foods and ingredients by name and serving size.',
    parameters: {
      type: 'object',
      properties: {
        query: { type: 'string', description: 'Food item, recipe, or ingredient name' },
        servingSize: { type: 'string', description: 'Serving portion (e.g., 100g, 1 cup, 1 breast)' }
      },
      required: ['query']
    }
  },
  {
    name: 'generate_meal_plan',
    description: 'Generates tailored daily or weekly meal plans optimized for macro and micronutrient balance.',
    parameters: {
      type: 'object',
      properties: {
        targetCalories: { type: 'number', description: 'Target daily caloric intake' },
        dietaryPreference: { type: 'string', description: 'Diet style (mediterranean, high_protein, balanced, keto, vegetarian)' },
        days: { type: 'number', description: 'Number of days to plan (1 to 7)' },
        mealsPerDay: { type: 'number', description: 'Number of meals per day (3 to 5)' }
      }
    }
  },
  {
    name: 'fix_deficiency',
    description: 'Analyzes dietary nutrient deficiencies and suggests food pairings and recipes to achieve complete nutritional balance.',
    parameters: {
      type: 'object',
      properties: {
        deficiencies: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of deficient nutrients (e.g., iron, vitamin_d, fiber, calcium, magnesium)'
        },
        dietaryPreference: { type: 'string', description: 'Dietary constraints' }
      },
      required: ['deficiencies']
    }
  },
  {
    name: 'nutrition_score',
    description: 'Scores daily nutrition quality (0-100) across 26 micro- and macronutrients.',
    parameters: {
      type: 'object',
      properties: {
        foods: {
          type: 'array',
          items: { type: 'string' },
          description: 'List of logged meals or ingredients consumed'
        }
      },
      required: ['foods']
    }
  }
];

export async function checkMcpConnection(customUrl = null, customToken = null) {
  const targetUrl = customUrl || DEFAULT_MCP_URL;
  const token =
    customToken ||
    process.env.SMITHERY_API_KEY ||
    process.env.NUTRIBALANCE_MCP_KEY ||
    process.env.MCP_TOKEN ||
    null;

  const startTime = Date.now();
  let httpStatus = null;
  let reachable = false;
  let authRequired = false;
  let authenticated = false;
  let error = null;
  let liveTools = null;
  let responseData = null;
  let rawBodyText = '';

  const headers = {
    'Accept': 'application/json, text/plain, */*',
    'User-Agent': 'HeirloomTable-MCP-Client/1.0',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  try {
    // 1. Send initial ping / probe to target MCP URL
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 7000);

    const pingRes = await fetch(targetUrl, {
      method: 'GET',
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);

    const latencyMs = Date.now() - startTime;
    httpStatus = pingRes.status;
    reachable = true;

    rawBodyText = await pingRes.text().catch(() => '');
    try {
      responseData = JSON.parse(rawBodyText);
    } catch {
      responseData = rawBodyText ? { text: rawBodyText.slice(0, 300) } : null;
    }

    // Inspect status codes
    if (httpStatus === 401) {
      authRequired = true;
      authenticated = false;
      error = responseData?.error_description || responseData?.error || 'Missing or invalid Authorization header for Smithery MCP server.';
    } else if (httpStatus >= 200 && httpStatus < 300) {
      authenticated = Boolean(token);
      authRequired = false;
    }

    // 2. If token is present and endpoint reachable, test JSON-RPC tools/list
    if (token && reachable && httpStatus !== 401) {
      try {
        const rpcController = new AbortController();
        const rpcTimeout = setTimeout(() => rpcController.abort(), 6000);

        const rpcRes = await fetch(targetUrl, {
          method: 'POST',
          headers: {
            ...headers,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            jsonrpc: '2.0',
            id: 1,
            method: 'tools/list',
            params: {},
          }),
          signal: rpcController.signal,
        });
        clearTimeout(rpcTimeout);

        if (rpcRes.ok) {
          const rpcData = await rpcRes.json();
          if (rpcData?.result?.tools) {
            liveTools = rpcData.result.tools;
            authenticated = true;
          }
        }
      } catch (rpcErr) {
        // Non-fatal probe error
      }
    }

    return {
      success: reachable,
      serverUrl: targetUrl,
      reachable,
      httpStatus,
      latencyMs,
      auth: {
        authRequired,
        authenticated,
        hasConfiguredToken: Boolean(token),
        tokenPrefix: token ? `${token.slice(0, 4)}...${token.slice(-3)}` : null,
        protectedResourceMetadata: 'https://server.smithery.ai/.well-known/oauth-protected-resource/NutriBalance/nutribalance-mcp',
      },
      toolsAvailable: liveTools || NUTRIBALANCE_TOOLS,
      liveToolsDetected: Boolean(liveTools),
      error,
      timestamp: new Date().toISOString(),
    };
  } catch (err) {
    const latencyMs = Date.now() - startTime;
    return {
      success: false,
      serverUrl: targetUrl,
      reachable: false,
      httpStatus: null,
      latencyMs,
      auth: {
        authRequired: false,
        authenticated: false,
        hasConfiguredToken: Boolean(token),
        protectedResourceMetadata: 'https://server.smithery.ai/.well-known/oauth-protected-resource/NutriBalance/nutribalance-mcp',
      },
      toolsAvailable: NUTRIBALANCE_TOOLS,
      liveToolsDetected: false,
      error: err.name === 'AbortError' ? 'Connection timed out after 7000ms' : err.message,
      timestamp: new Date().toISOString(),
    };
  }
}

export default async function handler(req, res) {
  // Ensure res helper methods exist
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

  // Handle CORS
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Authorization');

  if (req.method === 'OPTIONS') {
    return res.status(200).end();
  }

  try {
    const requestUrl = new URL(req.url, 'http://localhost');
    const customUrl = requestUrl.searchParams.get('serverUrl') || req.body?.serverUrl || null;
    const authHeader = req.headers?.authorization;
    let token = null;
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.replace(/^Bearer\s+/i, '').trim();
    } else if (requestUrl.searchParams.get('token')) {
      token = requestUrl.searchParams.get('token');
    } else if (requestUrl.searchParams.get('apiKey')) {
      token = requestUrl.searchParams.get('apiKey');
    } else if (req.body?.token) {
      token = req.body.token;
    }

    const checkResult = await checkMcpConnection(customUrl, token);

    const httpCode = checkResult.reachable ? 200 : 503;
    return res.status(httpCode).json({
      status: checkResult.reachable ? 'connected' : 'disconnected',
      server: 'NutriBalance MCP Server',
      endpoint: checkResult.serverUrl,
      ...checkResult,
    });
  } catch (error) {
    return res.status(500).json({
      status: 'error',
      server: 'NutriBalance MCP Server',
      error: error.message || 'Failed to check MCP server connection',
      timestamp: new Date().toISOString(),
    });
  }
}
