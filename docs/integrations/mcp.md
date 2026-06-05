# MCP for AI agents

The `@backstage/plugin-mcp-actions-backend` plugin bridges Backstage
APIs to the Model Context Protocol so AI agents (Claude Code,
Cursor, etc) can call them as tools.

## Endpoints

| Path | Tools exposed |
|------|---------------|
| `/api/mcp-actions/v1/catalog` | `catalog:list_entities`, `catalog:fetch_entity`, `catalog:search`, … |
| `/api/mcp-actions/v1/scaffolder` | `scaffolder:list_templates`, `scaffolder:create_project`, … |
| `/api/mcp-actions/v1/techdocs` | `techdocs:fetch_doc`, `techdocs:search` |

All three use the **streamable HTTP MCP transport**. Auth is
`Authorization: Bearer ${MCP_TOKEN}` with a single token from the
`backstage-mcp-token` agenix secret.

## Configuration

In `app-config.production.yaml`:

```yaml
backend:
  auth:
    externalAccess:
      - type: static
        options:
          token: ${MCP_TOKEN}
          subject: mcp-clients
        accessRestrictions:
          - plugin: mcp-actions
          - plugin: catalog
          - plugin: scaffolder
          - plugin: techdocs

mcpActions:
  name: 'freundcloud Backstage'
  servers:
    catalog:
      name: 'Catalog'
      filter:
        include:
          - id: 'catalog:*'
    scaffolder:
      name: 'Scaffolder'
      filter:
        include:
          - id: 'scaffolder:*'
    techdocs:
      name: 'TechDocs'
      filter:
        include:
          - id: 'techdocs:*'
```

The multi-server form means each endpoint serves a different tool
subset — Claude Code registers each as a separate MCP server in its
config rather than a single server with everything mixed.

## Adding to Claude Code

```bash
TOKEN=$(agenix -d secrets/backstage-mcp-token.age)
BASE=https://p510.tail833f7.ts.net/backstage

claude mcp add backstage-catalog "$BASE/api/mcp-actions/v1/catalog" \
  --transport http --header "Authorization: Bearer $TOKEN"

claude mcp add backstage-scaffolder "$BASE/api/mcp-actions/v1/scaffolder" \
  --transport http --header "Authorization: Bearer $TOKEN"

claude mcp add backstage-techdocs "$BASE/api/mcp-actions/v1/techdocs" \
  --transport http --header "Authorization: Bearer $TOKEN"
```

The positional args (name + URL) MUST come before `--header` —
`--header` is variadic and swallows anything after it.

## What this unlocks

Claude Code sessions can:

- List every catalog entity with `mcp__backstage-catalog__list_entities`
- Fetch any entity's full metadata + relations
- List scaffolder templates and create projects without leaving the
  terminal
- Search across TechDocs content

The catalog API is rate-limited by Backstage internals but the
Backstage backend itself sees these as authenticated calls from the
`mcp-clients` subject. No GitHub OAuth round-trip per agent call —
the token grants direct API access.
