/**
 * Commitlint Configuration
 *
 * Enforces conventional commit message format:
 * - feat: A new feature
 * - fix: A bug fix
 * - docs: Documentation only changes
 * - style: Changes that do not affect the meaning of the code
 * - refactor: A code change that neither fixes a bug nor adds a feature
 * - perf: A code change that improves performance
 * - test: Adding missing tests or correcting existing tests
 * - build: Changes that affect the build system or external dependencies
 * - ci: Changes to CI configuration files and scripts
 * - chore: Other changes that don't modify src or test files
 * - revert: Reverts a previous commit
 *
 * Example: feat: add volume slider component
 */
export default {
  extends: ["@commitlint/config-conventional"],
  rules: {
    // Type must be one of the conventional types
    "type-enum": [
      2,
      "always",
      [
        "feat",
        "fix",
        "docs",
        "style",
        "refactor",
        "perf",
        "test",
        "build",
        "ci",
        "chore",
        "revert",
      ],
    ],
    // Type must be lowercase
    "type-case": [2, "always", "lower-case"],
    // Type must not be empty
    "type-empty": [2, "never"],
    // Subject must not be empty
    "subject-empty": [2, "never"],
    // Subject must not end with period
    "subject-full-stop": [2, "never", "."],
    // Header max length
    "header-max-length": [2, "always", 100],
  },
};
