"use strict";

const sockets = [];

const push = function(socket_id) {
	
	if (sockets.indexOf(socket_id) === -1) {
		sockets.push(socket_id);
	}

}

const remove = function(socket_id) {

	let index = sockets.indexOf(socket_id);

	if (index === -1) return false;

	sockets.splice(index, 1);

	return true;

}

const exists = function(socket_id) {

	let index = sockets.indexOf(socket_id);

	if (index === -1) return false;

	return true;

}

module.exports = {
	push: push,
	remove: remove,
	get: sockets,
	exists: exists
}