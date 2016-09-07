"use strict"
/*****
	Express and Socket.IO
*****/
const express = require('express');
const app = express();
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require('fs');
const cfenv = require('cfenv');
const	appEnv = cfenv.getAppEnv()

/*****
	Bodyparser etc... for POST requests
*****/
const bodyParser = require('body-parser');
const bpJSON = bodyParser.json();
const bpUrlencoded = bodyParser.urlencoded({ extended: true});

/*****
	Other stuff
*****/
const md5 = require('md5');
const async = require('async');

/*****
	Find IP info
*****/
const publicIP = appEnv.url || require('internal-ip').v4() + ":3000";

/*****
	RethinkDB
*****/
const r = require("rethinkdb");

// Local connection Object
const connection = {
	db: "test"
}

const getCombinations = function(chars) {
  var result = [];
  var f = function(prefix, chars) {
    for (var i = 0; i < chars.length; i++) {
      result.push(prefix + chars[i]);
      f(prefix + chars[i], chars.slice(i + 1));
    }
  }
  f('', chars);
  return result;
}

const createUniqueHashes = function(obj) {

	if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
		obj = {};
	}

	// make sure we don't go multi level
	obj = Object.keys(obj).reduce(function(previous, current) {
    if (typeof obj[current] !== "object") {
    	previous[current] = obj[current]
    }
    return previous;
	}, {});

	// get our items in 'key-value' style, sorted alphabetically
	let items = Object.keys(obj)
							.map(key => `${key}-${obj[key]}/`)
							.sort();

	// get the different combinations of these items
	let combos = getCombinations(items)
							 .map(e => md5(e.replace(/\/$/, '')));

	return combos;

}

const createSingleHash = function(obj) {

	return md5(
			Object.keys(obj)
		 	.map(key => `${key}-${obj[key]}`)
		 	.sort()
		 	.join("/")
	);

}

// Compose connection Object
// const connection = {
//   host: "<host>",
//   port: <port>,
//   user: "<user>",
//   password: "<password>",
//   ssl: {
//     ca: new Buffer(fs.readFileSync('/path/to/cert.ca', "utf8"))
//   },
// 	 db: "<db name>"
// }

/*****
	API endpoints
*****/

