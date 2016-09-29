# Simple Notification Service
The Simple Notification Service (SNS) is a scalable, queryable, realtime notification micro service that is designed to provide the realtime infrastructure to allow you to integrate realtime notifications, events and sharing of data within your existing apps.

## Features
* Users have descriptive properties, allowing for targeted routing of notifications
* Send targeted notifications using our simple query model
* Use the same query model to detect other users, regardless of whether they are already connected, just connecting, or disconnecting
* Retrieve old notifications via the REST API

The SNS is built with [Node.JS](http://nodejs.org) and [RethinkDB](http://www.rethinkdb.com) in order to be highly scalable.

[EventEmitter](https://github.com/Olical/EventEmitter) for the browser is also used to help handle events on the client side.

## Setup
You will need Node `4.4.x` and a running instance of RethinkDB. You can download and run RethinkDB locally if you wish - or you can spin up a managed cluster at [Compose](http://www.compose.com) for free, for 30 days.

Clone this repository and do the standard `npm install` to get all of the depndencies.

Next up, you will need to edit the `lib/config.js` file. In this file we define our RethinkDB connection settings, using the `connection` constant. You will find two different definitions of `connection` in this file.

The first definition can be used to connect to a locally running instance of RethinkDB, and uses the default `test` database.

The second (and commented out) definition can be used to connect to RethinkDB via Compose. If you are using compose, uncomment this definition and fill in your connection details from the Compose dashboard.

Once this is done, we need to create some tables and define some indexes to help make things run smoothly. To do this, we have provided a setup script:

`node dbSetup.js`

You will be asked to confirm your RethinkDB connection string, and we will then create the necessary tables and indexes for you. You should see the progress of this script as it performs each individual action.

To run the SNS app, simply do `node app.js`.

Finally, once the service is running, you will need to include the client library into your HTML. You can do so very easily as so, making sure you change the hostname to match your particular instance of the SNS app:

```html
<script src="http://sns-hostname.com/client.js"></script>
```

And now your app is SNS enabled! Keep on reading to find out how to use the SNS in your app.

## Connecting
When connecting to the SNS, you should supply two different pieces of information:

* Some `userData`
* A `userQuery`

`userData` is a JSON object that describes __this__ user (ie. the user that is connecting). This JSON object should only contain simple key/value pairs on one level (i.e. no nested objects, no arrays). This `userData` is what other users of the SNS will query against to send notifications to this user.

`userQuery` is also a JSON object (again, only simple key/value pairs), and is used to determine what other users we care about. We will then receive connection and disconnection events for any other user that matches this `userQuery`.

Connect to SNS, and define your `userData` and `userQuery` like so:

````javascript
var SNS = new SNSClient({
  userData: {
    name: "Matt",
    age: 32,
    country: "USA",
    user_type: "chat"
  },
  userQuery: {
    country: "USA",
    user_type: "chat"
  }
});
````

Here we have defined this user with the following attributes:

* name = Matt
* age = 32
* country = USA
* user_type = chat

And we have asked to be informed about the connection/disconnections of any other users where:

* country = USA
* user_type = chat

> _**note:** a user must have **ALL** of the attributes defined in the `userQuery` in order to match, however it is not required that a user matches **EXACTLY**, and can have attributes defined that are not in the `userQuery`_

## SNS.send( userQuery, notificationData )
The `userQuery` is used to identify recipients of the notification.

The below example will send a JSON object with a `chat_msg` property to any connected user who has a `user_type` of `chat`.

````javascript
SNS.send( { user_type: "chat" }, { chat_msg: "Hello, world!" } )
````

The `userQuery` used to send a notification can be different to the `userQuery` defined at connection time.
 
## Events
Once connected there are a number of events that can be triggered and acted upon.

### Event:connected
The connected event is very simple, and just alerts the user to the fact they have successfully connected to the SNS.

````javascript
SNS.on('connected', function() {
  console.log("connected event")
})
````

### Event:currentUsers
On connection, the supplied `userQuery` is used to find any other currently connected users that this user is interested in (i.e. Match the `userQuery`). This will trigger the `currentUsers` event.

````javascript
SNS.on('currentUsers', function(users) {
  console.log("currentUsers event", users)
})
````

An array of users is passed along with this event, where each element of the array is a JSON object containing the `userData` of each matched user.

### Event:connectedUser
When a new user connects that matches the supplied `userQuery`, it will trigger the `connectedUser` event.

````javascript
SNS.on('connectedUser', function(user) {
  console.log("connectedUser event", user)
})
````

A JSON object containing the `userData` of the connecting user is passed in the `user` parameter.

### Event:disconnectedUser
When a new user disconnects that matches the supplied `userQuery`, it will trigger the `disconnectedUser` event.

````javascript
SNS.on('disconnectedUser', function(user) {
  console.log("disconnectedUser event", user)
})
````

A JSON object containing the `userData` of the disconnecting user is passed in the `user` parameter.

### Event:notification
When a new notification is received, it will trigger the `notification` event.

````javascript
SNS.on('notification', function(notification) {
  console.log("notification event", notification)
})
````
The `notification` parameter will contain the notification information.

## Historical Data
Historical notifications can be retrieved by using the `GET /historical` HTTP endpoint.

Requests to the `GET /historical` endpoint will parse the query string to create a `userQuery`. For example, the following request will return historical notifications where the `userQuery` for this notification contains `user_type: chat`.

````bash
curl /historical?user_type=chat
````

And the response would look something like:

````javascript
{
  "success": true,
  "notifications": [
    {
      "msg": "Hello, Dave!",
      "name": "Matt"
    },
    {
      "msg": "Hello, world",
      "name": "Dave"
    }
  ]
}
````

## Contributing
The projected is released under the Apache-2.0 license so forks, issues and pull requests are very welcome.