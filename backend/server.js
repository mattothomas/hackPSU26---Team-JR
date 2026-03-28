const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const OPENCLAW_URL = process.env.OPENCLAW_URL || "http://localhost:18789";

// Health check — test this first
app.get("/health", async (req, res) => {
  try {
    const r = await fetch(`${OPENCLAW_URL}/healthz`);
    const txt = await r.text();
    res.json({ backend: "ok", openclaw: txt.trim() });
  } catch (e) {
    res.status(500).json({ backend: "ok", openclaw: "unreachable", error: e.message });
  }
});

// Main generate endpoint — called by your React frontend
app.post("/generate", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt required" });

  try {
    // Step 1: Idea parser
    const idea = await callOpenClaw(`
      You are an idea parser. Given this startup idea: "${prompt}"
      Return ONLY valid JSON, no explanation:
      {
        "problem": "...",
        "target_users": "...",
        "domain": "...",
        "core_goal": "..."
      }
    `);

    // Step 2: Run all agents in parallel using parsed idea as context
    const context = `Startup idea: ${prompt}\nParsed: ${JSON.stringify(idea)}`;

    const [product, market, business, brand, pitch] = await Promise.all([
      callOpenClaw(`${context}\nYou are the Product agent. Return ONLY JSON:
        { "features": ["...", "..."], "user_flow": "...", "tech_stack": "...", "status": "MVP defined. Awaiting your approval." }`),

      callOpenClaw(`${context}\nYou are the Market agent. Return ONLY JSON:
        { "competitors": ["...", "..."], "market_gap": "...", "differentiation": "...", "status": "Market analysis complete. Awaiting your approval." }`),

      callOpenClaw(`${context}\nYou are the Business agent. Return ONLY JSON:
        { "pricing": "...", "revenue_model": "...", "cost_structure": "...", "status": "Business model drafted. Awaiting your approval." }`),

      callOpenClaw(`${context}\nYou are the Brand agent. Return ONLY JSON:
        { "startup_name": "...", "tagline": "...", "tone": "...", "status": "Brand identity created. Awaiting your approval." }`),

      callOpenClaw(`${context}\nYou are the Pitch agent. Return ONLY JSON:
        { "one_liner": "...", "pitch_30s": "...", "why_now": "...", "status": "Pitch ready. Awaiting your approval." }`),
    ]);

    // Step 3: Team generator reads ALL agent outputs
    const team = await callOpenClaw(`
      ${context}
      Product: ${JSON.stringify(product)}
      Business: ${JSON.stringify(business)}
      You are the Team generator. Return ONLY JSON:
      {
        "team": [
          { "role": "...", "responsibilities": ["...", "..."], "skills": ["...", "..."], "status": "Ready to start. Awaiting your approval." }
        ]
      }
    `);

    res.json({ idea, product, market, business, brand, pitch, team });

  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Re-run a single agent with founder feedback
app.post("/redirect", async (req, res) => {
  const { agent, originalOutput, feedback, prompt } = req.body;
  if (!agent || !feedback) return res.status(400).json({ error: "agent and feedback required" });

  try {
    const result = await callOpenClaw(`
      Original startup idea: "${prompt}"
      You are the ${agent} agent.
      Your previous output was: ${JSON.stringify(originalOutput)}
      The founder gave this feedback: "${feedback}"
      Revise your output based on the feedback. Return ONLY valid JSON in the same format as before.
      Add a "status" field: "Revised based on your feedback. Awaiting approval."
    `);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// Helper — calls OpenClaw and parses JSON from response
async function callOpenClaw(prompt) {
  const r = await fetch(`${OPENCLAW_URL}/api/chat`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: prompt }),
  });

  if (!r.ok) throw new Error(`OpenClaw error: ${r.status}`);
  const data = await r.json();

  // Extract text from response (adjust based on actual OpenClaw response shape)
  const text = data.response || data.message || data.content || JSON.stringify(data);

  // Strip markdown code fences if present, then parse JSON
  const clean = text.replace(/```json|```/g, "").trim();
  try {
    return JSON.parse(clean);
  } catch {
    return { raw: text }; // fallback if not valid JSON
  }
}

app.listen(3001, () => console.log("Backend running on http://localhost:3001"));