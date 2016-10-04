"use strict"

const connection = require('./lib/config.js').connection
const async = require('async');
const r = require('rethinkdb');
const prompt = require('prompt');

prompt.start();

let actions = {};

// make sure we are talking to the correct DB
actions.confirmConnection = (callback) => {

	console.log("*********************************")
	console.log(JSON.stringify(connection, null, 2))
	console.log("*********************************")
	prompt.get({
		properties: {
			confirm: {
				description: "This is your current DB connection string, are you happy with this? (yes/no)"
			}
		}
	}, (err, result) => {
    
		if (result.confirm !== "yes") {
			console.log("Please modify the /lib/config.js to reflect your required DB configuration")
			return callback("Invalid DB configuration", false);
		}
		return callback(null, true)

  });

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

	if (err) {
		console.log("There were errors during the setup process")
		console.log(err);
	}

	process.exit(0);

})