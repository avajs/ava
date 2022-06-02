# Contributing to AVA

✨ Thanks for contributing to AVA! ✨

Please note that this project is released with a [Contributor Code of Conduct](CODE_OF_CONDUCT.md). By participating in this project you agree to abide by its terms.

Translations: [Español](https://github.com/avajs/ava-docs/blob/main/es_ES/contributing.md), [Français](https://github.com/avajs/ava-docs/blob/main/fr_FR/contributing.md), [Italiano](https://github.com/avajs/ava-docs/blob/main/it_IT/contributing.md), [日本語](https://github.com/avajs/ava-docs/blob/main/ja_JP/contributing.md), [Português](https://github.com/avajs/ava-docs/blob/main/pt_BR/contributing.md), [Русский](https://github.com/avajs/ava-docs/blob/main/ru_RU/contributing.md), [简体中文](https://github.com/avajs/ava-docs/blob/main/zh_CN/contributing.md)

## How can I contribute?

### Improve documentation

As a user of AVA you're the perfect candidate to help us improve our documentation. Typo corrections, error fixes, better explanations, more examples, etc. Open issues for things that could be improved. [Help translate our docs.](https://github.com/avajs/ava-docs) Anything. Even improvements to this document.

Use the [`scope:documentation` label](https://github.com/avajs/ava/labels/scope%3Adocumentation) to find suggestions for what we'd love to see more documentation on.

### Improve issues

Some issues are created with missing information, not reproducible, or plain invalid. Help make them easier to resolve. Handling issues takes a lot of time that we could rather spend on fixing bugs and adding features.

### Give feedback on issues

We're always looking for more opinions on discussions in the issue tracker. It's a good opportunity to influence the future direction of AVA.

The [`needs triage`](https://github.com/avajs/ava/labels/needs%20triage) and [`question`](https://github.com/avajs/ava/labels/question) labels are a good place to find ongoing discussions.

### Help out

You can use issue labels to discover issues you could help out with:

* [`blocked` issues](https://github.com/avajs/ava/labels/blocked) need help getting unstuck
* [`bug` issues](https://github.com/avajs/ava/labels/bug) are known bugs we'd like to fix
* [`enhancement` issues](https://github.com/avajs/ava/labels/enhancement) are features we're open to including
* [`performance` issues](https://github.com/avajs/ava/labels/performance) track ideas on how to improve AVA's performance

The [`help wanted`](https://github.com/avajs/ava/labels/help%20wanted) and [`good for beginner`](https://github.com/avajs/ava/labels/good%20for%20beginner) labels are especially useful.

You may find an issue is assigned. Please double-check before starting on this issue because somebody else is likely already working on it.

We'd like to fix [`priority` issues](https://github.com/avajs/ava/labels/priority) first. We'd love to see progress on [`low-priority` issues](https://github.com/avajs/ava/labels/low%20priority) too. [`future` issues](https://github.com/avajs/ava/labels/future) are those that we'd like to get to, but not anytime soon. Please check before working on these since we may not yet want to take on the burden of supporting those features.

Read on for tips on contributing code.

### Hang out and chat

We're using [GitHub Discussions](https://github.com/avajs/ava/discussions). Jump in there and lurk, talk to us, and help others.

## Contributing code

Once you find an issue you'd like to work on leave a comment so others are aware. We'll then assign you to the issue.

Of course you can work on things that do not yet have an issue. However if you're going to be putting in a lot of effort it's best to discuss it first.

When you're ready to get feedback on your work, open a [draft pull request](https://help.github.com/en/github/collaborating-with-issues-and-pull-requests/about-pull-requests#draft-pull-requests). It's fine if the work's not yet done, but please do let us know what's remaining. This lets reviewers know not to nit-pick small details or point out improvements you already know you need to make.

Reviewing large pull requests can take a lot of time. Time that may not always be available. Smaller pull requests may land more quickly. If you're introducing a new feature think about how it might be broken up. It's OK to land features as [opt-in experiments](https://github.com/avajs/ava/blob/master/docs/06-configuration.md#experiments). These require less documentation and test coverage.

Try and avoid making breaking changes. Those take more time to ship. Instead make the new behavior opt-in. This way your feature can ship, and you can use it, on its own schedule.

Non-experimental features should be accompanied with tests and documentation.

Don't include unrelated changes in your pull request. Make sure tests pass on your machine by running `npm test`. You can run specific test files as well using `npx tap test-tap/{file}.js` or `npx test-ava test/{file}.js`.

When you make a pull request please use a clear and descriptive title. Be specific about what's changed and why.

Please make sure the *Allow edits from maintainers* box is checked. That way we can make certain minor changes ourselves, allowing your pull request to be merged sooner.

You might be asked to make changes to your pull request. There's never a need to open another pull request. Push more commits to your existing branch. We'll squash them when we merge the PR.

Dependencies are managed using `npm`. Only update dependencies when needed for your pull request. Don't rebuild the lockfile.

And finally, have fun!
