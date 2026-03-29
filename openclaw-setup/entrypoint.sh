#!/bin/sh
set -e

CONFIG_FILE=/home/node/.openclaw/openclaw.json
TOKEN="${OPENCLAW_GATEWAY_TOKEN:-founderOS-secret-token-123}"

# Generate openclaw.json from environment variables
node -e "
const config = {
  gateway: {
    mode: 'local',
    bind: 'lan',
    auth: { token: process.env.OPENCLAW_GATEWAY_TOKEN || 'founderOS-secret-token-123' },
    http: { endpoints: { chatCompletions: { enabled: true } } },
    controlUi: { allowedOrigins: ['http://localhost:18789','http://127.0.0.1:18789'] }
  },
  agents: {
    defaults: { model: 'google/gemini-2.5-pro' },
    list: [
      'idea-parser','product','market','business','brand','pitch','team-gen','task-gen','worker','builder'
    ].map(id => ({
      id,
      name: id.replace(/-/g,' ').replace(/\b\w/g, c => c.toUpperCase()),
      workspace: '/home/node/.openclaw/workspaces/' + id,
      agentDir:  '/home/node/.openclaw/agents/'    + id + '/agent'
    }))
  },
  env: { GEMINI_API_KEY: process.env.GEMINI_API_KEY || '' }
};
require('fs').writeFileSync('/home/node/.openclaw/openclaw.json', JSON.stringify(config, null, 2));
console.log('openclaw.json generated');
"

exec "$@"
