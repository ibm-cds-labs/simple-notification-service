/******
	EXAMPLE CHAT WIDGET
	FOR SIMPLE NOTIFICATION SERVICE
******/
var _sns_chat_host = document.currentScript.src.replace(/\/chat-widget.js$/, '');
function SNSChatWidget(key) { 

	this.SNS = null;
	this.name = null;
	this.key = key || null;

	// dependencies
	if (typeof SNSClient != "function") throw new Error("Simple Notification Service not detected and is required")
	if (typeof jQuery != "function") throw new Error("jQuery not detected and is required")

	// create the container for the chat system
	this.container = $("<div>", { class: "_sns_chat_container _sns_min"});
	$("body").append(this.container);

	// title bar
	var title_bar = $("<div>", { class: "_sns_title" });
	var title_text = $("<p>", { class: "_sns_title_text" }).text("SNS Chat Widget")
	var min = $("<img>", { src: _sns_chat_host + "/min.png" })
	title_bar.append(min);
	title_bar.append(title_text);
	this.container.append(title_bar);

	min.click(function() {
		this.container.toggleClass("_sns_min")
	}.bind(this))


	// create the elements for the ID screen
	var id_div = $("<div>", { class: "_sns_chat_id_screen", id: "_sns_chat_id_screen"})
	var welcome = $("<p>").text("Welcome to SNS Chat, please enter your name below to get started.")
	var name_input = $("<input>", { name: "_sns_chat_name", id: "_sns_chat_name", placeholder: "Enter your name..." })
	var name_button = $("<button>", { name: "_sns_chat_name_submit", id: "_sns_chat_name_submit", type: "button" }).text("Get Started!")
	var error_msg = $("<p>", { class: "_sns_chat_error _sns_chat_hidden" }).text("Please enter a name of 3 characters or more");

	// add these elements
	id_div.append(welcome);
	id_div.append(name_input);
	id_div.append(name_button);
	id_div.append(error_msg);
	this.container.append(id_div);

	// set name on button press
	name_button.click(function() {
		this.connect()
	}.bind(this));

	// send name on enter
	name_input.keypress(function(e) {
		var keycode = (e.keyCode ? e.keyCode : e.which);
		if(keycode == '13'){
			e.preventDefault();
			this.connect();
		}
	}.bind(this))

	// what happens when you click the "enter your name" button
	this.connect = function() {

		// make sure we get a name
		error_msg.addClass("_sns_chat_hidden");
		var name = name_input.val();
		if (name == "") {
			error_msg.removeClass("_sns_chat_hidden");
			return;
		}

		// if we have a name, connect to SNS
		this.name = name;
		this.SNS = new SNSClient(this.key, {
			userData: {
				type: "chat",
				name: name
			},
			userQuery: {
				type: "chat"
			}
		})

		// on connection, render the chat window!
		this.SNS.on('connected', function() {
			this.renderChatWindow();
			console.log
		}.bind(this));

		// on receipt of notification
		this.SNS.on('notification', function(n) {
			this.renderChatMessage(n);
		}.bind(this));

		this.renderChatWindow = function() {
			
			// hide ID screen
			$('div#_sns_chat_id_screen').addClass("_sns_chat_hidden");

			// chat window
			var chat_div = $("<div>", { class: "_sns_chat_messages", id: "_sns_chat_messages"})
			this.container.append(chat_div)

			// chat messages
			var messages_ul = $("<ul>", { class: "_sns_chat_message_list", id: "_sns_chat_message_list" })
			chat_div.append(messages_ul)

			// chat inputs
			var chat_input = $("<textarea>", { class: "_sns_chat_msg", name: "_sns_chat_msg", id: "_sns_chat_msg", placeholder: "Enter your msg..." })
			var chat_button = $("<button>", { class: "_sns_chat_btn", name: "_sns_chat_btn", id: "_sns_chat_btn", type: "button" }).text(">")
			this.container.append(chat_input);
			this.container.append(chat_button);
			
			// send msg on button click
			chat_button.click(function(e) {
				this.sendMessage();
			}.bind(this))

			// send msg on enter
			chat_input.keypress(function(e) {
				var keycode = (e.keyCode ? e.keyCode : e.which);
				if(keycode == '13'){
					e.preventDefault();
					this.sendMessage();
				}
			}.bind(this))

		}.bind(this);

		this.sendMessage = function() {

			var msg = $("textarea#_sns_chat_msg").val();

			if (msg != "") {
				this.SNS.send({ type: "chat" }, { name: this.name, msg: msg, ts: new Date().getTime() });
				$("#_sns_chat_msg").val("");
				return;
			}

		}.bind(this);

		this.renderChatMessage = function(m) {

			var list = $('#_sns_chat_message_list')

			var name = $("<p>", { class: "_sns_chat_msg_header" }).text(m.name)
			var msg = $("<p>").text(m.msg)

			var li = $("<li>")
			li.append(name);
			li.append(msg);

			list.append(li);

			$('#_sns_chat_messages').scrollTop(3000);

		}

	}

}