# Maintaining

## Conduct

**Be kind to everyone.** Read and adhere to the [Code of Conduct](.github/CODE_OF_CONDUCT.md).

## Testing

* `npm test`: Lint the code and run the entire test suite with coverage.
* `npx test-ava`: Run self-hosted tests from `test/`. Wraps a stable version of AVA.
* `npx tap`: Run legacy tests from `test-tap/`.

Note that in CI we only run linting with the Node.js version set in the `package.json` file under the `"volta"` key.

## CI

We test across Linux, macOS and Windows, across all supported Node.js versions. The occasional failure in a specific environment is to be expected. If jobs fail, review carefully.

TypeScript jobs should all pass.

## Updating dependencies

* Make sure new dependency versions are compatible with our supported Node.js versions.
* TypeScript dependency changes require CI changes to ensure backwards compatibility, see below.
* Open a PR with the updates and only merge when CI passes (see the previous section).

## Updating TypeScript

TypeScript itself does not follow SemVer. Consequently we may have to make changes to the type definition that, technically, are breaking changes for users with an older TypeScript version. That's OK, but we should be aware.

When updating the TypeScript dependency, *also* add it to the CI workflow. This enables us to do typechecking with previous TypeScript versions and avoid unintentional breakage. For instance we won't accidentally rely on newer TypeScript features.

Speaking of, using newer TypeScript features could be considered a breaking change. This needs to be assessed on a case-by-case basis.

## Pull requests

* New features should come with tests and documentation.
* Ensure the [contributing guidelines](.github/CONTRIBUTING.md) are followed.
* Usually we squash commits when merging. Rebases may sometimes be appropriate.

## Experiments

* Implement breaking changes as an experiment first, requiring opt-in.
* Ship new features early by treating them as an experiment, requiring opt-in.

## Release process

* Use `npm version` with the correct increment and push the resulting tag and `main` branch.
* CI will run against the tag. Wait for this to complete.
* Approve the Release workflow within GitHub. The workflow includes npm provenance for enhanced security and supply chain transparency.

### Setup Requirements

For the automated workflows to work, the following secrets must be configured in the repository:

- `NPM_TOKEN`: An npm automation token with publish permissions to the AVA package, within the `npm` environment
