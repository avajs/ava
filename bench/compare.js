'use strict';
const path = require('path');
const fs = require('fs');
const Table = require('cli-table3');
const chalk = require('chalk');
const boundJson = require('../lib/bound-builtins').json;

let files = fs.readdirSync(path.join(__dirname, '.results'))
	.map(file => {
		const result = boundJson.parse(fs.readFileSync(path.join(__dirname, '.results', file), 'utf8'));
		result['.file'] = path.basename(file, '.json');
		return result;
	})
	// Find the most recent benchmark runs
	.sort((fileA, fileB) => fileB['.time'] - fileA['.time']);

function average(data) {
	const sum = data.reduce((sum, value) => sum + value, 0);
	const avg = sum / data.length;
	return avg;
}

function standardDeviation(values) {
	const avg = average(values);
	const squareDiffs = values.map(value => {
		const diff = value - avg;
		const sqrDiff = diff * diff;
		return sqrDiff;
	});
	const avgSquareDiff = average(squareDiffs);
	const stdDev = Math.sqrt(avgSquareDiff);
	return stdDev;
}

// Only the 3 most recent runs
files = files.slice(0, 3);

function prepStats(times) {
	times = times
		.map(time => time.time)
		.sort((timeA, timeB) => timeA - timeB);

	// Remove fastest and slowest
	times = times.slice(1, times.length - 1);

	const sum = times.reduce((a, b) => a + b, 0);

	return {
		mean: Math.round((sum / times.length) * 1000) / 1000,
		median: times[Math.floor(times.length / 2)],
		stdDev: standardDeviation(times).toFixed(4),
		min: times[0],
		max: times[times.length - 1]
	};
}

const results = {};
const fileNames = files.map(file => file['.file']);
const stats = ['mean', 'stdDev', 'median', 'min', 'max'];

for (const file of files) {
	Object.keys(file)
		.filter(key => !key.startsWith('.'))
		.forEach(key => {
			results[key] = results[key] || {};
			results[key][file['.file']] = prepStats(file[key]);
		});
}

const table = new Table();
table.push(
	[''].concat(stats.map(stat => {
		return {
			content: stat,
			colSpan: fileNames.length,
			hAlign: 'center'
		};
	})),
	stats.reduce(arr => arr.concat(fileNames), ['args'])
);

for (const key of Object.keys(results)) {
	table.push(stats.reduce((arr, stat) => {
		let min = Infinity;
		let max = -Infinity;

		const statGroup = fileNames.map(fileName => {
			let result = results[key][fileName];
			result = result && result[stat];

			if (result) {
				min = Math.min(min, result);
				max = Math.max(max, result);
				return result;
			}

			return '';
		});

		return arr.concat(statGroup.map(stat => {
			if (stat === min) {
				return chalk.green(stat);
			}

			if (stat === max) {
				return chalk.red(stat);
			}

			return stat;
		}));
	}, [key]));
}

console.log(table.toString());
