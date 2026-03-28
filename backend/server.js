require("dotenv").config();
const express = require("express");
const cors = require("cors");

const app = express();
app.use(cors());
app.use(express.json());

const OPENCLAW_URL = process.env.OPENCLAW_URL || "http://localhost:18789";
const OPENCLAW_TOKEN = process.env.OPENCLAW_GATEWAY_TOKEN || "";

app.get("/health", async (req, res) => {
  try {
    const r = await fetch(`${OPENCLAW_URL}/healthz`);
    const txt = await r.text();
    res.json({ backend: "ok", openclaw: txt.trim() });
  } catch (e) {
    res.status(500).json({ backend: "ok", openclaw: "unreachable", error: e.message });
  }
});

// Streaming generate — each agent result sent as it finishes
app.post("/generate", async (req, res) => {
  const { prompt } = req.body;
  if (!prompt) return res.status(400).json({ error: "prompt required" });

  res.setHeader("Content-Type", "text/event-stream");
  res.setHeader("Cache-Control", "no-cache");
  res.setHeader("Connection", "keep-alive");

  const send = (key, data) => res.write(`data: ${JSON.stringify({ key, data })}\n\n`);

  try {
    const idea = await callAgent("idea-parser", `
      You are the Idea Parser for a startup venture system.
      Startup idea: "${prompt}"
      Return ONLY valid JSON, no explanation, no markdown:
      {
        "problem": "one sentence describing the core problem",
        "target_users": "specific description of who this is for",
        "domain": "industry or domain",
        "core_goal": "what success looks like in one sentence"
      }
    `);
    send("idea", idea);

    const context = `Startup idea: "${prompt}"\nParsed context: ${JSON.stringify(idea)}`;

    const product = await callAgent("product", `
      You are the Product Agent for a startup venture system.
      ${context}
      Return ONLY valid JSON, no markdown:
      {
        "features": ["feature 1", "feature 2", "feature 3"],
        "user_flow": "numbered step-by-step of the core user journey",
        "tech_stack": "specific technologies recommended",
        "mvp_scope": "exactly what to build in the first 4 weeks",
        "status": "MVP defined. Awaiting your approval."
      }
    `);
    send("product", product);

    const market = await callAgent("market", `
      You are the Market Agent for a startup venture system.
      ${context}
      Return ONLY valid JSON, no markdown:
      {
        "competitors": ["real competitor 1", "real competitor 2", "real competitor 3"],
        "market_size": "specific estimated market size with source reasoning",
        "market_gap": "specific gap none of the competitors fill",
        "differentiation": "the one thing that makes this win",
        "status": "Market analysis complete. Awaiting your approval."
      }
    `);
    send("market", market);

    const business = await callAgent("business", `
      You are the Business Agent for a startup venture system.
      ${context}
      Return ONLY valid JSON, no markdown:
      {
        "pricing": "specific pricing tiers with dollar amounts",
        "revenue_model": "SaaS / marketplace / transactional / freemium / usage-based",
        "cost_structure": "top 3 costs with rough % of budget",
        "break_even": "estimated timeline to break even",
        "status": "Business model drafted. Awaiting your approval."
      }
    `);
    send("business", business);

    const brand = await callAgent("brand", `
      You are the Brand Agent for a startup venture system.
      ${context}
      Return ONLY valid JSON, no markdown:
      {
        "startup_name": "one original memorable name",
        "tagline": "under 8 words",
        "tone": "one word brand voice",
        "colors": ["#hexcode — color name", "#hexcode — color name"],
        "status": "Brand identity created. Awaiting your approval."
      }
    `);
    send("brand", brand);

    const pitch = await callAgent("pitch", `
      You are the Pitch Agent for a startup venture system.
      ${context}
      Return ONLY valid JSON, no markdown:
      {
        "one_liner": "under 15 words, hooks immediately",
        "pitch_30s": "3 sentences: problem, solution, why now",
        "why_now": "specific real-world trend making this timely",
        "ask": "specific dollar amount, what it funds, and timeline",
        "status": "Pitch ready. Awaiting your approval."
      }
    `);
    send("pitch", pitch);

    const team = await callAgent("team-gen", `
      You are the Team Generator for a startup venture system.
      ${context}
      Product plan: ${JSON.stringify(product)}
      Business model: ${JSON.stringify(business)}
      Return ONLY valid JSON, no markdown:
      {
        "team": [
          {
            "role": "specific role title",
            "responsibilities": ["concrete action 1", "concrete action 2"],
            "skills": ["specific skill or tech 1", "specific skill or tech 2"],
            "week1_task": "the single most important thing they do first",
            "status": "Ready to start. Awaiting your approval."
          }
        ]
      }
    `);
    send("team", team);

    res.write("data: [DONE]\n\n");
    res.end();
  } catch (e) {
    res.write(`data: ${JSON.stringify({ key: "error", data: e.message })}\n\n`);
    res.end();
  }
});

// Re-run a single agent with founder feedback
app.post("/redirect", async (req, res) => {
  const { agentId, agent, originalOutput, feedback, prompt } = req.body;
  if (!agent || !feedback) return res.status(400).json({ error: "agent and feedback required" });

  try {
    const result = await callAgent(agentId || "product", `
      Original startup idea: "${prompt}"
      You are the ${agent} for this startup.
      Your previous output was: ${JSON.stringify(originalOutput)}
      The founder reviewed your work and said: "${feedback}"
      Revise your output based on this feedback. Return ONLY valid JSON in the exact same format as before.
      Change the "status" field to: "Revised based on your feedback. Awaiting approval."
    `);
    res.json(result);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// Route to a specific named OpenClaw agent
async function callAgent(agentId, prompt, retries = 3) {
  for (let attempt = 1; attempt <= retries; attempt++) {
    const r = await fetch(`${OPENCLAW_URL}/v1/chat/completions`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${OPENCLAW_TOKEN}`,
      },
      body: JSON.stringify({
        model: `openclaw/${agentId}`,
        messages: [{ role: "user", content: prompt }],
      }),
    });

    if ((r.status === 429 || r.status === 503) && attempt < retries) {
      await sleep(4000 * attempt);
      continue;
    }

    if (!r.ok) {
      const errText = await r.text();
      throw new Error(`OpenClaw error ${r.status}: ${errText}`);
    }

    const data = await r.json();
    const text = data?.choices?.[0]?.message?.content ?? "";
    const clean = text.replace(/```json\s*/g, "").replace(/```\s*/g, "").trim();
    try {
      return JSON.parse(clean);
    } catch {
      return { raw: text };
    }
  }
}

app.listen(3001, () => console.log("Backend running on http://localhost:3001"));
