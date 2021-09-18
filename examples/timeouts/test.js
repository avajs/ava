'use strict';
const test = require('ava');

const {fetchUsers, fetchPosts, createPost} = require('.');

test('retrieve users', async t => {
	t.timeout(100);

	const users = await fetchUsers();

	t.deepEqual(users, [
		{
			id: 1,
			firstName: 'Ava',
			name: 'Rocks',
			email: 'ava@rocks.com',
		},
	]);
});

test('retrieve posts', async t => {
	t.timeout(100, 'retrieving posts is too slow');

	const posts = await fetchPosts(1);

	t.deepEqual(posts, [
		{
			id: 1,
			userId: 1,
			message: 'AVA Rocks 🚀',
		},
	]);
});

test('create post', async t => {
	const post = await createPost('I love 🦄 and 🌈');

	t.deepEqual(post, {
		id: 2,
		userId: 1,
		message: 'I love 🦄 and 🌈',
	});
});
