# Contributing to AVA

✨ Thanks for contributing to AVA! ✨

Please note that this project is released with a [Contributor Code of Conduct](code-of-conduct.md). By participating in this project you agree to abide by its terms.

Translations: [Español](https://github.com/avajs/ava-docs/blob/master/es_ES/contributing.md), [Français](https://github.com/avajs/ava-docs/blob/master/fr_FR/contributing.md), [Italiano](https://github.com/avajs/ava-docs/blob/master/it_IT/contributing.md), [日本語](https://github.com/avajs/ava-docs/blob/master/ja_JP/contributing.md), [Português](https://github.com/avajs/ava-docs/blob/master/pt_BR/contributing.md), [Русский](https://github.com/avajs/ava-docs/blob/master/ru_RU/contributing.md), [简体中文](https://github.com/avajs/ava-docs/blob/master/zh_CN/contributing.md)

## How can I contribute?

### Improve documentation

As a user of AVA you're the perfect candidate to help us improve our documentation. Typo corrections, error fixes, better explanations, more examples, etc. Open issues for things that could be improved. [Help translate our docs.](https://github.com/avajs/ava-docs) Anything. Even improvements to this document.

Use the [`docs` label](https://github.com/avajs/ava/labels/docs) to find suggestions for what we'd love to see more documentation on.

### Improve issues

Some issues are created with missing information, not reproducible, or plain invalid. Help make them easier to resolve. Handling issues takes a lot of time that we could rather spend on fixing bugs and adding features.

### Give feedback on issues

We're always looking for more opinions on discussions in the issue tracker. It's a good opportunity to influence the future direction of AVA.

The [`question` label](https://github.com/avajs/ava/labels/question) is a good place to find ongoing discussions.

### Write code

You can use issue labels to discover issues you could help out with:

* [`babel` issues](https://github.com/avajs/ava/labels/babel) relate to our Babel infrastructure
* [`blocked` issues](https://github.com/avajs/ava/labels/blocked) need help getting unstuck
* [`bug` issues](https://github.com/avajs/ava/labels/bug) are known bugs we'd like to fix
* [`enhancement` issues](https://github.com/avajs/ava/labels/enhancement) are features we're open to including
* [`performance` issues](https://github.com/avajs/ava/labels/performance) track ideas on how to improve AVA's performance

The [`help wanted`](https://github.com/avajs/ava/labels/help%20wanted) and [`good for beginner`](https://github.com/avajs/ava/labels/good%20for%20beginner) labels are especially useful.

You may find an issue is assigned, or has the [`assigned` label](https://github.com/avajs/ava/labels/assigned). Please double-check before starting on this issue because somebody else is likely already working on it.

We'd like to fix [`priority` issues](https://github.com/avajs/ava/labels/priority) first. We'd love to see progress on [`low-priority` issues](https://github.com/avajs/ava/labels/low%20priority) too. [`future` issues](https://github.com/avajs/ava/labels/future) are those that we'd like to get to, but not anytime soon. Please check before working on these since we may not yet want to take on the burden of supporting those features.

If you're updating dependencies, please make sure you use npm@5.6.0 and commit the updated `package-lock.json` file.

### Hang out in our chat

We have a [chat](https://gitter.im/avajs/ava). Jump in there and lurk, talk to us, and help others.

## Submitting an issue

- The issue tracker is for issues. Use our [chat](https://gitter.im/avajs/ava) or [Stack Overflow](https://stackoverflow.com/questions/tagged/ava) for support.
- Search the issue tracker before opening an issue.
- Ensure you're using the latest version of AVA.
- Use a clear and descriptive title.
- Include as much information as possible: Steps to reproduce the issue, error message, Node.js version, operating system, etc.
- The more time you put into an issue, the more we will.
- [The best issue report is a failing test proving it.](https://twitter.com/sindresorhus/status/579306280495357953)

## Submitting a pull request

- Non-trivial changes are often best discussed in an issue first, to prevent you from doing unnecessary work.
- For ambitious tasks, you should try to get your work in front of the community for feedback as soon as possible. Open a pull request as soon as you have done the minimum needed to demonstrate your idea. At this early stage, don't worry about making things perfect, or 100% complete. Add a [WIP] prefix to the title, and describe what you still need to do. This lets reviewers know not to nit-pick small details or point out improvements you already know you need to make.
- New features should be accompanied with tests and documentation.
- Don't include unrelated changes.
- Lint and test before submitting the pull request by running `$ npm test`.
- Make the pull request from a [topic branch](https://github.com/dchelimsky/rspec/wiki/Topic-Branches), not master.
- Use a clear and descriptive title for the pull request and commits.
- Write a convincing description of why we should land your pull request. It's your job to convince us. Answer "why" it's needed and provide use-cases.
- You might be asked to do changes to your pull request. There's never a need to open another pull request. [Just update the existing one.](https://github.com/RichardLitt/knowledge/blob/master/github/amending-a-commit-guide.md)

Note: when making code changes, try to remember AVA's mantra (stolen from Python) of having preferably one way to do something. For example, a request to add an alias to part of the API ([like this](https://github.com/avajs/ava/pull/663)) will likely be rejected without some other substantial benefit.

*Looking to make your first ever contribution to an open-source project? Look no further! AVA may be one of the most welcoming projects and communities out there. Check out ["Making your first contribution"](https://medium.com/@vadimdemedes/making-your-first-contribution-de6576ddb190) blog post to start off the right way and make your work a part of AVA!*
