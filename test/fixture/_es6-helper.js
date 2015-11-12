'use strict';

export default function () {
	return Promise.resolve('es6').then(prefix => prefix + ' helper');
}
