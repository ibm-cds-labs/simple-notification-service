(function() {
  window.addEventListener('DOMContentLoaded', function () {
    var shuffle = function(a) {
      var j, x, i
      for (i = a.length; i; i--) {
        j = Math.floor(Math.random() * i)
        x = a[i - 1]
        a[i - 1] = a[j]
        a[j] = x
      }
      return a
    }
    
    var STATUS = Vue.extend({
      template: '#status',

      data: function() {
        return {
          users: {},
          connected: 0,
          sent: 0
        }
      },

      ready: function() {
        this.initStatus()
      },

      methods: {
        initStatus: function() {
          var _this = this

          new SNSClient('demokey', {
            userData: {
              type: '_ui_status'
            },
            userQuery: {}
          })
          .on('currentUsers', function(u) {
            var users = _this.$get('users')
            u.forEach(function(user) {
              users[user._socket_id] = true
            })
            _this.$set('users', users)
            _this.$set('connected', Object.keys(users).length)
          })
          .on('connectedUser', function(user) {
            var users = _this.$get('users')
            users[user._socket_id] = true
            _this.$set('users', users)
            _this.$set('connected', Object.keys(users).length)
          })
          .on('disconnectedUser', function(user) {
            var users = _this.$get('users')
            delete users[user._socket_id]
            _this.$set('users', users)
            _this.$set('connected', Object.keys(users).length)
          })
          .on('notificationPing', function() {
            var sent = _this.$get('sent')
            _this.$set('sent', (sent + 1))
          })

          this.$http
            .get('/demokey/count')
            .then(function(res) {
              var sent = _this.$get('sent')
              if (res.ok) {
                sent += res.data.count
              }
              _this.$set('sent', sent)
            })

        }
      }
    })

    var ADMIN = Vue.extend({
      template: '#admin',

      data: function() {
        return {
          keys: [],
          key: '',
          hostname: '',
          demokey: false
        }
      },

      ready: function() {
        this.initAdmin()
      },

      methods: {
        initAdmin: function() {
          var _this = this
          this.$http
            .get('/authkeys')
            .then(function(res) {
              var keys = _this.$get('keys')
              if (res.ok && res.data.keys) {
                keys = res.data.keys
              }
              _this.$set('keys', keys)
              _this.$set('key', '')
              _this.$set('hostname', '')
              _this.$set('demokey', false)
              
              // determine if we have a demo key set
              keys.forEach(function(key) {
                if (key.key == "demokey" && key.hostname == location.hostname) {
                  _this.$set('demokey', true)
                }
              })

            })          
        },
        deleteKey: function(id) {
          this.$http
            .delete('/authkey/' + id)
            .then(function(res) {
              if (res.ok) {
                this.initAdmin()
              }
            })
        },
        generateKey: function() {
          var chars = shuffle('abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789'.split('')).join('')
          this.$set('key', chars.slice(0, 14))
        },
        submitKey: function() {
          var _this = this
          var key = this.$get('key')
          var hostname = this.$get('hostname')
          var newkey = JSON.stringify({hostname: hostname, key: key})
          this.$http
            .post('/authkey', newkey)
            .then(function(res) {
              if (res.ok) {
                this.initAdmin()
              }
            })
        },
        createDemoKey: function() {
          
          var newkey = JSON.stringify({hostname: location.hostname, key: "demokey"})
          this.$http
          .post('/authkey', newkey)
          .then(function(res) {
            if (res.ok) {
              this.initAdmin()
            }
          })

        }
      }
    })

    var app = Vue.extend({})
    var router = new VueRouter()

    router.map({
      '/': {
        component: Vue.extend({
          template: '#about',
          ready: function() {
            
            // set the script hosts to the correct values
            var s = document.getElementById('chat_sample')
            s.innerText = s.innerText.replace(/\[\[HOST\]\]/g, location.protocol + '//' + location.host)

            // set the demo host to the correct values
            var s = document.getElementById('demo_host');
            s.innerText = location.hostname;

          }
        })
      },
      '/status': {
        component: STATUS
      },
      '/admin': {
        component: ADMIN
      },
      '/ingredients': {
        component: Vue.extend({
          template: '#ingredients'
        })
      }
    })

    router.start(app, '#notificationservice')
  })
}())
