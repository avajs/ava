const delay = ms => new Promise(resolve => {
	setTimeout(resolve, ms);
});

export async function fetchUsers() {
	await delay(50);

	return [{
		id: 1,
		firstName: 'Ava',
		name: 'Rocks',
		email: 'ava@rocks.com',
	}];
}

export async function fetchPosts(userId) {
	await delay(200);

	return [{
		id: 1,
		userId,
		message: 'AVA Rocks 🚀',
	}];
}

export async function createPost(message) {
	await delay(3000);

	return {
		id: 2,
		userId: 1,
		message,
	};
}
