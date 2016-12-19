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
const hash = require('./lib/hash.js');
const connected = require('./lib/connected.js')
const createSingleHash 		= hash.createSingleHash;
const db 									=	require('./lib/db.js');
const cleanupFrequency		=	60; //seconds
const url = require('url');
const isloggedin = require('./lib/isloggedin.js');
const log = require('./lib/metrics.js');

// Use Passport to provide basic HTTP auth when locked down
const passport = require('passport');
passport.use(isloggedin.passportStrategy());

/*****
	RethinkDB
*****/
const r = require("rethinkdb");
const rOpts = require('./lib/config.js').connection

/*****
	Service Discovery
*****/

app.locals = {
  discovery: ( process.env.ETCD_URL ? true : false ),
  metrics: {
    enabled: false,
    name: null,
    host: null
  }
};

var registry = require('./lib/discovery.js')(app.locals);

/*****
	API endpoints
*****/

// create a new authkey
// requires HTTP auth if lockdown=true
app.post('/authkey', isloggedin.auth, bpJSON, (req, res) => {

	// make sure we have a body
	if (typeof req.body !== "object" || req.body === null) {
		return res.status(404).send({
			success: false
		})
	}

	// parse the values for hostname and key
	let hostname = req.body.hostname || null
	let key = req.body.key || null

	if (hostname === null || key === null) {
		return res.status(404).send({
			success: false,
			error: "You must supply both a hostname and a key"
		})
	}

	// force http(s) protocol at the beginning if not present
	// and make sure we have a hostname
	if (hostname.match(/^https?:\/\//) === null) {
		hostname = `http://${hostname}`
	}

	let h = url.parse(hostname);

	if (h.hostname === null) {
		return res.status(404).send({
			success: false,
			error: "You must supply a valid hostname"
		})
	}

	// connect to DB and insert new record
	r.connect(rOpts, (err, conn) => {

		if (err) return res.status(404).send({
			success: false,
			error: "SNS: Failed to connect to database"
		});

		let data = {
			hostname: h.hostname,
			key: key
		}

    db.createAuthKey(conn, data, (err, cursor) => {

			conn.close();

			return res.send({
				success: ( err ? false : true )
			});

		});

	});

})

// delete authkey by unique id
// requires HTTP auth if lockdown=true
app.delete('/authkey/:id', isloggedin.auth, (req, res) => {

	// connect to DB and delete record
	r.connect(rOpts, (err, conn) => {

		if (err) return res.status(404).send({
			success: false,
			error: "SNS: Failed to connect to database"
		});

    db.deleteAuthKey(conn, req.params.id, (err, cursor) => {

			conn.close();

			return res.send({
				success: ( err ? false : true )
			});

		});

	});

})

// get list of authkeys
// requires HTTP auth if lockdown=true
app.get('/authkeys', isloggedin.auth, (req, res) => {

	r.connect(rOpts, (err, conn) => {

		if (err) return res.status(404).send({
			success: false,
			error: "SNS: Failed to connect to database"
		});

    db.getAuthKeys(conn, (err, keys) => {

			conn.close();

			if (err) {
				return res.status(404).send({
					success: false,
					error: err
				});
			}

			return res.send({
				success: true,
				keys: keys
			});

		});

	});

});

// POST a new notification via API
// requires valid API key
app.post('/:key/notification', cors(), bpJSON, (req, res) => {

	if (typeof req.body !== "object" || req.body === null) {
		return res.status(404).send({
			success: false
		})
	}

	let query = req.body.userQuery || {};
	let data 	= req.body.notification || {};

	// get our item in 'key-value' style from the query
	let item = createSingleHash(query);

	r.connect(rOpts, (err, conn) => {

		if (err) return res.status(404).send({
			success: false,
			error: "SNS: Failed to connect to database"
		});

    db.authenticateLite(conn, req.params.key, (err, matches) => {

    	if (matches.length !== 1) {
    		return res.status(404).send({
    			success: false,
    			error: "SNS: Failed to authenticate"
    		})
    	}

    	db.saveMessage(conn, item, data, (err, cursor) => {

				conn.close();

				return res.send({
					success: ( err ? false : true )
				});

			});

		});

	});

});

// GET historical notifications via API
// requires valid API key
app.get('/:key/historical', cors(), (req, res) => {

	r.connect(rOpts, (err, conn) => {

    if (err) return res.status(404).send({
			success: false,
			error: "SNS: Failed to connect to database"
		});

    db.authenticateLite(conn, req.params.key, (err, matches) => {

    	if (matches.length !== 1) {
    		return res.status(404).send({
    			success: false,
    			error: "SNS: Failed to authenticate"
    		});
    	}

    	db.getHistorical(conn, req.query, (err, messages) => {

	    	if (err) return res.status(404).send({
	    		success: false,
	    		error: err
	    	});

	    	return res.send({
	    		success: true,
	    		notifications: messages.map(msg => msg.message)
	    	});

	    });

    }); 

  });

});

// GET count of sent notifications via API
// requires valid API key
app.get('/:key/count', cors(), (req, res) => {

	r.connect(rOpts, (err, conn) => {

    if (err) return res.status(404).send({
			success: false,
			error: "SNS: Failed to connect to database"
		});

    db.authenticateLite(conn, req.params.key, (err, matches) => {

    	if (matches.length !== 1) {
    		return res.status(404).send({
    			success: false,
    			error: "SNS: Failed to authenticate"
    		});
    	}

    	db.getMessageCount(conn, (err, count) => {

	    	if (err) return res.status(404).send({
	    		success: false,
	    		error: err
	    	})

	    	res.send({
	    		success: true,
	    		count: count
	    	});

	    });

    });

  });

});

/*****
	IO Stuff
*****/
io.on('connect', socket => {

	console.log(`${socket.id} connected...`)
	connected.push(socket.id);
	log(app.locals.metrics, { action: "connected", id: encodeURIComponent(socket.id) })

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

		// make sure data is an object
		if (typeof data === "undefined" || data === null) {
			data = {}
		}

		// and that we have some user data
		if (data.userData === null || typeof data.userData !== "object" || Array.isArray(data.userData)) {
			data.userData = {};
		}

		data.userData._socket_id = socket.id

		// authenticate, and if fine
		// stash them in the DB
		r.connect(rOpts, (err, conn) => {

			if (err) return;

			let actions = {};

			actions.authenticate = (callback) => {

				db.authenticate(conn, data.authentication || null, callback)

			}

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

				if (err) {
					socket.emit('authenticationFail')
					socket.disconnect()
					return;
				}

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
		connected.remove(socket.id);
		log(app.locals.metrics, { action: "disconnected", id: encodeURIComponent(socket.id) })

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
  res.sendFile(__dirname + '/public/demo/chat/chat.html');
});

app.get('/soccer', (req, res) => {
  res.sendFile(__dirname + '/public/demo/soccer/soccer.html');
});

app.get('/soccer/admin', (req, res) => {
  res.sendFile(__dirname + '/public/demo/soccer/admin.html');
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
			if (!connected.exists(data.id)) return false;
			io.to(data.id).emit('notification', data.msg);
			log(app.locals.metrics, { action: "notification", id: encodeURIComponent(data.id), data: JSON.stringify(data.msg) })
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
						if (!connected.exists(id)) return false;
						io.to(id).emit("connectedUser", user.userData)
						log(app.locals.metrics, { action: "connectionNotification", id: encodeURIComponent(id) })
					})
				}

			})

		})

		userStream.on('disconnectingUser', (user) => {
			
			db.sendDisconnected(conn, user, (err, users) => {

				// send this clients userData to any connected user whose userQuery matches this clients userData
				if (typeof users == "object" && users.length >= 0) {
					users.forEach(id => {
						if (!connected.exists(id)) return false;
						io.to(id).emit("disconnectedUser", user.userData)
						log(app.locals.metrics, { action: "disconnectionNotification", id: encodeURIComponent(id) })
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

});

require("cf-deployment-tracker-client").track();