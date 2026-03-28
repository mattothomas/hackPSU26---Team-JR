/**
 * FounderOS – OpenClaw setup script
 * Run once: node openclaw-setup/setup.js
 * Requires GEMINI_API_KEY env var or prompts for it.
 */
const fs   = require("fs");
const path = require("path");
const readline = require("readline");

const root       = path.resolve(__dirname, "..");
const openclawDir = path.join(root, "openclaw");
const configDir  = path.join(openclawDir, ".openclaw-config");
const soulsDir   = path.join(__dirname, "souls");

const AGENTS = [
  "idea-parser",
  "product",
  "market",
  "business",
  "brand",
  "pitch",
  "team-gen",
];

async function getApiKey() {
  if (process.env.GEMINI_API_KEY) return process.env.GEMINI_API_KEY;
  const rl = readline.createInterface({ input: process.stdin, output: process.stdout });
  return new Promise(resolve => {
    rl.question("Enter your GEMINI_API_KEY: ", answer => {
      rl.close();
      resolve(answer.trim());
    });
  });
}

function mkdir(p) {
  fs.mkdirSync(p, { recursive: true });
}

async function main() {
  const apiKey = await getApiKey();
  if (!apiKey) { console.error("GEMINI_API_KEY is required."); process.exit(1); }

  // 1. Create directory structure
  mkdir(configDir);

  // 2. Write SOUL.md files for each agent
  for (const agent of AGENTS) {
    const workspaceDir = path.join(configDir, "workspaces", agent);
    const agentDir     = path.join(configDir, "agents", agent, "agent");
    mkdir(workspaceDir);
    mkdir(agentDir);
    const soulSrc  = path.join(soulsDir, `${agent}.md`);
    const soulDest = path.join(workspaceDir, "SOUL.md");
    fs.copyFileSync(soulSrc, soulDest);
    console.log(`  ✓ ${agent} SOUL.md`);
  }

  // 3. Write openclaw.json (with API key injected)
  const config = {
    gateway: {
      mode: "local",
      bind: "lan",
      auth: { token: "founderOS-secret-token-123" },
      http: { endpoints: { chatCompletions: { enabled: true } } },
      controlUi: { allowedOrigins: ["http://localhost:18789", "http://127.0.0.1:18789"] },
    },
    agents: {
      defaults: { model: "google/gemini-2.5-pro" },
      list: AGENTS.map(id => ({
        id,
        name: id.replace(/-/g, " ").replace(/\b\w/g, c => c.toUpperCase()),
        workspace: `/home/node/.openclaw/workspaces/${id}`,
        agentDir:  `/home/node/.openclaw/agents/${id}/agent`,
      })),
    },
    env: { GEMINI_API_KEY: apiKey },
  };

  fs.writeFileSync(
    path.join(configDir, "openclaw.json"),
    JSON.stringify(config, null, 2)
  );
  console.log("  ✓ openclaw.json");

  // 4. Write openclaw/.env
  const workspaceDir = path.join(configDir, "workspace");
  mkdir(workspaceDir);
  const envContent = [
    `OPENCLAW_CONFIG_DIR=${configDir.replace(/\\/g, "/")}`,
    `OPENCLAW_WORKSPACE_DIR=${workspaceDir.replace(/\\/g, "/")}`,
    `OPENCLAW_GATEWAY_BIND=lan`,
    `OPENCLAW_GATEWAY_TOKEN=founderOS-secret-token-123`,
    `GEMINI_API_KEY=${apiKey}`,
  ].join("\n") + "\n";

  fs.writeFileSync(path.join(openclawDir, ".env"), envContent);
  console.log("  ✓ openclaw/.env");

  // 5. Copy docker-compose if it doesn't exist yet
  const composeSrc  = path.join(__dirname, "docker-compose.yml");
  const composeDest = path.join(openclawDir, "docker-compose.yml");
  if (!fs.existsSync(composeDest)) {
    fs.copyFileSync(composeSrc, composeDest);
    console.log("  ✓ openclaw/docker-compose.yml");
  }

  // 6. Write backend/.env if missing
  const backendEnv = path.join(root, "backend", ".env");
  if (!fs.existsSync(backendEnv)) {
    fs.writeFileSync(backendEnv,
      "OPENCLAW_URL=http://localhost:18789\nOPENCLAW_GATEWAY_TOKEN=founderOS-secret-token-123\n"
    );
    console.log("  ✓ backend/.env");
  }

  console.log("\nDone! Now run:\n  cd openclaw && docker compose up -d\n  cd backend  && npm install && npm start\n  cd frontend && npm install && npm start");
}

main().catch(e => { console.error(e); process.exit(1); });
