'use strict';

const delay = ms => new Promise(resolve => {
	setTimeout(resolve, ms);
});

exports.fetchUsers = async () => {
	await delay(50);

	return [
		{
			id: 1,
			firstName: 'Ava',
			name: 'Rocks',
			email: 'ava@rocks.com',
		},
	];
};

exports.fetchPosts = async userId => {
	await delay(200);

	return [
		{
			id: 1,
			userId,
			message: 'AVA Rocks 🚀',
		},
	];
};

exports.createPost = async message => {
	await delay(3000);

	return {
		id: 2,
		userId: 1,
		message,
	};
};
