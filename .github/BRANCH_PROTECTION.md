# Git Flow & Branch Protection Setup

## Branch Strategy (Git Flow)

This project follows a simplified Git Flow branching model:

```
main (production)
  │
  ├── develop (integration)
  │     │
  │     ├── feature/xxx (new features)
  │     ├── fix/xxx (bug fixes)
  │     └── chore/xxx (maintenance)
  │
  └── hotfix/xxx (urgent production fixes)
```

### Branch Descriptions

| Branch | Purpose | Merges Into |
|--------|---------|-------------|
| `main` | Production-ready code, tagged releases | - |
| `develop` | Integration branch for features | `main` |
| `feature/*` | New feature development | `develop` |
| `fix/*` | Bug fixes | `develop` |
| `hotfix/*` | Urgent production fixes | `main` and `develop` |
| `chore/*` | Maintenance, dependencies, CI/CD | `develop` |
| `release/*` | Release preparation (optional) | `main` and `develop` |

## Recommended Branch Protection Rules

### For `main` branch

Go to: **Settings → Branches → Add branch protection rule**

```yaml
Branch name pattern: main

Protection settings:
  ✅ Require a pull request before merging
    ✅ Require approvals: 1 (or more for teams)
    ✅ Dismiss stale pull request approvals when new commits are pushed
    ✅ Require approval of the most recent reviewable push
  
  ✅ Require status checks to pass before merging
    ✅ Require branches to be up to date before merging
    Required checks:
      - "Build Status"
      - "Lint & Type Check"
      - "Build Extension (chrome)"
      - "Build Extension (firefox)"
  
  ✅ Require conversation resolution before merging
  ✅ Do not allow bypassing the above settings
  
  Optional:
  ✅ Require signed commits (if using GPG)
  ✅ Require linear history (for clean git history)
```

### For `develop` branch

```yaml
Branch name pattern: develop

Protection settings:
  ✅ Require a pull request before merging
    ✅ Require approvals: 1
  
  ✅ Require status checks to pass before merging
    Required checks:
      - "Build Status"
  
  ⬜ Allow force pushes (optional, for rebasing)
```

## Workflow Examples

### Creating a New Feature

```bash
# Start from develop
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/add-equalizer

# Work on feature...
git add .
git commit -m "feat: add audio equalizer controls"

# Push and create PR to develop
git push -u origin feature/add-equalizer
# Create PR: feature/add-equalizer → develop
```

### Creating a Release

```bash
# Ensure develop is ready
git checkout develop
git pull origin develop

# Create release PR: develop → main
# After PR is merged and CI passes:

# Tag the release
git checkout main
git pull origin main
git tag -a v1.1.0 -m "Release v1.1.0"
git push origin v1.1.0

# This triggers the release workflow automatically
```

### Hotfix for Production

```bash
# Start from main
git checkout main
git pull origin main

# Create hotfix branch
git checkout -b hotfix/fix-critical-bug

# Fix the issue...
git commit -m "fix: resolve critical audio context issue"

# Push and create PR to main
git push -u origin hotfix/fix-critical-bug
# Create PR: hotfix/fix-critical-bug → main

# After merge, also merge back to develop
git checkout develop
git merge main
git push origin develop
```

## Release Process

1. **Prepare**: Merge all features from `develop` to `main` via PR
2. **Tag**: Create semantic version tag (e.g., `v1.2.0`)
3. **Build**: Release workflow automatically builds and creates GitHub release
4. **Publish**: Manually trigger publish workflow or auto-publish on release

### Semantic Versioning

```
v1.2.3
│ │ │
│ │ └── Patch: bug fixes, no API changes
│ └──── Minor: new features, backward compatible
└────── Major: breaking changes
```

### Pre-release Tags

- `v1.2.0-alpha.1` - Early testing
- `v1.2.0-beta.1` - Feature complete, testing
- `v1.2.0-rc.1` - Release candidate

## Required Secrets for Publishing

Configure these in **Settings → Secrets and variables → Actions**:

### Chrome Web Store
- `CHROME_EXTENSION_ID` - Your extension ID
- `CHROME_CLIENT_ID` - OAuth2 client ID
- `CHROME_CLIENT_SECRET` - OAuth2 client secret
- `CHROME_REFRESH_TOKEN` - OAuth2 refresh token

### Firefox Add-ons
- `FIREFOX_API_KEY` - AMO API key (JWT issuer)
- `FIREFOX_API_SECRET` - AMO API secret

