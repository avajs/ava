---
# sidebar: auto
sidebarDepth: 2
---

# Recipes

These recipes include guides for integrating other tools?

<ul>
  <li v-for="page of [ 'babel',
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
  'index',
  'isolated-mongodb-integration-tests',
  'jspm-systemjs',
  'passing-arguments-to-your-test-files',
  'puppeteer',
  'react',
  'test-setup',
  'typescript',
  'vue',
  'watch-mode',
  'when-to-use-plan' ]" :key="page">
    <router-link :to="`./${page}.html`">{{page.replace(/-/g, ' ')}}</router-link>
  </li>
</ul>
