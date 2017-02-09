(function() {
  window.addEventListener('DOMContentLoaded', function () {
    var SNS
    var app

    Vue.filter('timestamp', function (value) {
      if (value) {
        var date = new Date(value)
        var year = date.getFullYear()
        var month = date.getMonth() + 1
        var day = date.getDate()
        var hour = date.getHours()
        var minute = date.getMinutes()

        return year + '-' + (month > 9 ? month : '0' + month) + '-' + (day > 9 ? day : '0' + day)
          + ' ' + (hour > 9 ? hour : '0' + hour) + ':' + (minute > 9 ? minute : '0' + minute)
      }
      return value
    })

    var ChatUser = Vue.extend({
      template: '#chatuser',
      data: function() {
        return {
          username: ''
        }
      },
      methods: {
        submitName: function(e) {
          var username = this.$get('username')
          if (username) {
            app.$set('showchat', true)
          }
          this.$set('username', username)

          SNS = setupSNS(username)

          this.$http
            .get('/demokey/historical?type=chat')
            .then(function(res) {
              if (res.ok && res.data.success) {
                var messages = res.data.notifications
                app.$refs.chatapp.$set('messages', messages)
              }
            })
        }
      }
    })

    var ChatApp = Vue.extend({
      template: '#chatapp',
      data: function() {
        return {
          users: [],
          messages: [],
          message: null
        }
      },
      methods: {
        submitMessage: function(e) {
          var message = this.$get('message')
          var name = app.$refs.chatuser.$get('username')
          SNS.send({ type: 'chat' }, { name: name, msg: message, ts: new Date().getTime() })
          var message = this.$set('message', '')
        }
      }
    })

    app = new Vue({
      el: '#app',
      data: {
        showchat: false
      },
      components: {
        'chat-user': ChatUser,
        'chat-app': ChatApp
      }
    })


    var setupSNS = function(name) {
      SNS = new SNSClient('demokey', {
        userData: {
          name: name,
          type: 'chat'
        },
        userQuery: {
          type: 'chat'
        }
      })
      .on('currentUsers', function(users) {
        app.$refs.chatapp.$set('users', users)
      })
      .on('connectedUser', function(user) {
        var users = app.$refs.chatapp.$get('users')
        users.push(user)
        app.$refs.chatapp.$set('users', users)
      })
      .on('disconnectedUser', function(user) {
        var users = app.$refs.chatapp.$get('users')
        users = users.filter(u => {
          if (user._socket_id == u._socket_id) {
            return false
          }
          return true
        })
        app.$refs.chatapp.$set('users', users)
      })
      .on('notification', function(msg) {
        var messages = app.$refs.chatapp.$get('messages')
        messages.unshift({
          name: msg.name,
          msg: msg.msg,
          ts: msg.ts
        })
        app.$refs.chatapp.$set('messages', messages)
      })

      return SNS
    }
  })    
}())
