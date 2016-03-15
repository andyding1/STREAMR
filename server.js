var express = require('express');
var express_app = express();
express_app.use(express.static("./public"));
//var http = require('http').Server(app);
//var io = require('socket.io')(http);

var userColors = require('./colors.js');

var users = [];

//io.on('connection', function(socket){
//  //After user submits an alias
//
//});
//
////This is setup of routes to go from AliasPicker to AppChat
//app.get('/', function(req, res){
//  res.sendFile(__dirname + '/public/index.html');
//});
//
//http.listen(8080, function(){
//  console.log('listening on *:8080');
//});






////////////////////////


// Muaz Khan   - www.MuazKhan.com
// MIT License - www.WebRTC-Experiment.com/licence
// Source Code - https://github.com/muaz-khan/WebRTC-Scalable-Broadcast

var fs = require("fs");
var path = require('path');

var app = require('http').Server(express_app);

app = app.listen(process.env.PORT || 8888, process.env.IP || "0.0.0.0", function() {
  var addr = app.address();
  console.log("Server listening at", addr.address + ":" + addr.port);
});

// Muaz Khan   - www.MuazKhan.com
// MIT License - www.WebRTC-Experiment.com/licence

// WebRTC Scalable Broadcast:
// this module simply initializes socket.io
// and configures it in a way that
// single broadcast can be relayed over unlimited users
// without any bandwidth/CPU usage issues.
// Everything happens peer-to-peer!

// Ref. discussion: https://github.com/muaz-khan/WebRTC-Experiment/issues/2
// Source Code: https://github.com/muaz-khan/WebRTC-Scalable-Broadcast


function WebRTC_Scalable_Broadcast(app) {
  var io = require('socket.io').listen(app, {
    log: false,
    origins: '*:*'
  });

  io.set('transports', [
    'websocket', // 'disconnect' EVENT will work only with 'websocket'
    'xhr-polling',
    'jsonp-polling',
    'polling'
  ]);

  var listOfBroadcasts = {};

  io.on('connection', function(socket) {

    /*
    CHAT SOCKET
    */
    socket.on('user:enter', function(alias){

      //add the current socket user to the users array
      users.push(alias);
      //console.log('User CONNECTED');

      //send the new user their name and list of users
      socket.broadcast.emit('initialize', {
        name: alias,
        users: users
      });
      socket.emit('initialize', {
        users: users
      })

      // notify other sockets that a new user has joined
      socket.broadcast.emit('user:join', {
        name: alias
      });

      socket.on('send:message', function(data){
        io.emit('send:message', {
          user: alias,
          text: data.text,
          color: userColors.getColor(alias)
        });
      });

      socket.on('color:change', function(data){
        userColors.addUser(alias, data.color);
      });

      //User leaves chat room
      socket.on('disconnect', function(){
        //console.log('User DISCONNECTED');
        //removes socket user from the user list
        var index = users.indexOf(alias)
        users.splice(index,1);

        socket.broadcast.emit('user:left', {
          name: alias,
          users: users
        });
      });

    });

    /*
      VIDEO SOCKET
    */

    var currentUser;
    socket.on('join-broadcast', function(user) {
      currentUser = user;

      user.numberOfViewers = 0;
      if (!listOfBroadcasts[user.broadcastid]) {
        listOfBroadcasts[user.broadcastid] = {
          broadcasters: {},
          allusers: {},
          typeOfStreams: user.typeOfStreams // object-booleans: audio, video, screen
        };
      }

      var firstAvailableBroadcaster = getFirstAvailableBraodcater(user);
      if (firstAvailableBroadcaster) {
        //listOfBroadcasts[user.broadcastid].broadcasters[firstAvailableBroadcaster.userid].numberOfViewers++;
        socket.emit('join-broadcaster', firstAvailableBroadcaster, listOfBroadcasts[user.broadcastid].typeOfStreams);

        console.log('User <', user.userid, '> is trying to get stream from user <', firstAvailableBroadcaster.userid, '>');
      } else {
        currentUser.isInitiator = true;
        socket.emit('start-broadcasting', listOfBroadcasts[user.broadcastid].typeOfStreams);

        console.log('User <', user.userid, '> will be next to serve broadcast.');

        listOfBroadcasts[user.broadcastid].broadcaster = user;
      }

      //listOfBroadcasts[user.broadcastid].broadcasters[user.userid] = user;
      listOfBroadcasts[user.broadcastid].allusers[user.userid] = user;
    });

    socket.on('message', function(message) {
      socket.broadcast.emit('message', message);
    });

    socket.on('disconnect', function() {
      if (!currentUser) return;
      if (!listOfBroadcasts[currentUser.broadcastid]) return;
      //if (!listOfBroadcasts[currentUser.broadcastid].broadcasters[currentUser.userid]) return;
      //
      //delete listOfBroadcasts[currentUser.broadcastid].broadcasters[currentUser.userid];
      if (currentUser.isInitiator) {
        delete listOfBroadcasts[currentUser.broadcastid];
      }
    });
  });

  function getFirstAvailableBraodcater(user) {
    return listOfBroadcasts[user.broadcastid].broadcaster;
    //var firstResult;
    //for (var userid in broadcasters) {
    //    if (broadcasters[userid].numberOfViewers <= 100) {
    //        firstResult = broadcasters[userid];
    //        continue;
    //    } else delete listOfBroadcasts[user.broadcastid].broadcasters[userid];
    //}
    //return firstResult;
  }
}

WebRTC_Scalable_Broadcast(app);
