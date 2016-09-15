"use strict"

const md5 = require('md5');

const getCombinations = (chars) => {
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

const createUniqueHashes = (obj) => {

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

const createSingleHash = (obj) => {

	if (obj === null || typeof obj !== "object" || Array.isArray(obj)) {
		obj = {};
	}

	let item = 	Object.keys(obj)
					 		.map(key => `${key}-${obj[key]}`)
					 		.sort()
					 		.join("/");

	if (item === "") return "";

	return md5(item);

}

module.exports = {
	getCombinations: getCombinations,
	createUniqueHashes: createUniqueHashes,
	createSingleHash: createSingleHash
}