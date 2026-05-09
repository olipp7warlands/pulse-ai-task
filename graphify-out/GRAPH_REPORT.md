# Graph Report - pm-app  (2026-05-09)

## Corpus Check
- 34 files · ~22,871 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 156 nodes · 240 edges · 18 communities (13 shown, 5 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.95)
- Token cost: 0 input · 0 output

## Graph Freshness
- Built from commit: `06383ba8`
- Run `git rev-parse HEAD` and compare to check if the graph is stale.
- Run `graphify update .` after code changes (no API cost).

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]
- [[_COMMUNITY_Community 4|Community 4]]
- [[_COMMUNITY_Community 5|Community 5]]
- [[_COMMUNITY_Community 6|Community 6]]
- [[_COMMUNITY_Community 7|Community 7]]
- [[_COMMUNITY_Community 8|Community 8]]
- [[_COMMUNITY_Community 9|Community 9]]
- [[_COMMUNITY_Community 10|Community 10]]
- [[_COMMUNITY_Community 13|Community 13]]
- [[_COMMUNITY_Community 17|Community 17]]

## God Nodes (most connected - your core abstractions)
1. `sql` - 15 edges
2. `lib/db.ts (sql client)` - 13 edges
3. `DB: tasks` - 13 edges
4. `API: POST /agent (SSE)` - 11 edges
5. `DB: projects` - 10 edges
6. `DB: links` - 9 edges
7. `DB: activity_log` - 7 edges
8. `Projects Page (web)` - 7 edges
9. `Init DB Script` - 7 edges
10. `API: GET /activity` - 6 edges

## Surprising Connections (you probably didn't know these)
- `Type: Project` --shares_data_with--> `DB: projects`  [INFERRED]
  lib/types.ts → scripts/init-db.ts
- `executeAction()` --calls--> `sql`  [EXTRACTED]
  app/api/agent/route.ts → lib/db.ts
- `POST()` --calls--> `sql`  [EXTRACTED]
  app/api/meetings/[id]/audio/route.ts → lib/db.ts
- `Type: Task` --shares_data_with--> `DB: tasks`  [INFERRED]
  lib/types.ts → scripts/init-db.ts
- `Type: Link` --shares_data_with--> `DB: links`  [INFERRED]
  lib/types.ts → scripts/init-db.ts

## Hyperedges (group relationships)
- **All API Routes Use SQL Client** — api_activity_route, api_agent_route, api_links_route, api_links_id_route, api_meetings_route, api_meetings_id_route, api_meetings_approve_tasks_route, api_meetings_audio_route, lib_db [EXTRACTED 1.00]
- **Middleware Covers All API Routes** — middleware, api_activity_route, api_agent_route, api_links_route, api_meetings_route [EXTRACTED 1.00]
- **Meetings Audio Pipeline** — api_meetings_audio_route, anthropic_claude_api, db_table_suggested_tasks, api_meetings_approve_tasks_route, db_table_tasks [EXTRACTED 1.00]
- **Chat SSE Agent Pipeline** — chat_page, api_agent_route, anthropic_claude_api, db_table_tasks, db_table_projects [EXTRACTED 1.00]
- **DB FK Cascade: projects->tasks->links** — db_table_projects, db_table_tasks, db_table_links, db_table_suggested_tasks [EXTRACTED 1.00]
- **lib/types consumed by components and pages** — lib_types, type_project, type_task, type_priority, type_status, page_projects, component_project_chip, component_task_card, component_priority_tag [EXTRACTED 1.00]

## Communities (18 total, 5 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.13
Nodes (14): calcStreak(), GET(), POST(), DELETE(), GET(), PATCH(), sql, POST() (+6 more)

### Community 1 - "Community 1"
Cohesion: 0.2
Nodes (27): Anthropic Claude API, API: GET /activity, API: POST /agent (SSE), API: DELETE /links/[id], API: POST /links, API: POST /meetings/[id]/approve-tasks, API: POST /meetings/[id]/audio, API: GET+DELETE /meetings/[id] (+19 more)

### Community 2 - "Community 2"
Cohesion: 0.13
Nodes (13): PriorityTagProps, STYLES, ProjectChipProps, TaskCardProps, ActivityEntry, Link, LinkType, Priority (+5 more)

### Community 3 - "Community 3"
Cohesion: 0.1
Nodes (10): ACTION_LABELS, ActivityData, DOT_COLORS, TAG_STYLES, ACTION_COLORS, ACTION_COLORS_DARK, ActionColor, tabs (+2 more)

### Community 4 - "Community 4"
Cohesion: 0.19
Nodes (15): Activity Page, Chat Page, BottomNav Component, DateTag Component, PriorityTag Component, ProjectChip Component, TaskCard Component, TopBar Component (+7 more)

### Community 5 - "Community 5"
Cohesion: 0.19
Nodes (11): buildContext(), client, executeAction(), HistoryMessage, POST(), POST(), AgentInputSchema, AgentOutputSchema (+3 more)

### Community 6 - "Community 6"
Cohesion: 0.38
Nodes (6): DateTag(), DateTagProps, DateTagVariant, formatDate(), getVariant(), STYLES

### Community 7 - "Community 7"
Cohesion: 0.4
Nodes (3): archivo, metadata, viewport

## Knowledge Gaps
- **38 isolated node(s):** `config`, `nextConfig`, `config`, `archivo`, `metadata` (+33 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **5 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `sql` connect `Community 0` to `Community 5`?**
  _High betweenness centrality (0.058) - this node is a cross-community bridge._
- **Why does `executeAction()` connect `Community 5` to `Community 0`?**
  _High betweenness centrality (0.022) - this node is a cross-community bridge._
- **Why does `API: POST /agent (SSE)` connect `Community 1` to `Community 4`?**
  _High betweenness centrality (0.019) - this node is a cross-community bridge._
- **What connects `config`, `nextConfig`, `config` to the rest of the system?**
  _38 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Community 0` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Should `Community 2` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._
- **Should `Community 3` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._