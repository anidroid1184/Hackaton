---
description: Create changelog entries following format and style guidelines.
---

## Create a changelog

This command creates a new changelog entry following format and style guidelines. _Adapt paths (e.g. `content/changelog/`) and database references (Vitess/Postgres) for your project._

### Changelog Format Requirements

**File Structure:**

- Filename: `kebab-case-title.md` (descriptive, lowercase with hyphens)
- Location: `content/changelog/`

**Frontmatter:**

```yaml
---
title: 'Human-readable title'
category: 'Feature|Enhancement|Bug Fix' # Optional
createdAt: 'YYYY-MM-DD' # Current date, sometimes with time
---
```

**Content Guidelines:**

- **Concise**: 1-3 paragraphs maximum
- **Consistent**: Examine recent similar changelogs to understand format
- **Simple language**: Avoid jargon, be conversational
- **Human tone**: Informal, not corporate-sounding
- **Avoid "programmatically"**: Do not use this word in changelog entries
- **Clear scope**: Explicitly mention if a feature is limited to specific platforms or environments
- **External links**: Link to relevant documentation when available
- **Screenshots**: Include if available, using `![Alt text](./filename.png)` format

**Common Patterns:**

- Start with what was added/changed
- Explain the benefit or use case
- Include links to documentation with **[Read more](/docs/path)**
- For API features, link to API docs
- For UI features, include screenshots
- Use bullet points for multiple related items
