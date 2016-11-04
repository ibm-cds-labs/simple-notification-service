/**
 * EventEmitter v4.0.3 - git.io/ee
 * Oliver Caldwell
 * MIT license
 */(function(e){"use strict";function t(){}function i(e,t){if(r)return t.indexOf(e);var n=t.length;while(n--)if(t[n]===e)return n;return-1}var n=t.prototype,r=Array.prototype.indexOf?!0:!1;n.getListeners=function(e){var t=this._events||(this._events={});return t[e]||(t[e]=[])},n.addListener=function(e,t){var n=this.getListeners(e);return i(t,n)===-1&&n.push(t),this},n.on=n.addListener,n.removeListener=function(e,t){var n=this.getListeners(e),r=i(t,n);return r!==-1&&(n.splice(r,1),n.length===0&&(this._events[e]=null)),this},n.off=n.removeListener,n.addListeners=function(e,t){return this.manipulateListeners(!1,e,t)},n.removeListeners=function(e,t){return this.manipulateListeners(!0,e,t)},n.manipulateListeners=function(e,t,n){var r,i,s=e?this.removeListener:this.addListener,o=e?this.removeListeners:this.addListeners;if(typeof t=="object")for(r in t)t.hasOwnProperty(r)&&(i=t[r])&&(typeof i=="function"?s.call(this,r,i):o.call(this,r,i));else{r=n.length;while(r--)s.call(this,t,n[r])}return this},n.removeEvent=function(e){return e?this._events[e]=null:this._events=null,this},n.emitEvent=function(e,t){var n=this.getListeners(e),r=n.length,i;while(r--)i=t?n[r].apply(null,t):n[r](),i===!0&&this.removeListener(e,n[r]);return this},n.trigger=n.emitEvent,typeof define=="function"&&define.amd?define(function(){return t}):e.EventEmitter=t})(this);

 /*
 *  SNSClient
 */
// must capture the SNS host at load time
var _sns_host = document.currentScript.src.replace(/\/client.js$/, '')

function SNSClient(key, opts) {
  
  this.key = key;
  this.host = location.hostname;
  this.sns_host = _sns_host;
  this.https = (this.sns_host.match(/^https/) ? true : false)
  this.userData = opts.userData || null
  this.userQuery = opts.userQuery || null
  this.socket = null;
  this.events = new EventEmitter();
  this.events.id = null;
  this.events.connected = false;

  /*** Code to async load JS ***/
  this.addScript = function(elm, evType, fn, useCapture) {
    //Credit: Function written by Scott Andrews
    //(slightly modified)
    var ret = 0;
  
    if (elm.addEventListener) {
        ret = elm.addEventListener(evType, fn, useCapture);
    } else if (elm.attachEvent) {
        ret = elm.attachEvent('on' + evType, fn);
    } else {
        elm['on' + evType] = fn;
    }
  
    return ret;
  };
	
	/*** async load ***/
  this.load = function(src, callback) {
    var a = document.createElement('script');
    a.type = 'text/javascript';
    a.src = src;
    var s = document.getElementsByTagName('script')[0];
    s.parentNode.insertBefore(a, s);
    
    this.addScript(a, 'load', callback, false);
  }
		
  this.load(this.sns_host + "/socket.io/socket.io.js", function() {

    /*
		 *  Validation
		 *  Check that we have the required information provided 
		 */
	 

    // check an API key has been supplied
    if (typeof key != "string" || key === "") {
      throw 'SNS: an API key must be supplied';
      return;
    }

		//check that userData is passed in
		if (typeof opts.userData != "object") {
			throw 'SNS: You must supply a valid Javascript object in the userData parameter';
			return;
		}
	
		/*
		 *  Connect to Socket.IO server
		 */
		this.socket = io(this.sns_host); //our socket.io object
	
		/*
		 *  Handle Socket.IO events
		 */

    // provide descriptive data on connection
    this.socket.on('connect', function() {
      this.events.connected = true;
      this.socket.emit('myData', { userData: this.userData, userQuery: this.userQuery, authentication: { key: this.key, hostname: this.host } })
      this.events.id = "/#" + this.socket.id;
      this.events.emitEvent('connected');
    }.bind(this));
	
		// listen for authentication fail
    this.socket.on('authenticationFail', function(err) {
      this.socket.disconnect();
      this.events.id = null;
      this.events.connected = false;
      throw new Error("SNS: Failed to authenticate");      
    }.bind(this));

    // listen for incoming messages
    this.socket.on('notification', function(data) {
      this.events.emitEvent('notification', [data]);
    }.bind(this));

    // listen for incoming message event (used for front-end, undocumented)
    this.socket.on('notificationPing', function() {
      this.events.emitEvent('notificationPing');
    }.bind(this));

    // listen for the currently connected users (that we care about, when we connect)
    this.socket.on("currentUsers", function(users) {
      this.events.emitEvent('currentUsers', [users]);
    }.bind(this))

    // listen for newly connecting users (that we care about)
    this.socket.on("connectedUser", function(user) {
      this.events.emitEvent('connectedUser', [user]);
    }.bind(this))
  
    // listen for newly connecting users (that we care about)
    this.socket.on("disconnectedUser", function(user) {
      this.events.emitEvent('disconnectedUser', [user]);
    }.bind(this))
			
  }.bind(this));
  
  /*
   *  Websocket API methods
   */
  
  // websocket API send request
  this.send = function(query, data) {

    if (this.events.connected === false) {
      throw 'SNS: not connected';
      return;
    }
    
    this.socket.emit('notification', { query: query, data: data })
    
  }.bind(this);

  this.events.send = this.send;

  return this.events

}