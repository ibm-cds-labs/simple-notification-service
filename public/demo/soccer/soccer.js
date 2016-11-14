(function() {
  window.addEventListener('DOMContentLoaded', function () {
    var app = new Vue({
      el: '#soccerdemo',

      data: {
        currentMatch: 'all',
        matches: [{
          match_id: 1,
          home: 'Manchester United',
          away: 'Liverpool',
          home_score: 0,
          away_score: 0,
          updates: []
        }, {
          match_id: 2,
          home: 'Barcelona',
          away: 'Real Madrid',
          home_score: 0,
          away_score: 0,
          updates: []
        }]
      },

      methods: {
        init: function() {
          new SNSClient('demokey', {
            userData: {
              type: 'soccer'
            },
            userQuery: {
              type: 'soccer'
            }
          })
          .on('notification', function(n) {
            app.updateMatch(n)
          })
          
          app.getUpdate()
        },

        getUpdate: function() {
          this.$http
            .get('/demokey/historical?type=soccer')
            .then(function(res) {
              if (res.ok && res.data.success) {
                res.data.notifications.reverse().forEach(function(n) {
                  app.updateMatch(n)
                })
              }
            })
        },

        updateMatch: function(update) {
          // find the index of the match
          var index = app.matches.findIndex(function(el, i, arr) { 
            return el.match_id == update.match_id 
          })

          if (index > -1) {
            if (app.matches[index].home_score != update.home_score) {
              app.matches[index].home_score = update.home_score
            }

            if (app.matches[index].away_score != update.away_score) {
              app.matches[index].away_score = update.away_score
            }

            app.matches[index].updates.push({
              content: update.content,
              type: update.type,
              ts: update.ts
            })
          }
        },

        gotoMatch: function(matchId) {
          if (app.currentMatch !== matchId) {
            var valid = (matchId === 'all') || app.matches.some(function(m) { 
              return m.match_id === matchId 
            })

            if (valid) {
              app.currentMatch = matchId
            }
          }
        }
      },

      computed: {
        updatesReversed: function() {
          var updates = []
          var current = this.currentMatch
          this.matches.forEach(function(m) {
            if (current === 'all' || current === m.match_id) {
              m.updates.forEach(function(u) {
                u.home = m.home
                u.away = m.away
                updates.push(u)
              })
            }
          })

          updates.sort(function(a, b) {
            return b.ts - a.ts
          })
          .map(function(u) {
            var d = new Date(u.ts)
            var h = d.getHours()
            var m = d.getMinutes()
            u.time = (h > 9 ? h : '0'+h) + ':' + (m > 9 ? m : '0'+m)
          })

          return updates
        }
      }
    })

    app.init()
  })
}())
