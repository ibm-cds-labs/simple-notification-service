"use strict"

/*****
	Express and Socket.IO
*****/
const express = require('express');
const app = express();
const cors = require('cors');
const http = require('http').Server(app);
const io = require('socket.io')(http);
const fs = require('fs');
const cfenv = require('cfenv');
const	appEnv = cfenv.getAppEnv();
const dbSetup = require('./lib/config.js').dbSetup;

/*****
	Bodyparser etc... for POST requests
*****/
const bodyParser = require('body-parser');
const bpJSON = bodyParser.json();
const bpUrlencoded = bodyParser.urlencoded({ extended: true});

/*****
	Other stuff
*****/
const async = require('async');
const hash = require('./lib/hash.js')
const createSingleHash 		= hash.createSingleHash;
const db 									=	require('./lib/db.js');
const cleanupFrequency		=	60; //seconds

/*****
	RethinkDB
*****/
const r = require("rethinkdb");
const rOpts = require('./lib/config.js').connection
console.log(rOpts);
/*****
	API endpoints
*****/

app.get('/historical', cors(), (req, res) => {

	r.connect(rOpts, (err, conn) => {

    if (err) return;

    db.getHistorical(conn, req.query, (err, messages) => {

    	if (err) return res.status(404).send({
    		success: false,
    		error: err
    	})

    	res.send({
    		success: true,
    		notifications: messages.map(msg => msg.message)
    	})

    })

  })

})

app.get('/count', cors(), (req, res) => {

	r.connect(rOpts, (err, conn) => {

    if (err) return;

    db.getMessageCount(conn, (err, count) => {

    	if (err) return res.status(404).send({
    		success: false,
    		error: err
    	})

    	res.send({
    		success: true,
    		count: count
    	})

    })

  })

})

/*****
	IO Stuff
*****/
io.on('connect', socket => {

	console.log(`${socket.id} connected...`)

	// flag user as being updated when we receive a heartbeat
	// this will help us tidy up the users table later
	socket.conn.on('heartbeat', function() {
    
    r.connect(rOpts, (err, conn) => {

    	if (err) return;

    	db.updateHeartbeat(conn, socket.id, () => {
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
		r.connect(rOpts, (err, conn) => {

			if (err) return;

			let actions = {};

			// insert the user
			actions.insertUser = (callback) => {

				db.insertUser(conn, data, socket.id, callback)

			}

			// find who else is connected that we care about
			actions.fetchConnected = (callback) => {

				db.fetchConnected(conn, data, socket.id, callback)

			}

			async.series(actions, (err, results) => {
				
				conn.close();

				// send back a list of currently connected users that match the userQuery
				if (typeof results.fetchConnected == "object" && results.fetchConnected.length >= 0) {
					socket.emit('currentUsers', results.fetchConnected)
				}

			})

		})

	})

	// when the socket disconnects, remove by socket ID
	socket.on('disconnect', () => {
		
		console.log(`${socket.id} disconnected...`);

		r.connect(rOpts, (err, conn) => {

			db.deleteUser(conn, socket.id, (err, success) => {
				conn.close();
			})

		})
			
	})

	// when the client sends a message
	// determine the Socket IDs to send it to
	// store this data in the messages table
	socket.on('notification', msg => {

		let query = msg.query;
		let data 	= msg.data;

		// get our item in 'key-value' style from the query
		let item = createSingleHash(query);

		r.connect(rOpts, (err, conn) => {

			if (err) return;

			db.saveMessage(conn, item, data, (err, cursor) => {

				conn.close();

				return;

			})

		})

	})

});

/*****
	FRONT END
*****/

app.get('/chat', (req, res) => {
  res.sendFile(__dirname + '/public/chat.html');
});

app.get('/status', (req, res) => {
  res.sendFile(__dirname + '/public/status.html');
});

// serve static files from /public
app.use(express.static(__dirname + '/public'));

// attempt to set up the DB before running the app.
dbSetup(() => {

	/*****
		RethinkDB changefeeds
	*****/

	r.connect(rOpts, (err, conn) => {

		if (err) return;

		const msgStream = db.messageStream(conn);

		msgStream.on('notification', (data) => {
			io.to(data.id).emit('notification', data.msg);
		})

		msgStream.on('notificationPing', () => {
			io.emit('notificationPing');
		})

		const userStream = db.userStream(conn);

		userStream.on('connectingUser', (user) => {
			
			db.sendConnected(conn, user, (err, users) => {

				// send this clients userData to any connected user whose userQuery matches this clients userData
				if (typeof users == "object" && users.length >= 0) {
					users.forEach(id => {
						io.to(id).emit("connectedUser", user.userData)
					})
				}

			})

		})

		userStream.on('disconnectingUser', (user) => {
			
			db.sendDisconnected(conn, user, (err, users) => {

				// send this clients userData to any connected user whose userQuery matches this clients userData
				if (typeof users == "object" && users.length >= 0) {
					users.forEach(id => {
						io.to(id).emit("disconnectedUser", user.userData)
					})
				}

			})

		})

		/*****
			Tidy up old users
			(re-using the changefeed connection)
		****/
		db.removeOldUsers(conn, cleanupFrequency);
		setInterval(() => {
			db.removeOldUsers(conn, cleanupFrequency);
		}, (cleanupFrequency * 1000))

	})

	/*****
		Listening
	*****/
	http.listen(appEnv.port, ( appEnv.bind == "localhost" ? null : appEnv.bind ), () => {
	  console.log(`listening on ${appEnv.url || publicIP}`);
	});

})

	