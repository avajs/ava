module.exports = {
	title: 'AVA JS',
	description: 'Futuristic test runner',
	head: [['link', { rel: 'icon', href: '/logo.png' }]],
	themeConfig: {
		repo: 'avajs/ava',
		docsDir: 'docs',
		nav: [
			{ text: 'Home', link: '/' },
			{ text: 'Guide', link: '/guide/' },
			{ text: 'Recipes', link: '/recipes/' },
			{
				text: 'Related',
				items: [
					{
						text: 'Eslint Plugin',
						link: 'https://github.com/avajs/eslint-plugin-ava'
					},
					{
						text: 'Sublime Plugin',
						link: 'https://github.com/avajs/sublime-ava'
					},
					{
						text: 'VS Code Plugin',
						link: 'https://github.com/samverschueren/vscode-ava'
					},
					{
						text: 'Gulp Plugin',
						link: 'https://github.com/avajs/gulp-ava'
					},
					{
						text: 'Grunt Plugin',
						link: 'https://github.com/avajs/grunt-ava'
					},
					{
						text: 'More',
						link: 'https://github.com/avajs/awesome-ava#packages'
					}
				]
			},
			{
				text: 'Links',
				items: [
					{
						text: 'AVA stickers, t-shirts, etc',
						link:
							'https://www.redbubble.com/people/sindresorhus/works/30330590-ava-logo'
					},
					{
						text: 'Awesome list',
						link: 'https://github.com/avajs/awesome-ava'
					},
					{
						text: 'AVA Casts',
						link: 'http://avacasts.com'
					}
				]
			}
		],
		sidebar: {
			'/guide/': [
				'',
				'01-writing-tests',
				'02-execution-context',
				'03-assertions',
				'04-snapshot-testing.md',
				'05-command-line',
				'06-configuration',
				'07-test-timeouts',
				'08-common-pitfalls'
			],
			'/recipes/': [
				'',
				'babel',
				'babelrc',
				'browser-testing',
				'code-coverage',
				'debugging-with-chrome-devtools',
				'debugging-with-vscode',
				'debugging-with-webstorm',
				'endpoint-testing-with-mongoose',
				'endpoint-testing',
				'es-modules',
				'flow',
				'isolated-mongodb-integration-tests',
				'jspm-systemjs',
				'passing-arguments-to-your-test-files',
				'puppeteer',
				'react',
				'test-setup',
				'typescript',
				'vue',
				'watch-mode',
				'when-to-use-plan'
			]
		},
		editLinks: true
	}
}
