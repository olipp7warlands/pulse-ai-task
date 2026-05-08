# Graph Report - pm-app  (2026-05-08)

## Corpus Check
- 34 files · ~22,686 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 149 nodes · 230 edges · 17 communities (13 shown, 4 thin omitted)
- Extraction: 99% EXTRACTED · 1% INFERRED · 0% AMBIGUOUS · INFERRED: 3 edges (avg confidence: 0.95)
- Token cost: 52,257 input · 2,850 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Activity & Analytics Routes|Activity & Analytics Routes]]
- [[_COMMUNITY_API Routes & DB Tables|API Routes & DB Tables]]
- [[_COMMUNITY_Activity Dashboard UI|Activity Dashboard UI]]
- [[_COMMUNITY_Projects & Components|Projects & Components]]
- [[_COMMUNITY_Web UI Pages & Components|Web UI Pages & Components]]
- [[_COMMUNITY_Agent Logic (executeAction)|Agent Logic (executeAction)]]
- [[_COMMUNITY_DateTag Component|DateTag Component]]
- [[_COMMUNITY_Root Layout & Fonts|Root Layout & Fonts]]
- [[_COMMUNITY_CORS Middleware|CORS Middleware]]
- [[_COMMUNITY_Next.js Config|Next.js Config]]
- [[_COMMUNITY_Tailwind Config|Tailwind Config]]
- [[_COMMUNITY_Layout Bootstrap|Layout Bootstrap]]

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
- `Type: Task` --shares_data_with--> `DB: tasks`  [INFERRED]
  lib/types.ts → scripts/init-db.ts
- `Type: Link` --shares_data_with--> `DB: links`  [INFERRED]
  lib/types.ts → scripts/init-db.ts
- `POST()` --calls--> `sql`  [EXTRACTED]
  app/api/links/route.ts → lib/db.ts

## Hyperedges (group relationships)
- **All API Routes Use SQL Client** — api_activity_route, api_agent_route, api_links_route, api_links_id_route, api_meetings_route, api_meetings_id_route, api_meetings_approve_tasks_route, api_meetings_audio_route, lib_db [EXTRACTED 1.00]
- **Middleware Covers All API Routes** — middleware, api_activity_route, api_agent_route, api_links_route, api_meetings_route [EXTRACTED 1.00]
- **Meetings Audio Pipeline** — api_meetings_audio_route, anthropic_claude_api, db_table_suggested_tasks, api_meetings_approve_tasks_route, db_table_tasks [EXTRACTED 1.00]
- **Chat SSE Agent Pipeline** — chat_page, api_agent_route, anthropic_claude_api, db_table_tasks, db_table_projects [EXTRACTED 1.00]
- **DB FK Cascade: projects->tasks->links** — db_table_projects, db_table_tasks, db_table_links, db_table_suggested_tasks [EXTRACTED 1.00]
- **lib/types consumed by components and pages** — lib_types, type_project, type_task, type_priority, type_status, page_projects, component_project_chip, component_task_card, component_priority_tag [EXTRACTED 1.00]

## Communities (17 total, 4 thin omitted)

### Community 0 - "Activity & Analytics Routes"
Cohesion: 0.12
Nodes (15): calcStreak(), GET(), POST(), POST(), DELETE(), GET(), PATCH(), sql (+7 more)

### Community 1 - "API Routes & DB Tables"
Cohesion: 0.2
Nodes (27): Anthropic Claude API, API: GET /activity, API: POST /agent (SSE), API: DELETE /links/[id], API: POST /links, API: POST /meetings/[id]/approve-tasks, API: POST /meetings/[id]/audio, API: GET+DELETE /meetings/[id] (+19 more)

### Community 2 - "Activity Dashboard UI"
Cohesion: 0.1
Nodes (10): ACTION_LABELS, ActivityData, DOT_COLORS, TAG_STYLES, ACTION_COLORS, ACTION_COLORS_DARK, ActionColor, tabs (+2 more)

### Community 3 - "Projects & Components"
Cohesion: 0.13
Nodes (13): PriorityTagProps, STYLES, ProjectChipProps, TaskCardProps, ActivityEntry, Link, LinkType, Priority (+5 more)

### Community 4 - "Web UI Pages & Components"
Cohesion: 0.19
Nodes (15): Activity Page, Chat Page, BottomNav Component, DateTag Component, PriorityTag Component, ProjectChip Component, TaskCard Component, TopBar Component (+7 more)

### Community 5 - "Agent Logic (executeAction)"
Cohesion: 0.33
Nodes (6): buildContext(), client, executeAction(), HistoryMessage, POST(), AgentResponse

### Community 6 - "DateTag Component"
Cohesion: 0.38
Nodes (6): DateTag(), DateTagProps, DateTagVariant, formatDate(), getVariant(), STYLES

### Community 7 - "Root Layout & Fonts"
Cohesion: 0.4
Nodes (3): archivo, metadata, viewport

## Knowledge Gaps
- **36 isolated node(s):** `config`, `nextConfig`, `config`, `archivo`, `metadata` (+31 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **4 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `sql` connect `Activity & Analytics Routes` to `Agent Logic (executeAction)`?**
  _High betweenness centrality (0.061) - this node is a cross-community bridge._
- **Why does `executeAction()` connect `Agent Logic (executeAction)` to `Activity & Analytics Routes`?**
  _High betweenness centrality (0.023) - this node is a cross-community bridge._
- **Why does `API: POST /agent (SSE)` connect `API Routes & DB Tables` to `Web UI Pages & Components`?**
  _High betweenness centrality (0.021) - this node is a cross-community bridge._
- **What connects `config`, `nextConfig`, `config` to the rest of the system?**
  _36 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `Activity & Analytics Routes` be split into smaller, more focused modules?**
  _Cohesion score 0.12 - nodes in this community are weakly interconnected._
- **Should `Activity Dashboard UI` be split into smaller, more focused modules?**
  _Cohesion score 0.1 - nodes in this community are weakly interconnected._
- **Should `Projects & Components` be split into smaller, more focused modules?**
  _Cohesion score 0.13 - nodes in this community are weakly interconnected._