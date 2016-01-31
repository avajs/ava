'use strict';

var path = require('path');
var fs = require('fs');
var Table = require('cli-table2');
var chalk = require('chalk');

var files = fs.readdirSync(path.join(__dirname, '.results'))
	.map(function (file) {
		var result = JSON.parse(fs.readFileSync(path.join(__dirname, '.results', file), 'utf8'));
		result['.file'] = path.basename(file, '.json');
		return result;
	})
	// find the most recent benchmark runs
	.sort(function (fileA, fileB) {
		return fileB['.time'] - fileA['.time'];
	});

// Only the 3 most recent runs
files = files.slice(0, 3);

function prepStats(times) {
	times = times
		.map(function (time) {
			return time.time;
		})
		.sort(function (timeA, timeB) {
			return timeA - timeB;
		});

	// remove fastest and slowest
	times = times.slice(1, times.length - 1);

	var sum = times.reduce(function (a, b) {
		return a + b;
	}, 0);

	return {
		mean: Math.round((sum / times.length) * 1000) / 1000,
		median: times[Math.floor(times.length / 2)],
		min: times[0],
		max: times[times.length - 1]
	};
}

var results = {};
var fileNames = files.map(function (file) {
	return file['.file'];
});
var stats = ['mean', 'median', 'min', 'max'];

files.forEach(function (file) {
	Object.keys(file)
		.filter(function (key) {
			return !/^\./.test(key);
		})
		.forEach(function (key) {
			results[key] = results[key] || {};
			results[key][file['.file']] = prepStats(file[key]);
		});
});

var table = new Table();
table.push(
	[''].concat(stats.map(function (stat) {
		return {
			content: stat,
		  colSpan: fileNames.length,
			hAlign: 'center'
		}
	})),
	stats.reduce(function (arr) {
		return arr.concat(fileNames);
	}, ['args'])
);

Object.keys(results)
	.forEach(function (key) {
		table.push(stats.reduce(function (arr, stat) {
			var min = Infinity;
			var max = -Infinity;

			var statGroup = fileNames.map(function (fileName) {
				var result = results[key][fileName];
				result = result && result[stat];
				if (result) {
					min = Math.min(min, result);
					max = Math.max(max, result);
					return result;
				}
				return '';
      });
      return arr.concat(statGroup.map(function (stat) {
				if (stat === min) {
					return chalk.green(stat);
				}
				if (stat === max) {
					return chalk.red(stat)
				}
				return stat;
			}));
		}, [key]));
	});

console.log(table.toString());
//console.log(files.map(function (file) {return file['.file']}));



