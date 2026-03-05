# Maintaining

## Conduct

**Be kind to everyone.** Read and adhere to the [Code of Conduct](.github/CODE_OF_CONDUCT.md).

## Testing

- `npm test`: Lint the code and run the entire test suite with coverage.
- `npx tap test-tap/fork.js --bail`: Run a specific test file and bail on the first failure (useful when hunting bugs).
- `npx test-ava test/{file}.js`: Run self-hosted tests.

## CI

- Tests sometimes fail on Windows. Review the errors carefully.
- At least one Windows job must pass.
- All other jobs must pass.

## Updating dependencies

- Make sure new dependency versions are compatible with our supported Node.js versions.
- Leave the TypeScript dependency as it is, to avoid accidental breakage.
- Open a PR with the updates and only merge when CI passes (see the previous section).

## Updating TypeScript

TypeScript itself does not follow SemVer. Consequently we may have to make changes to the type definition that, technically, are breaking changes for users with an older TypeScript version. That's OK, but we should be aware.

Only update the TypeScript dependency when truly necessary. This helps avoid accidental breakage. For instance we won't accidentally rely on newer TypeScript features.

Speaking of, using newer TypeScript features could be considered a breaking change. This needs to be assessed on a case-by-case basis.

## Pull requests

- New features should come with tests and documentation.
- Ensure the [contributing guidelines](.github/CONTRIBUTING.md) are followed.
- Squash commits when merging.

## Experiments

- Implement breaking changes as an experiment first, requiring opt-in.
- Ship new features early by treating them as an experiment, requiring opt-in.

## Release process

Releases are triggered manually via the [*Release* workflow](https://github.com/avajs/ava/actions/workflows/release.yml).

### Releasing a new version from `main`

1. Go to the [*Release* workflow](https://github.com/avajs/ava/actions/workflows/release.yml) and click "Run workflow".
1. Set **ref** to the commit SHA that should be released (must be HEAD of `main`).
1. Set **new version** to the desired `npm version` increment (e.g. `patch`, `minor`, `major`, or an explicit version like `1.2.3`).
1. Leave **skip CI status check** unchecked unless you have a specific reason.

The workflow will:

- Validate that the commit is HEAD of `main` and that CI has passed for it.
- Pause for manual approval in the [`npm` environment](https://github.com/avajs/ava/settings/environments).
- After approval, re-verify the commit is still HEAD of `main`.
- Then run `npm version` to update `package.json` and `package-lock.json`, commit the result, and push the commit and the resulting tag to `main`.
- Publish to npm with provenance via OIDC, and create a draft GitHub release.

### Releasing from an existing tag

If a version tag already exists on `main` (e.g. `v1.2.3`):

1. Go to the [*Release* workflow](https://github.com/avajs/ava/actions/workflows/release.yml) and click "Run workflow".
1. Set **ref** to the existing tag (e.g. `v1.2.3`).
1. Leave **new version** empty.

The workflow will verify that the tag matches the version in `package.json`, check CI, then publish and create a draft release after approval.

### After the workflow completes

Review and publish the [draft GitHub release](https://github.com/avajs/ava/releases).

### Setup requirements

The npm package must have [trusted publishing](https://docs.npmjs.com/generating-provenance-statements) configured for this repository and the `Release` workflow so that OIDC-based publishing works.

The [`npm` environment](https://github.com/avajs/ava/settings/environments) must have at least one required reviewer configured to gate the publish step behind manual approval.

#### GitHub App for bypassing branch rulesets

The `main` branch has rulesets that prevent direct pushes, including from `GITHUB_TOKEN`. When releasing a new version from a commit ref, the workflow creates the version commit (updating `package.json` and `package-lock.json`) and the version tag via the GitHub API. The commit is created using a GitHub App token so that the App's identity can be granted a ruleset bypass, while the lightweight tag is created with `GITHUB_TOKEN`.

The App must be configured with:

- **Repository permissions:** Write access to the `package.json` and `package-lock.json` files
- **Ruleset bypass** granted in the `main` branch ruleset settings

Two repository configuration values are required:

- **Variable** `LAUNCHBOT_ID` — the numeric App ID (found in the App's settings page)
- **Secret** `LAUNCHBOT_PRIVATE_KEY` — the App's private key in PEM format
