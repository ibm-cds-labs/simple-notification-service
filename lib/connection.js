"use strict";

const url = require('url');
const fs = require('fs');
var services = null;
var connection = null;

// find RethinkDB credentials from Bluemix VCAP_SERVICES
if (typeof process.env.VCAP_SERVICES == "string") {

  try {
    services = JSON.parse(process.env.VCAP_SERVICES)
  } catch (e) {
    services = {}
  }

}

if (typeof services == "object" && services !== null
    && typeof services["compose-for-rethinkdb"] == "object"
    && services["compose-for-rethinkdb"].length > 0) {

  let credentials = services["compose-for-rethinkdb"][0].credentials;

  let uri = url.parse(credentials.uri);

  connection = {
    host: uri.hostname,
    port: uri.port,
    user: uri.auth.split(":")[0],
    password: uri.auth.split(":")[1],
    ssl: {
      ca: new Buffer(credentials.ca_certificate_base64, "base64").toString("utf-8")
    },
    db: "sns"
  }

}

// or from local environment variables
else if (typeof process.env.RETHINKDB_URL == "string") {

  let uri = url.parse(process.env.RETHINKDB_URL);
  let user = null;
  let password = null;

  connection = {
    host: uri.hostname,
    port: uri.port,
    db: "sns"
  }

  if (typeof process.env.RETHINKDB_CERT === "string") {
    connection.ssl = {
      ca: fs.readFileSync(process.env.RETHINKDB_CERT)
    }
  }

  if (uri.auth) {
    connection.user = uri.auth.split(":")[0];
    connection.password = uri.auth.split(":")[1];
  }

}

// otherwise, assume local connection
else {

  connection = {
    db: "sns"
  }

}

module.exports = connection;