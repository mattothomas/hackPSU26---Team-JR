FROM ghcr.io/openclaw/openclaw:latest

USER root

# Copy all agent SOUL.md files into their workspace locations
COPY souls/idea-parser.md /home/node/.openclaw/workspaces/idea-parser/SOUL.md
COPY souls/product.md     /home/node/.openclaw/workspaces/product/SOUL.md
COPY souls/market.md      /home/node/.openclaw/workspaces/market/SOUL.md
COPY souls/business.md    /home/node/.openclaw/workspaces/business/SOUL.md
COPY souls/brand.md       /home/node/.openclaw/workspaces/brand/SOUL.md
COPY souls/pitch.md       /home/node/.openclaw/workspaces/pitch/SOUL.md
COPY souls/team-gen.md    /home/node/.openclaw/workspaces/team-gen/SOUL.md
COPY souls/task-gen.md    /home/node/.openclaw/workspaces/task-gen/SOUL.md
COPY souls/worker.md      /home/node/.openclaw/workspaces/worker/SOUL.md
COPY souls/builder.md     /home/node/.openclaw/workspaces/builder/SOUL.md

# Create agent dirs and workspace dir
RUN for agent in idea-parser product market business brand pitch team-gen task-gen worker builder; do \
      mkdir -p /home/node/.openclaw/agents/$agent/agent; \
    done && \
    mkdir -p /home/node/.openclaw/workspace && \
    chown -R node:node /home/node/.openclaw

COPY entrypoint.sh /entrypoint.sh
RUN chmod +x /entrypoint.sh

USER node
ENTRYPOINT ["/entrypoint.sh"]
CMD ["node", "dist/index.js", "gateway", "--bind", "lan", "--port", "18789"]
