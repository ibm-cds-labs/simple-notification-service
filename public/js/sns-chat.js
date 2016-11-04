var setupSNS = function(name) {
  
  SNS = new SNSClient("demokey", {
    userData: {
      name: name,
      type: "chat"
    },
    userQuery: {
      type: "chat"
    }
  })

  SNS.on('currentUsers', function(users) {
    users.forEach(function(user) {
      app.users.push(user);
    })
  })

  SNS.on('connectedUser', function(user) {
    app.users.push(user)
  })

  SNS.on('disconnectedUser', function(user) {
    app.users = app.users.filter(u => {
      if (user._socket_id == u._socket_id) {
        return false;
      }
      return true;
    })

  })

  SNS.on('notification', function(msg) {
    app.messages.push({
      name: msg.name,
      msg: msg.msg
    })
  })

  return SNS;

}