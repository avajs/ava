'use strict';

const app = (request, response) => {
	if (request.url === '/user') {
		response.setHeader('Content-Type', 'application/json');
		response.end(JSON.stringify({email: 'ava@rocks.com'}));
	} else {
		response.writeHead('404');
		response.end();
	}
};

module.exports = app;
