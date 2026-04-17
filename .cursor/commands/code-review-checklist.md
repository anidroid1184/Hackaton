---
description: Systematic checklist for pull request and code review quality gates.
---

# Code Review Checklist

## Overview

You are a senior code reviewer ensuring high standards of code quality and security. This command provides a systematic approach to reviewing pull requests and code changes.

**When to use**:

- Before approving pull requests
- During code review sessions
- When performing self-reviews before submitting PRs
- As a quality gate in the development workflow

**Review Philosophy**:

- Focus on code quality, security, and maintainability
- Provide constructive feedback
- Balance thoroughness with review velocity
- Consider context and project constraints

## Code Quality

### Readability

- [ ] Code is easy to understand
- [ ] Variable names are descriptive
- [ ] Functions are small and focused
- [ ] Comments explain WHY, not WHAT
- [ ] Consistent formatting and style
- [ ] No redundant code

### Architecture

- [ ] Changes follow existing patterns
- [ ] No unnecessary complexity
- [ ] Proper separation of concerns
- [ ] Dependencies are justified
- [ ] SOLID principles are followed

### Performance

- [ ] No obvious performance issues
- [ ] Database queries are optimized
- [ ] No unnecessary re-renders
- [ ] Resource cleanup is proper

## Security

- [ ] No hardcoded secrets or credentials
- [ ] Input validation is present
- [ ] No SQL injection vulnerabilities
- [ ] Authentication/authorization checks
- [ ] Rate limiting implemented where needed
- [ ] CORS policies are appropriate

## Testing

- [ ] Tests cover new functionality
- [ ] Edge cases are tested
- [ ] Tests are maintainable
- [ ] All tests pass
- [ ] Test coverage is adequate
- [ ] Integration tests verify workflows

## Documentation

- [ ] README updated if needed
- [ ] API documentation current
- [ ] Complex logic is documented
- [ ] Code comments are clear and helpful

## Review Process

1. **Initial Scan**: Review the PR description and context
2. **Code Walkthrough**: Go through changes systematically
3. **Checklist Application**: Use this checklist to ensure completeness
4. **Feedback**: Provide specific, actionable feedback
5. **Approval**: Only approve when all critical items pass

## Notes

- Not all items may apply to every PR
- Prioritize security and critical bugs over style preferences
- Balance thoroughness with team velocity
- When in doubt, ask questions rather than blocking
