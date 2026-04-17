---
description: Analyze codebase structure and update architecture codemaps.
---

# Update Codemaps

Analyze the codebase structure and update architecture documentation:

1. Scan all source files for imports, exports, and dependencies
2. Generate token-lean codemaps (adapt paths to your project structure):

   - `docs/codemaps/architecture.md` - Overall architecture
   - `docs/codemaps/backend.md` - Backend structure (if applicable)
   - `docs/codemaps/frontend.md` - Frontend structure (if applicable)
   - `docs/codemaps/data.md` - Data models and schemas

3. Calculate diff percentage from previous version
4. If changes > 30%, request user approval before updating
5. Add freshness timestamp to each codemap
6. Save diff report alongside codemaps

Use TypeScript/Node.js for analysis. Focus on high-level structure, not implementation details.
