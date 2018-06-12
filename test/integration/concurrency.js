'use strict';
const test = require('tap').test;
const {execCli} = require('../helper/cli');

['--concurrency', '-c'].forEach(concurrencyFlag => {
	test(`bails when ${concurrencyFlag} is provided without value`, t => {
		execCli(['test.js', concurrencyFlag], {dirname: 'fixture/concurrency'}, (err, stdout, stderr) => {
			t.is(err.code, 1);
			t.match(stderr, 'The --concurrency or -c flag must be provided with a nonnegative integer.');
			t.end();
		});
	});
});

['--concurrency', '-c'].forEach(concurrencyFlag => {
	test(`bails when ${concurrencyFlag} is provided with an input that is a string`, t => {
		execCli([`${concurrencyFlag}=foo`, 'test.js', concurrencyFlag], {dirname: 'fixture/concurrency'}, (err, stdout, stderr) => {
			t.is(err.code, 1);
			t.match(stderr, 'The --concurrency or -c flag must be provided with a nonnegative integer.');
			t.end();
		});
	});
});

['--concurrency', '-c'].forEach(concurrencyFlag => {
	test(`bails when ${concurrencyFlag} is provided with an input that is a float`, t => {
		execCli([`${concurrencyFlag}=4.7`, 'test.js', concurrencyFlag], {dirname: 'fixture/concurrency'}, (err, stdout, stderr) => {
			t.is(err.code, 1);
			t.match(stderr, 'The --concurrency or -c flag must be provided with a nonnegative integer.');
			t.end();
		});
	});
});

['--concurrency', '-c'].forEach(concurrencyFlag => {
	test(`bails when ${concurrencyFlag} is provided with an input that is negative`, t => {
		execCli([`${concurrencyFlag}=-1`, 'test.js', concurrencyFlag], {dirname: 'fixture/concurrency'}, (err, stdout, stderr) => {
			t.is(err.code, 1);
			t.match(stderr, 'The --concurrency or -c flag must be provided with a nonnegative integer.');
			t.end();
		});
	});
});

['--concurrency', '-c'].forEach(concurrencyFlag => {
	test(`works when ${concurrencyFlag} is provided with a value`, t => {
		execCli([`${concurrencyFlag}=1`, 'test.js'], {dirname: 'fixture/concurrency'}, err => {
			t.ifError(err);
			t.end();
		});
	});
});
