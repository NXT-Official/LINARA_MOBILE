# Story 2: SAST Tooling & CI/CD Pipeline Setup

## Objective
Establish Static Application Security Testing (SAST) checks, configure linting and formatting engines, and set up automated workflows that validate code quality on every branch pull request. This ensures type safety and prevents unexpected inputs before deployment.

## Context References
- **PRD Specs:** [`../LINARA_MOBILE/plan.md`](../LINARA_MOBILE/plan.md)
- **Central Lint Specifications:** [`eslint.config.js`](eslint.config.js) and [`.prettierrc.json`](.prettierrc.json) (re-use formatting parameters).

## Explicit Dependencies
- `Story_1_EnvironmentBaselineAndDependencyIngestion.md`

## Explicit Inputs
- **Dependencies:** Linter libraries installed during initial setup.

## Step-by-Step Implementation Instructions
1. Install ESLint, Prettier, and formatting plugins as development dependencies:
   ```bash
   bun add -d eslint eslint-config-expo eslint-plugin-react eslint-plugin-react-hooks prettier eslint-plugin-prettier
   ```
2. Create an `eslint.config.js` file using Expo's flat lint parameters. Enforce:
   - No unused variables or unused imports.
   - Restrict direct assignments to global objects without safe undefined lookups.
   - Enforce trailing semicolons and double quotes from Prettier.
3. Configure `eslint.config.js` to execute automatic code safety checks (SAST), highlighting unvalidated properties and unexpected data types.
4. Set up a local Husky configuration with a pre-commit hook that triggers lint checks and TypeScript compiler validation:
   ```bash
   bun run lint
   bun run typecheck
   ```
5. Create a GitHub Actions workflow `.github/workflows/validate-pull-request.yml` to automate checks:
   - Triggers on every pull request targeting `main` or `development` branches.
   - Boots a Node runner, checks out code, runs `bun install`, and executes:
     - `bun run lint`
     - `bun run typecheck`

## Expected Output
- Complete ESLint flat configuration file in the project root.
- Automated Husky pre-commit hooks intercepting malformed code blocks.
- GitHub Actions workflow pipeline verifying compilation safety on pull requests.

## Acceptance Criteria
- Running `bun run lint` evaluates all source files, reporting warnings/errors cleanly in the console.
- Attempting to commit code with explicit syntax or formatting errors is blocked by the Husky pre-commit hook.
- The GitHub Actions PR validation pipeline executes and succeeds on test repository pull requests.

## Definition of Done
- Local and remote linter checks compile with zero errors.
- Pre-commit hooks run automatically upon local commits.
- PR validation is green on GitHub Actions.
