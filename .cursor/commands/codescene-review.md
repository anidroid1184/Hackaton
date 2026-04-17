---
description: Analyze code using CodeScene principles: complexity, duplication, coupling.
---

# CodeScene Review

Analyze the current code following CodeScene principles using the CodeScene MCP tools.

## Steps

1. Run `pre_commit_code_health_safeguard` with the git repository path to check all staged/modified files
2. For files scoring below 6.0, run `code_health_review` with the absolute `file_path` to get a detailed breakdown
3. For functions with supported code smells (Complex Conditional, Bumpy Road, Complex Method, Deep Nesting, Large Method) under 300 lines, run `code_health_auto_refactor` with `file_path` and `function_name`
4. If a file scores below 4.0, run `code_health_refactoring_business_case` to justify refactoring effort

## Manual checklist (complement MCP tools)

1. Evaluate cyclomatic complexity (target: <10 per function)
2. Detect functions >50 lines
3. Find code duplication (target: <3%)
4. Review coupling between modules
5. Generate report with priorities

Output: Markdown table with findings and priorities, including CodeScene health scores.
