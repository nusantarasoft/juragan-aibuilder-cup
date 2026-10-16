# Workspace Agent Rules

## Docker Rebuild
- Always rebuild Docker after any code modification using `docker compose build admin` and `docker compose up -d admin` from the project root.
- This applies to ALL conversations working on the nusantarasoft project.

## Docs + flow + diagrams
- Behavior / user-flow / architecture code changes must check, update, or add matching docs and ladder diagrams in the same session.
- Rule: `.cursor/rules/docs-flow-diagrams-sync.mdc` (always apply).
