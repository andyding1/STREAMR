var express = require('express');
var express_app = express();
express_app.use(express.static("./public"));
var app = require('http').Server(app);

var userFunctions = require('./users.js');
var colors = require('./colors.js');
//var io = require('socket.io')(http);

//Maintaining users list on server-side, it will be an object with many arrays
var users = {};
var userColors = {};

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

var app = require('http').Server(express_app);

express_app.get('/*', function(req, res){
  res.sendFile(__dirname + '/public/index.html');
});
var port = process.env.PORT || '8080';
app.listen(port, function(){
  console.log('listening on *:8080');
});

// app = app.listen(process.env.PORT || 8888, process.env.IP || "0.0.0.0", function() {
//   var addr = app.address();
//   console.log("Server listening at", addr.address + ":" + addr.port);
// });

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
    socket.on('ready', function(){

    })
    /*
    CHAT SOCKET
    */
    //After user submits the form data on AliasPicker
    socket.on('user:enter', function(data){
      //Join the socket room determined by the broadcast_id entered from AliasPicker
      var broadcastRoom = data.broadcast_id;
      socket.join(broadcastRoom);

      //add the current socket user to the users array
      var alias = data.alias;
      userFunctions.addUser(users, alias, broadcastRoom);

      //add default color of black to user
      var userId = data.uniqueId;
      colors.addUserColor(userColors, userId, 'black');

      //send the new user their name and list of users
      io.to(broadcastRoom).emit('initialize', {
        name: alias,
        users: userFunctions.getUsersList(users, broadcastRoom)
      });
      socket.emit('initialize', {
        users: userFunctions.getUsersList(users, broadcastRoom)
      });

      // notify other sockets that a new user has joined
      socket.broadcast.to(broadcastRoom).emit('user:join', {
        name: alias,
        users: userFunctions.getUsersList(users, broadcastRoom)
      });

      socket.on('color:change', function(color){
        var checkColor = color.toLowerCase();
        if(colors.allColors.indexOf(checkColor) > -1){
          colors.addUserColor(userColors, userId, checkColor);
        }
      });

      //show messages to everyone
      socket.to(broadcastRoom).on('send:message', function(data){
        io.to(broadcastRoom).emit('send:message', {
          user: alias,
          text: data.text,
          color: colors.getColor(userColors, userId)
        });
      });

      //User leaves chat room
      socket.to(broadcastRoom).on('disconnect', function(){
        //console.log('User DISCONNECTED');
        //removes socket user from the user list
        userFunctions.removeUser(users, alias, broadcastRoom);

        socket.broadcast.to(broadcastRoom).emit('user:left', {
          name: alias,
          users: userFunctions.getUsersList(users, broadcastRoom)
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

      var firstAvailableBroadcaster = getFirstAvailableBroadcaster(user);
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

  function getFirstAvailableBroadcaster(user) {
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
