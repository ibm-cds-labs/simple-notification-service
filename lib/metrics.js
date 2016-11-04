"use strict";

const request = require('request');
module.exports = (opts, data) => {

	if (opts.enabled) {

		let q = [];

		Object.keys(data).forEach(d => {
			q.push(`${d}=${data[d]}`)
		})

		let url = `${opts.host}?${q.join('&')}`

		request(url);

	}

}