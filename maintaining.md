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

1. In the `main` branch, use `npm version` with the correct increment.
1. Push the resulting tag (`git push --tags`).
1. Wait for minimal CI checks to pass and push the `main` branch.
1. Wait for full CI run to complete on the tag.
1. The *Release* workflow will automatically run and publish to npm with provenance. It will also create a draft GitHub release.
1. Review and publish the [draft GitHub release](https://github.com/avajs/ava/releases).

The *Release* workflow includes several safety checks:

- Validates the tag version matches `package.json`
- Verifies the tagged commit is included in the `main` branch
- Confirms CI has passed for the commit

### Manual Release

If CI fails for the tag and you're confident this is not due to a fault in the release, you can manually trigger the *Release* workflow:

1. Go to the [*Release* workflow](https://github.com/avajs/ava/actions/workflows/release.yml)
1. Click "Run workflow"
1. Enter the release tag (e.g., `v1.2.3`)
1. Optionally check "Skip CI status check"

### Setup Requirements

For the Release workflow to work, the `NPM_TOKEN` must be configured in the [`npm` environment](https://github.com/avajs/ava/settings/environments/7070437878/edit#environment-secrets).

This must be a granular automation token which can publish the AVA package. It must be set to expire after no more than 90 days.
