# Simple Notification Service
The Simple Notification Service (SNS) is a scalable, queryable, realtime notification micro service that is designed to provide the realtime infrastructure to allow you to integrate realtime notifications, events and sharing of data within your existing apps.

## Features
* Users have descriptive properties, allowing for targeted routing of notifications
* Send targeted notifications using our simple query model
* Use the same query model to detect other users, regardless of whether they are already connected, just connecting, or disconnecting
* Retrieve old notifications via the REST API

The SNS is built with [Node.JS](http://nodejs.org) and [RethinkDB](http://www.rethinkdb.com) in order to be highly scalable.

[EventEmitter](https://github.com/Olical/EventEmitter) for the browser is also used to help handle events on the client side.

## Deploy to Bluemix
You can deploy this service directly to [IBM Bluemix](http://www.bluemix.net) by clicking the button below.

> _**Note:**_ *This will provision a RethinkDB instance within Bluemix which may incur costs, please see [here](https://console.ng.bluemix.net/catalog/services/compose-for-rethinkdb/) for more information*

[![Deploy to Bluemix](https://bluemix.net/deploy/button.png)](https://bluemix.net/deploy?repository=https://github.com/ibm-cds-labs/simple-notification-service)

## Deploy locally
You will need Node `4.4.x` or higher and a running instance of RethinkDB. You can download and run RethinkDB locally if you wish - or you can spin up a managed cluster at [Compose](http://www.compose.com) for free, for 30 days.

Clone this repository and do the standard `npm install` to get all of the depndencies.

By default, SNS will assume a local instance of RethinkDB is running, but you can use environment variables to define where a remote instance of RethinkDB is running if you wish.

```
export RETHINKDB_URL='rethinkdb://username:password@hostname.com:28015'
```

To run the SNS app, simply do `node app.js`. On first run of the app, all necessary DB tables will be created.

Finally, once the service is running, you will need to include the client library into your HTML. You can do so very easily as so, making sure you change the hostname to match your particular instance of the SNS app:

```html
<script src="http://sns-hostname.com/client.js"></script>
```

And now your app is SNS enabled! Keep on reading to find out how to use the SNS in your app.

## Authentication
To connect to the SNS you will need an authentication key. For the JavaScript API these keys are tied to specific hostnames.

To enable the SNS demos to work you will need to create an authentication key for the hostname that is associated with your instance of the SNS. You can do this via the `/admin` page.

Create a new key where hostname is the hostname of your SNS instance (e.g. `localhost`) and the key is `demokey`. To check whether this is working or not, visit the `/status` endpoint - if there is at least 1 user connected, everything is working!

You can create and remove as many keys as you wish on this page.

## Connecting
When connecting to the SNS, you should supply serveral different pieces of information:

* An authentication key
* Some `userData`
* A `userQuery`

Your authentication key is tied to a particular hostname, and must be created as described above. You only need to provide the key when connecting.

`userData` and `userQuery` are provided as part of an options object.

`userData` is a JSON object that describes __this__ user (ie. the user that is connecting). This JSON object should only contain simple key/value pairs on one level (i.e. no nested objects, no arrays). This `userData` is what other users of the SNS will query against to send notifications to this user.

`userQuery` is also a JSON object (again, only simple key/value pairs), and is used to determine what other users we care about. We will then receive connection and disconnection events for any other user that matches this `userQuery`.

Connect to SNS, and define your `userData` and `userQuery` like so:

````javascript
var SNS = new SNSClient("your-authentication-key", {
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

## HTTP API
The SNS also provides a simple HTTP API for some operations.

### Sending Notifications
Notifications can also be sent by using the `POST /authentication-key/notification` HTTP endpoint, where `authentication-key` is your authentication key. For making HTTP requests, this key is not tied to a hostname.

Requests to the `POST /authentication-key/notification` require that a JSON body is sent as shown below:

````bash
curl -H "Content-Type: application/json" -X POST -d '{ "notification": { ... }, "userQuery": { ... } }' /authentication-key/notification
````

And the response would look something like:

````javascript
{
  "success": true
}
````

### Historical Data
Historical notifications can be retrieved by using the `GET /authentication-key/historical` HTTP endpoint, where `authentication-key` is your authentication key. For making HTTP requests, this key is not tied to a hostname.

Requests to the `GET /authentication-key/historical` endpoint will parse the query string to create a `userQuery`. For example, the following request will return historical notifications where the `userQuery` for this notification contains `user_type: chat`.

````bash
curl /authentication-key/historical?user_type=chat
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

## Demos
The Simple Notification Service comes with two demos built in, accessible from the homepage.

### Chat
The first demo is a chat room. This demo showcases all of the features of the SNS - send/receive messages, detect and handle connections/disconnections, and using historical data to preserve chat history.

There is also a copy & paste widget to add chat to any website.

### Live Soccer Scores
The second demo showcases the ability of the SNS to direct notifications to specific users.

Here you can use an adin panel to update the scores of two soccer matches. End users will either see all updates, or match specific updates, depending on the page they are visiting.

## Contributing
The projected is released under the Apache-2.0 license so forks, issues and pull requests are very welcome.

## Privacy Notice

Sample web applications that include this package may be configured to track deployments to IBM Bluemix and other Cloud Foundry platforms. The following information is sent to a Deployment Tracker service on each deployment:

* Node.js package version
* Node.js repository URL
* Application Name (application_name)
* Space ID (space_id)
* Application Version (application_version)
* Application URIs (application_uris)
* Labels of bound services
* Number of instances for each bound service and associated plan information

This data is collected from the package.json file in the sample application and the VCAP_APPLICATION and VCAP_SERVICES environment variables in IBM Bluemix and other Cloud Foundry platforms. This data is used by IBM to track metrics around deployments of sample applications to IBM Bluemix to measure the usefulness of our examples, so that we can continuously improve the content we offer to you. Only deployments of sample applications that include code to ping the Deployment Tracker service will be tracked.

### Disabling Deployment Tracking

To disable deployment tracking, please remove or comment out the following line from `app.js`:

````javascript
require("cf-deployment-tracker-client").track();
````