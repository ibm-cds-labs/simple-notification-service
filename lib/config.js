"use strict"

const async = require('async');
const r = require('rethinkdb');
const connection = require('./connection.js');
const url = require('url')

const dbSetup = function(authentication, callback) {

	let actions = {};

	// create the users table
	actions.createDB = (callback) => {

		r.connect(connection, (err, conn) => {

			if (err) return callback(err);

			r.dbCreate("sns")
			.run(conn, (err, cursor) => {
				console.log("- Creating database... " + (err?err.msg:"SUCCESS"))
				return callback(null, (err?false:true))
			})

		})

	}

	// create the users table
	actions.createUsersTable = (callback) => {

		r.connect(connection, (err, conn) => {

			if (err) return callback(err);

			r.tableCreate("users")
			.run(conn, (err, cursor) => {
				console.log("- Creating users table... " + (err?err.msg:"SUCCESS"))
				return callback(null, (err?false:true))
			})

		})

	}

	// create the messages table
	actions.createMessagesTable = (callback) => {

		r.connect(connection, (err, conn) => {

			if (err) return callback(err);

			r.tableCreate("messages")
			.run(conn, (err, cursor) => {
				console.log("- Creating messages table... " + (err?err.msg:"SUCCESS"))
				return callback(null, (err?false:true))
			})

		})

	}

	// create the queryHash index on users table
	actions.createQueryHashIndex = (callback) => {

		r.connect(connection, (err, conn) => {

			if (err) return callback(err);

			r.table("users")
			.indexCreate("queryHash")
			.run(conn, (err, cursor) => {
				console.log("- Creating queryHash index... " + (err?err.msg:"SUCCESS"))
				return callback(null, (err?false:true))
			})

		})

	}

	// create the userHashes index on users table
	actions.createUserHashesIndex = (callback) => {

		r.connect(connection, (err, conn) => {

			if (err) return callback(err);

			r.table("users")
			.indexCreate("userHashes", { multi: true })
			.run(conn, (err, cursor) => {
				console.log("- Creating userHashes index... " + (err?err.msg:"SUCCESS"))
				return callback(null, (err?false:true))
			})

		})

	}

	// create the recipientHash index on messages table
	actions.createRecipientHashIndex = (callback) => {

		r.connect(connection, (err, conn) => {

			if (err) return callback(err);

			r.table("messages")
			.indexCreate("recipientHash")
			.run(conn, (err, cursor) => {
				console.log("- Creating recipientHash index... " + (err?err.msg:"SUCCESS"))
				return callback(null, (err?false:true))
			})

		})

	}

	// create the time index on messages table
	actions.createTimeIndex = (callback) => {

		r.connect(connection, (err, conn) => {

			if (err) return callback(err);

			r.table("messages")
			.indexCreate("time")
			.run(conn, (err, cursor) => {
				console.log("- Creating time index... " + (err?err.msg:"SUCCESS"))
				return callback(null, (err?false:true))
			})

		})

	}

	// create the authentication table
	actions.createAuthenticationTable = (callback) => {

		r.connect(connection, (err, conn) => {

			if (err) return callback(err);

			r.tableCreate("authentication")
			.run(conn, (err, cursor) => {
				console.log("- Creating authentication table... " + (err?err.msg:"SUCCESS"))
				return callback(null, (err?false:true))
			})

		})

	}

	// create the hostname index on authentication table
	actions.createHostnameIndex = (callback) => {

		r.connect(connection, (err, conn) => {

			if (err) return callback(err);

			r.table("authentication")
			.indexCreate("hostname")
			.run(conn, (err, cursor) => {
				console.log("- Creating hostname index... " + (err?err.msg:"SUCCESS"))
				return callback(null, (err?false:true))
			})

		})

	}

	// create the key index on authentication table
	actions.createKeyIndex = (callback) => {

		r.connect(connection, (err, conn) => {

			if (err) return callback(err);

			r.table("authentication")
			.indexCreate("key")
			.run(conn, (err, cursor) => {
				console.log("- Creating key index... " + (err?err.msg:"SUCCESS"))
				return callback(null, (err?false:true))
			})

		})

	}

	if (typeof authentication == "object" && authentication.length) {

		actions.createAuthenticationKeys = (callback) => {

			authentication = authentication.map((a) => {

				if (a.hostname.match(/^https?:\/\//) === null) {
					a.hostname = `http://${a.hostname}`
				}

				let h = url.parse(a.hostname);

				return {
					id: a.hostname || null,
					hostname: h.hostname || null,
					key: a.key || null
				};
			})

			r.connect(connection, (err, conn) => {

				if (err) return callback(err);

				r.table("authentication")
				.insert(authentication, { conflict: "update" })
				.run(conn, (err, cursor) => {
					console.log("- Creating authentication keys..." + (err?err.msg:"SUCCESS"));
					return callback(null, (err?false:true));
				})

			})

		}

	}

	async.series(actions, (err, results) => {

		if (err) return callback(err);

		return callback();

	})

}

module.exports = {
	connection: connection,
	dbSetup: dbSetup
}