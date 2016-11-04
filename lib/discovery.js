module.exports = function(locals) {
	
	//simple orchestration
	var registry = require('./registry.js')();
	
	if (locals.discovery) {

	  /***
	    METRICS
	  ***/
	  registry.service("search", "metrics-collector")
	  .on("set", function(data) {
	    
	    if (typeof data === "object" && typeof data.url === "string" && data.url !== locals.metrics.host) {
	      console.log(`Metrics URL set to ${data.url}`);
	      locals.metrics.host = data.url;
	      locals.metrics.name = data.name;
	      locals.metrics.enabled = true;
	    }
	    
	  })
	  .on("expire", function(data) {
	    console.log("Metrics turned off");
	    locals.metrics.enabled = false;
	    locals.metrics.host = null;
	    locals.metrics.name = null;
	  });

	}

	return registry;
	
};