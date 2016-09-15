"use strict"

// Local connection Object
const connection = {
	db: "test"
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

module.exports = {
	connection: connection
}