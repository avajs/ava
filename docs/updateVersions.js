// Update releases.json for documentation

const fs = require('fs')
const releases = require('./.vuepress/public/releases.json')
releases.tags.splice(0, 0, { name: process.env.npm_package_version })

fs.writeFileSync(
	'./.vuepress/public/releases.json',
	JSON.stringify(releases, null, 2)
)
