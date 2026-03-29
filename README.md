# FounderOS

One idea. A scored plan, a founding team, real deliverables, and a running MVP — in minutes.

Type a startup idea. FounderOS scores it, spins up specialized AI agents to plan the venture, builds a founding team, puts each member to work on real deliverables, then generates and serves an actual web app you can open in your browser.

Built for HackPSU 2026. Powered by [OpenClaw](https://github.com/openclaw/openclaw) + Gemini 2.5 Pro.

---

## Stack

| Layer | Tech |
|-------|------|
| Frontend | React (CRA) |
| Backend | Node.js / Express |
| AI Orchestration | OpenClaw (Docker) |
| Model | Google Gemini 2.5 Pro |

---

## Prerequisites

- [Node.js](https://nodejs.org/) 18+
- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- A [Gemini API key](https://aistudio.google.com/app/apikey)

---

## Setup

**1. Clone the repo**
```bash
git clone <repo-url>
cd hackpsu26
```

**2. Run the OpenClaw setup script** (from repo root)
```bash
node openclaw-setup/setup.js
```
Enter your Gemini API key when prompted. This creates all config files, agent workspaces, SOUL prompts, and Docker env.

**3. Start OpenClaw**
```bash
cd openclaw
docker compose up -d
```
Docker pulls `ghcr.io/openclaw/openclaw:latest` automatically on first run.

Verify:
```bash
curl http://localhost:18789/healthz
```

**4. Start the backend**
```bash
cd ../backend
npm install
npm start
# Runs on http://localhost:3001
```

**5. Start the frontend**
```bash
cd ../frontend
npm install
npm start
# Opens http://localhost:3000
```

> **If you re-run setup** (e.g. after a git pull that adds new agents), also copy the updated docker-compose:
> ```powershell
> Copy-Item openclaw-setup\docker-compose.yml openclaw\docker-compose.yml
> ```
> Then restart Docker: `docker compose down && docker compose up -d`

---

## How it works

### Phase 1 — Plan + Score
Six planning agents run sequentially and stream results to the dashboard as they finish:
- **Idea** — extracts problem, users, domain, core goal. Also scores the idea across 4 dimensions (see Scoring below).
- **Product** — features, user flow, tech stack, MVP scope
- **Market** — competitors, realistic market size, gap, differentiation
- **Business** — pricing, revenue model, cost structure, honest break-even
- **Brand** — name, tagline, tone, colors
- **Pitch** — one-liner, 30s pitch, why now, realistic funding ask

All estimates are grounded in a bootstrapped solo founder with no funding. No vanity numbers.

Approve or redirect each agent with feedback before moving on.

### Phase 2 — Team
The Team Generator builds a founding team tailored to the venture. Each member gets a role, responsibilities, skills, and a Week 1 task.

- Approve or remove any member
- Add a custom role by typing what you need (e.g. "UX Designer", "Sales Lead")
- All team members must be approved before execution begins

### Phase 3 — Execute
Click **Execute Team →**. Each worker:
1. Gets assigned one concrete Week 1 task via the task generator
2. Executes it — producing real output (actual code, specs, copy, analysis)
3. Submits a report with their deliverable, key decisions, and next step

All tasks are pre-launch safe — no "acquire users" or "run campaigns". Every deliverable is something that can be written from scratch right now.

Review and approve each report in the **Reports** panel. Redirect any worker with feedback for a revision.

### Phase 4 — Build
Click **Build & Run MVP →**. The Builder agent synthesizes all the team's work into a complete interactive web app (Tailwind CSS, vanilla JS, localStorage). The backend writes and serves it locally.

Click **Open [AppName] →** to open the running MVP in your browser.

### Save & Resume
Click **Save run** in the sidebar at any point to snapshot the full session to localStorage. Past runs appear on the landing page — load any of them to resume exactly where you left off. No API calls, no credits used.

---

## Idea Scoring

When the Idea agent runs, it scores the startup across 4 dimensions and computes an overall score server-side using a weighted formula.

### Formula

```
S = (M × 0.30) + (D × 0.25) + (R × 0.25) + (E × 0.20) − P
```

| Symbol | Dimension | Weight | What it measures |
|--------|-----------|--------|-----------------|
| M | Market opportunity | 30% | Realistic size, growth rate, timing for this specific idea |
| D | Differentiation | 25% | Uniqueness vs existing well-funded competitors |
| R | Revenue clarity | 25% | How obvious and direct the path to getting paid is |
| E | Execution feasibility | 20% | Can a solo founder realistically build this in 6 months |
| P | Penalties | deducted | Flat point deductions for structural risk factors |

### Penalties (flat deductions)

| Flag | Deduction | Condition |
|------|-----------|-----------|
| Saturated market | −8 | 3+ dominant well-funded incumbents exist |
| High tech risk | −5 | Stack is unproven, experimental, or very hard to build |
| No monetization | −10 | No clear way to charge users or businesses |
| Regulatory risk | −7 | Heavily regulated industry (healthcare, finance, legal) |

### Verdict thresholds

| Score | Verdict |
|-------|---------|
| 88–100 | Exceptional |
| 75–87 | Strong idea |
| 65–74 | Promising |
| 50–64 | Needs work |
| 0–49 | Weak idea |

Scores are calibrated for a bootstrapped solo founder. An average idea scores 55–65. 85+ is reserved for genuinely novel ideas with clear monetization and low competition.

The score card on the Idea tab shows: overall score, verdict, a plain-English reason, per-dimension bar chart with agent notes, active penalty flags, and the single biggest risk.

---

## Project structure

```
hackpsu26/
├── frontend/
│   └── src/
│       ├── App.js             # All React components and state
│       └── App.css            # Apple-style light theme design system
├── backend/
│   ├── server.js              # Express API + SSE streaming
│   ├── scoreCalc.js           # Score formula, verdict, verdict reason
│   └── previews/              # Generated MVP HTML files (gitignored)
├── openclaw-setup/            # Committed config templates
│   ├── setup.js               # Run once to configure OpenClaw
│   ├── souls/                 # SOUL.md prompts for all agents
│   └── docker-compose.yml     # Docker config (hardcoded image)
└── openclaw/                  # Generated by setup.js (gitignored)
```

---

## Agents

| Agent | Phase | Role |
|-------|-------|------|
| `idea-parser` | Plan | Extracts problem, users, domain, core goal — and scores the idea |
| `product` | Plan | Defines features, user flow, tech stack, MVP scope |
| `market` | Plan | Maps competitors, realistic market size, gap, differentiation |
| `business` | Plan | Designs pricing, revenue model, cost structure, honest break-even |
| `brand` | Plan | Names the startup, tagline, tone, colors |
| `pitch` | Plan | Writes the one-liner, 30s pitch, realistic funding ask |
| `team-gen` | Team | Builds the founding team with roles and week-1 tasks |
| `task-gen` | Execute | Assigns one concrete Week 1 task per team member |
| `worker` | Execute | Executes the task — produces real code, copy, or specs |
| `builder` | Build | Synthesizes all work into a runnable HTML MVP |

---

## Design notes

- Light theme throughout — Apple-style design system via CSS custom properties
- SSE streaming — each agent result appears as it finishes, no waiting for all agents
- Navigation does not auto-jump while agents stream — you stay on whatever tab you're reading
- All agent prompts are grounded in bootstrapped, pre-launch reality — no "secure 20 users" tasks, no $10B TAM claims
- Score is computed server-side from raw model output — the math is always consistent regardless of model behavior
