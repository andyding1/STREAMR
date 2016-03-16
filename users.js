//For reference to show users object
// var users = {
//   chatroom1: ['user1','user2'],
//   chatroom2: ['user1','user2']
// }

function addUser(users, user, chatRoom){
  if (users[chatRoom]){
    users[chatRoom].push(user);
  }
  else {
    users[chatRoom] = [user];
  }
}

function removeUser(users, user, chatRoom){
  var index = users[chatRoom].indexOf(user);
  users[chatRoom].splice(index,1);
}

function getUsersList(users, chatRoom){
  return users[chatRoom];
}

module.exports = {
  addUser: addUser,
  removeUser: removeUser,
  getUsersList: getUsersList
}