/*****
	IO Stuff
*****/
io.on('connect', socket => {

	console.log(`${socket.id} connected...`)

	// flag user as being updated when we receive a heartbeat
	// this will help us tidy up the users table later
	socket.conn.on('heartbeat', function() {
    
    r.connect(connection, (err, conn) => {

    	if (err) return;

    	r.table("users")
    	.get(socket.id)
    	.update({heartbeat: r.now()})
    	.run(conn, (err, cursor) => {
    		console.log(`updated heartbeat data for ${socket.id}`)
    		conn.close()
    	})

    });

  });

	// Client supplies descriptive data about themselves (userData)
	// can also supply a query that describes other users they care about (userQuery)
	socket.on('myData', data => {

		// make sure obj is an object
		if (data.userData === null || typeof data.userData !== "object" || Array.isArray(data.userData)) {
			data.userData = {};
		}

		data.userData._socket_id = socket.id

		// stash them in the DB
		r.connect(connection, (err, conn) => {

			if (err) return;

			let actions = {};

			// insert the user
			actions.insertUser = (callback) => {

				r.table("users").insert({
					id: socket.id,
					userData: data.userData,
					userHashes: createUniqueHashes(data.userData),
					queryHashes: createSingleHash(data.userQuery),
					heartbeat: r.now()
				})
				.run(conn, (err, cursor) => {
					return callback(err, (err || true));
				})

			}

			// find who else is connected that we care about
			actions.fetchConnected = (callback) => {

				r.table("users")
				.getAll(createSingleHash(data.userQuery), {index: "userHashes"})('userData')
				.coerceTo("array")
				.run(conn, (err, cursor) => {

					if (err) return callback(err);

					cursor.toArray((err, users) => {

						users = users.filter(user => {
							if (user._socket_id == socket.id) {
								return false
							}
							return true;
						});

						return callback(null, users)
					})

				})

			}

			// find who else is connected that cares about us
			actions.sendConnected = (callback) => {

				r.table("users")
				.getAll(
					r.args(createUniqueHashes(data.userData)),
					{ index: "queryHashes" }
				)('id')
				.coerceTo("array")
				.run(conn, (err, cursor) => {

					if (err) return callback(err);


					cursor.toArray((err, users) => {

						users = users.filter(id => {
							if (id == socket.id) {
								return false
							}
							return true;
						});

						return callback(null, users)

					})

				})

			}

			async.series(actions, (err, results) => {
				
				conn.close();

				// send back a list of currently connected users that match the userQuery
				if (typeof results.fetchConnected == "object" && results.fetchConnected.length >= 0) {
					socket.emit('currentUsers', results.fetchConnected)
				}

				// send this clients userData to any connected user whose userQuery matches this clients userData
				if (typeof results.sendConnected == "object" && results.sendConnected.length >= 0) {
					results.sendConnected.forEach(id => {
						io.to(id).emit("connectedUser", data.userData)
					})
				}

			})

		})

	})

	// when the socket disconnects, remove by socket ID
	socket.on('disconnect', () => {
		
		console.log(`${socket.id} disconnected...`)

		let actions = {}
		let userData = null;

		r.connect(connection, (err, conn) => {

			if (err) return;
		
			actions.getUser = (callback) => {

				r.table("users")
				.get(socket.id)
				.run(conn, (err, user) => {
					
					if (err) return callback(err);

					if (user === null) return callback(true);

					userData = user.userData;
					return callback(null, user)

				})

			}

			actions.deleteUser = (callback) => {

				r.table("users").get(socket.id).delete()
				.run(conn, (err, cursor) => {
					return callback(err, (err?false:true))
				})

			}

			actions.sendDisconnected = (callback) => {

				r.table("users")
				.getAll(
					r.args(createUniqueHashes(userData)),
					{ index: "queryHashes" }
				)('id')
				.coerceTo("array")
				.run(conn, (err, cursor) => {

					if (err) return callback(err);


					cursor.toArray((err, users) => {

						users = users.filter(id => {
							if (id == socket.id) {
								return false
							}
							return true;
						});

						return callback(null, users)

					})

				})

			}

			async.series(actions, (err, results) => {

				conn.close();

				if (err) return;

				// send this clients userData to any connected user whose userQuery matches this clients userData
				if (typeof results.sendDisconnected == "object" && results.sendDisconnected.length >= 0) {
					results.sendDisconnected.forEach(id => {
						io.to(id).emit("disconnectedUser", results.getUser.userData)
					})
				}

			})

		})
			
	})

	// when the client sends a message
	// determine the Socket IDs to send it to
	// store this data in the messages table
	socket.on('msg', msg => {

		let query = msg.query;
		let data 	= msg.data;

		// get our item in 'key-value' style from the query
		let item = createSingleHash(query);

		r.connect(connection, (err, conn) => {

			if (err) return;

			r.table("users")
		  .getAll(item, {index: "userHashes"})('id')
		  .coerceTo('array')
		  .run(conn, (err, cursor) => {

		  	if (err) return;

		  	cursor.toArray((err, ids) => {

		  		r.table("messages")
		  		.insert({
		  		 	message: data,
		  		 	ids: ids,
		  		 	time: r.now()
		  		})
		  		.run(conn, (err, cursor) => {
		  			conn.close()
		  		})

		  	})

		  })
		})

	})

})

/*****
	RethinkDB changefeed
*****/

r.connect(connection, (err, conn) => {

	if (err) return;

	// listen to messages table changefeed for incoming messages
	r.table("messages")
	.changes()
	.run(conn, (err, cursor) => {

		// for each new message
		cursor.each((err, msg) => {

			if (err) return;

			if (typeof msg === "object" && typeof msg.new_val === "object" && msg.new_val !== null) {

				// send the message to identified IDs
				msg.new_val.ids.forEach(id => {
					io.to(id).emit('msg', msg.new_val.message)
				});

			}

		})

	})

})

/*****
	FRONT END
*****/

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/public/index.html');
});

// serve static files from /public
app.use(express.static(__dirname + '/public'));

/*****
	Listening
*****/
http.listen(appEnv.port, ( appEnv.bind == "localhost" ? null : appEnv.bind ), () => {
  console.log(`listening on ${appEnv.url || publicIP}`);
});