"use strict"

const r = require('rethinkdb');
const hash = require('./hash.js')
const getCombinations 		= hash.getCombinations;
const createUniqueHashes 	= hash.createUniqueHashes;
const createSingleHash 		= hash.createSingleHash;
const events = require('events');

const updateHeartbeat = (connection, userID, callback) => {

	r.table("users")
	.get(userID)
	.update({heartbeat: r.now()})
	.run(connection, (err, cursor) => {
		console.log(`updated heartbeat data for ${userID}`)
		return callback();
	})

}

const insertUser = (connection, data, userID, callback) => {

	r.table("users").insert({
		id: userID,
		userData: data.userData,
		userHashes: createUniqueHashes(data.userData),
		queryHash: createSingleHash(data.userQuery),
		heartbeat: r.now()
	})
	.run(connection, (err, cursor) => {
		return callback(err, (err ? false : true));
	})

}

const fetchConnected = (connection, data, userID, callback) => {

	r.table("users")
	.getAll(createSingleHash(data.userQuery), {index: "userHashes"})('userData')
	.coerceTo("array")
	.run(connection, (err, cursor) => {

		if (err) return callback(err);

		cursor.toArray((err, users) => {

			// users = users.filter(user => {
			// 	if (user._socket_id == userID) {
			// 		return false
			// 	}
			// 	return true;
			// });

			return callback(null, users)
		})

	})

}

const sendConnected = (connection, data, callback) => {

	r.table("users")
	.getAll(
		r.args(createUniqueHashes(data.userData)),
		{ index: "queryHash" }
	)('id')
	.coerceTo("array")
	.run(connection, (err, cursor) => {

		if (err) return callback(err);

		cursor.toArray((err, users) => {

			users = users.filter(id => {
				if (id == data.id) {
					return false
				}
				return true;
			});

			return callback(null, users)

		})

	})

}

const getUser = (connection, userID, callback) => {

	r.table("users")
	.get(userID)
	.run(connection, (err, user) => {
		
		if (err) return callback(err);

		if (user === null) return callback(true);

		return callback(null, user)

	})

}

const deleteUser = (connection, userID, callback) => {

	r.table("users").get(userID).delete()
	.run(connection, (err, cursor) => {
		return callback(err, (err?false:true))
	})

}

const sendDisconnected = (connection, user, callback) => {

	r.table("users")
	.getAll(
		r.args(createUniqueHashes(user.userData)),
		{ index: "queryHash" }
	)('id')
	.coerceTo("array")
	.run(connection, (err, cursor) => {

		if (err) return callback(err);


		cursor.toArray((err, users) => {

			users = users.filter(id => {
				if (id == user.id) {
					return false
				}
				return true;
			});

			return callback(null, users)

		})

	})

}

const saveMessage = (connection, item, data, callback) => {

	r.table("users")
  .getAll(item, {index: "userHashes"})('id')
  .coerceTo('array')
  .run(connection, (err, cursor) => {

  	if (err) return;

  	cursor.toArray((err, ids) => {

  		r.table("messages")
  		.insert({
  		 	message: data,
  		 	ids: ids,
  		 	recipientHash: item,
  		 	time: r.now()
  		})
  		.run(connection, (err, cursor) => {
  			
  			if (err) return callback(err);

  			return callback(null, cursor);

  		})

  	})

  })

}

const messageStream = (connection) => {

	var e = new events.EventEmitter();

	// listen to messages table changefeed for incoming messages
	r.table("messages")
	.changes()
	.run(connection, (err, cursor) => {

		// for each new message
		cursor.each((err, msg) => {

			if (err) return;

			if (typeof msg === "object" && typeof msg.new_val === "object" && msg.new_val !== null) {

				// send the message to identified IDs
				msg.new_val.ids.forEach(id => {
					e.emit('notification', { 
						id: id,
						msg: msg.new_val.message
					})
				});

			}

		})

	})

	return e;

}

const userStream = (connection) => {

	var e = new events.EventEmitter();

	// listen to messages table changefeed for incoming messages
	r.table("users")
	.changes()
	.run(connection, (err, cursor) => {

		// for each new message
		cursor.each((err, user) => {

			if (err) return;

			// connecting user
			if (typeof user === "object" && typeof user.new_val === "object" && user.old_val == null) {

				// tell us we have a new user
				e.emit('connectingUser', user.new_val)

			}

			// disconnecting user
			if (typeof user === "object" && typeof user.old_val === "object" && user.new_val == null) {

				// tell us we have a disconnected user
				e.emit('disconnectingUser', user.old_val)

			}

		})

	})

	return e;

}

const removeOldUsers = (connection, seconds) => {

	console.log(`Cleaning up old users every ${seconds} seconds`);

	if (typeof seconds == "undefined" || !seconds) {
		seconds = 60*5;
	}

	r.table("users")
  .filter(
    r.row("heartbeat").lt(r.now().sub(seconds))
  )
  .delete()
  .run(connection)

}

const getHistorical = (connection, query, callback) => {

	if (query === null || typeof query !== "object" || Array.isArray(query)) {
		query = {};
	}

	if (typeof parseInt(query._limit) !== "number" || isNaN(parseInt(query._limit))) {
		var limit = 50;
	}

	else {
		var limit = parseInt(query._limit);
	}

	delete query._limit;

	r.table("messages")
	.getAll(createSingleHash(query), { index: "recipientHash" })
  .orderBy(r.desc('time'))
  .limit(limit)
  .run(connection, (err, cursor) => {

  	if (err) return callback(err);

  	return cursor.toArray(callback)

  })

}

module.exports = {
	updateHeartbeat: updateHeartbeat,
	insertUser: insertUser,
	fetchConnected: fetchConnected,
	sendConnected: sendConnected,
	getUser: getUser,
	deleteUser: deleteUser,
	sendDisconnected: sendDisconnected,
	saveMessage: saveMessage,
	messageStream: messageStream,
	userStream: userStream,
	removeOldUsers: removeOldUsers,
	getHistorical: getHistorical
}