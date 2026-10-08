ROLE: You are a senior full-stack developer working in this existing Vite + React project.

GOAL: Build out the core screens of a family meal planning app that lets households coordinate dietary preferences, food allergies, and calorie targets across multiple family members.
1. Weekly Meal Plan Screen — a dashboard where the household reviews and votes on proposed dinners for the week. Each meal card shows the recipe name, estimated prep time, and per-serving macros (calories, protein, carbs, fat). The household can leave feedback on each meal via personal links (no accounts needed). Top-voted picks win and flow into the grocery list. Refresh plan suggestions on demand by calling the nutribalance-mcp tools (TDEE & personalised macros, meal plan generation for standard/vegetarian/vegan/keto/high-protein modes, and nutrient-deficiency guidance). 
2. Grocery List & Pantry Sync — once the weekly plan is locked, auto-generate a consolidated grocery list that deducts what's already in the household pantry (synced via Pantry Persona MCP: shopping lists, pantry inventory, expiration alerts, receipt processing). Include a one-tap "Order via Delivery Platform" action that hands the list to a connected food delivery platform, earning the platform's 2% referral revenue on each order.
3. Daily Cooking View — a stripped-down screen the family opens each day to see today's recipe, step-by-step instructions, and an ingredient checklist. This is the primary daily touchpoint described in the business model.
4. Subscription & Monetisation Hooks — wire up the subscription tiers (Individual at $9/month, Family at $19/month) with a simple gating mechanism (no payment processor yet, just a flag in state). Show contextual ad placements on free-tier screens to support the ad-revenue stream. Surface the "Achieve $30k/month by EOY" revenue goal as an internal admin metric on a hidden /admin route.
5. Agent Chef Integration — connect to Agent Chef MCP so that each week the AI agent proposes ten dinners, the household votes, and the agent builds the final grocery list minus pantry stock. The agent fills the cart; the user approves checkout.
Leave existing screens working.

OUTPUT: Write all new screens and supporting logic in the two shapes this toolchain needs.
(a) Vercel-ready files — any serverless API routes go in the project root under api/ as siblings of package.json, never inside src/. This is the form Vercel runs. Make sure package.json contains "type": "module", which Vercel requires for .js files in api/ outside a framework; otherwise name them .mjs.
(b) Express dev server — the same routes registered in server.ts at the project root (the file the preview runs via package.json scripts dev: tsx server.ts), importing the shared handler rather than duplicating logic. If this project has no server.ts, create one. This is the form the AI Studio preview runs. Neither form works in the other place, so both are needed.
All new React screens go in src/ following the existing project structure. Each screen should be a route in the app's router. Wire them into the existing navigation so the user can reach them without editing code. Read any secrets with process.env.* on the server side only. BEFORE any external fetch, check that the required env var exists and is non-empty; if missing, return 503 with a clear error message and do not call the upstream service. AFTER any fetch, check response.ok before reading the body, since upstream APIs may return empty bodies on auth errors. Set sensible Cache-Control headers on API responses.
In the footer of every screen, add the attribution line required by any data source licence used (e.g., MCP data providers), with the licence URL as a working link, and a note that this is an SMU course project not affiliated with or endorsed by the data provider.

GUARDRAILS: Never write the key into any file, any comment, or the README. Never create a variable whose name starts with VITE_. Never call MCP from browser code; every MCP call happens inside MCP/. Never print the key, or any part of it, in a response or a log. No new npm packages. No database, no login. Do not use any organisation name or logo in a way that suggests this app is official or endorsed.

CONTEXT: The app targets family meal planners who coordinate preferences, allergies, and calories for multiple household members, as well as commercial home-delivery meal providers, ad sponsors, and grocery merchants (supermarket chains and delivery platforms).
One MCP servers power the AI features:
• nutribalance-mcp — TDEE & macro calculation, food nutrition lookup, meal plan generation across dietary modes (standard, vegetarian, vegan, keto, high-protein), nutrient-deficiency fixes, daily eating score 0–100.
Customer segments: family meal planners coordinating for multiple members, commercial home-delivery meal providers, advertisement sponsors reaching that audience, and grocery merchants (supermarket chains, grocery delivery platforms) selling through the platform.
MCP accessible via https://mcp.smithery.ai/alextamch (originate from https://server.smithery.ai/NutriBalance/nutribalance-mcp)
Key channels: social media, ads on grocery delivery platforms, booths at supermarkets, parenting groups, and cooking communities. Exposure through supermarket apps and roadshows. Free one-week trial to generate a weekly meal plan, grocery list, and automate purchasing.
Cost budget: $120k–$165k total, broken into Ideation & Design ($10–15k), Development & MVP ($30–50k including calorie/food logging engine, AI & computer vision integration, protocol testing), Production & Scaling ($30–50k for SaaS middleware), and Year 1 Marketing ($50k+ for consumer acquisition via influencer B2C).
Revenue model: Family subscription $19/month (1k users = $19k MRR), Individual subscription $9/month (500 users = $4.5k MRR), 2% grocery/delivery platform referral ($100/week spend across 500 users = $4k/month), on-platform ad revenue ($1k/month). EOY target: $30k/month recurring.
Key resources: funds, technology (platforms for ideation, build, and hosting), manpower, and data (recipes, nutrient needs for different age groups).
Key partners: supermarkets, families, restaurants, dieticians, food delivery platforms.
ADDITIONAL REQUIREMENT: Existing Gemini and Spoonacular API Integration
The system already uses Gemini for AI-assisted meal planning and Spoonacular for recipes. Preserve and reuse these existing integrations alongside nutribalance-mcp.

Gemini API
Reuse the existing server-side Gemini client and installed @google/genai SDK. Do not install new packages.
Endpoint for Gemini: https://generativelanguage.googleapis.com
Read GEMINI_API_KEY and the existing GEMINI_MODEL configuration on the server only. Preserve the existing model configuration and fallback behaviour.
Use Gemini to coordinate the Agent Chef workflow: propose ten dinner candidates, explain how they fit household preferences, interpret household feedback, and assemble the final weekly plan.
Ground suggestions in recipes retrieved from Spoonacular and nutrition information returned by nutribalance-mcp. Do not invent recipe IDs or present AI-generated nutrition values as verified facts.
Apply household allergy restrictions when selecting meals and proposing substitutions.

Spoonacular Recipe API
Reuse the existing Spoonacular integration and read SPOONACULAR_API_KEY on the server only.
Endpoint for Spoonacular: https://api.spoonacular.com/recipes/complexSearch
Use Spoonacular for recipe search, recipe details, ingredients, serving quantities, preparation/cooking times, cooking instructions, and nutrition information where available.
Pass household dietary preferences, excluded ingredients, and cooking-time limits into supported search filters.
Populate the Weekly Meal Plan and Daily Cooking View with the retrieved recipe information.
Scale ingredient quantities to the selected household portions, consolidate matching ingredients, and deduct pantry stock when generating the grocery list.
Treat missing nutrition information as unavailable rather than displaying fabricated values.
Preserve recipe source links and include attribution required by the actual data-source licence or terms. Do not assume a licence.

Provider Responsibilities
Gemini: AI coordination, meal selection and explanations.
Spoonacular: recipe discovery, ingredients, instructions and available recipe nutrition.
nutribalance-mcp: personalised calorie/macro targets and the nutrition tools described above.