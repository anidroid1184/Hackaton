---
description: Automated security scan with Snyk, Trivy, Poutine for dependencies and supply chain.
---

# Security Scan

## Overview

Execute a comprehensive automated security scan of the project using multiple security tools. This command performs quick automated scans to identify vulnerabilities in dependencies, containers, and supply chain.

**When to use**: Before commits, during CI/CD, or as part of regular security maintenance.

**Note**: For comprehensive manual security reviews, use the `security-audit` command instead.

## Prerequisites

Ensure the following tools are installed:

- Snyk CLI (`pnpm add -g snyk`)
- Trivy:
  - macOS: `brew install trivy`
  - Windows: `scoop install trivy` or `choco install trivy`
  - Linux: see [Trivy installation](https://aquasecurity.github.io/trivy/latest/getting-started/installation/)
- Poutine (if available in your environment)

## Steps to Execute

### 1. Scan Dependencies with Snyk

```bash
snyk test --all-projects --severity-threshold=high
```

### 2. Scan with Trivy (secrets + vulnerabilities)

```bash
trivy fs --scanners vuln,secret --exit-code 1 --severity HIGH,CRITICAL .
```

### 3. Scan Supply Chain with Poutine

```bash
poutine analyze_local .
```

### 4. Generate Consolidated Report

- Count HIGH/CRITICAL vulnerabilities
- List top 3 most critical issues
- Suggest automatic fixes if available

## Expected Output

Provide an executive summary with:

- ✅ All OK / ⚠️ Vulnerabilities found
- Top 3 critical issues (if any)
- Exact commands to fix issues
