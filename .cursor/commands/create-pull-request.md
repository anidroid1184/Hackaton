---
description: Create a well-structured PR with context, checklist, and conventional format.
---

# Create Pull Request

## Overview

Create a well-structured pull request with all necessary context and information for reviewers.

## Steps

1. **Review your changes**

   - Run `git diff` to see all modifications
   - Ensure all changes are intentional
   - Check for any debug code or temporary changes

2. **Write a descriptive title**

   - Use present tense (e.g., "Add user authentication")
   - Keep it concise but informative
   - Reference ticket number if applicable

3. **Provide context**

   - Explain WHY this change is needed
   - Describe WHAT was changed
   - Mention any breaking changes

4. **Add testing notes**

   - List steps to test the changes
   - Include edge cases
   - Mention any setup requirements

5. **Overview**

   - Problem: Why this change is needed (business or technical motivation)
   - Solution: High-level approach taken
   - Impact: What systems/users are affected

6. **Size Matters**
   - Large PRs (200+ lines) lead to superficial reviews and missed issues. Break work into logical, reviewable chunks.

## Checklist

- [ ] All tests pass
- [ ] Code follows project style guide
- [ ] Documentation updated if needed
- [ ] No sensitive data in the code
- [ ] Branch is up to date with main
- [ ] PR is focused on single concern
- [ ] Self-reviewed before requesting review
