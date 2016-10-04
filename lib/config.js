"use strict"

const async = require('async');
const r = require('rethinkdb');
const connection = require('./connection.js');

const dbSetup = function(callback) {

	let actions = {};

	// create the users table
	actions.createDB = (callback) => {

		r.connect(connection, (err, conn) => {

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

			r.table("messages")
			.indexCreate("time")
			.run(conn, (err, cursor) => {
				console.log("- Creating time index... " + (err?err.msg:"SUCCESS"))
				return callback(null, (err?false:true))
			})

		})

	}

	async.series(actions, (err, results) => {

		console.log(results);

		return callback();

	})

}

module.exports = {
	connection: connection,
	dbSetup: dbSetup
}