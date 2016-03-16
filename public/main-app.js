var React = require('react');
var ReactDOM = require('react-dom');

var ReactCSSTransitionGroup = require('react-addons-css-transition-group');

var ReactRouter = require('react-router');
var Router = ReactRouter.Router;
var Route = ReactRouter.Route;
var Link = ReactRouter.Link;
var IndexRoute = ReactRouter.IndexRoute;
var browserHistory = ReactRouter.browserHistory;


var VideoApp = require("./videoapp.js");

var io = require('socket.io-client');

var socket = io.connect();

const ADMIN_USER = 'ADMIN';

var App = React.createClass({
  render: function() {
    return (
      <main>
        {this.props.children}
      </main>
    );
  }
});

var AppCombined = React.createClass({
  getInitialState: function() {
    return {
      aliasPicked: false,
      broadcast_id: ''
    }
  },
  aliasHasBeenPicked: function() {
    this.setState({ aliasPicked: true});
  },
  getBroadcast: function(broadcast_id) {
    this.setState({ broadcast_id: broadcast_id })
  },
	render: function() {
		return (
      <div>
        { this.state.aliasPicked ? <MainApp broadcast_id={this.state.broadcast_id} /> : <AliasPicker aliasHasBeenPicked={this.aliasHasBeenPicked} getBroadcast={this.getBroadcast} /> }
      </div>
		);
	}
})

//Form for a user to pick an alias
var AliasPicker = React.createClass({
	enterChat: function(event) {
		event.preventDefault();
		var alias = this.refs.alias.value;
    socket.emit('user:enter', {
      alias: alias,
      broadcast_id: this.refs.broadcast_id.value
    });
    //this will set state for aliasPicked to true in AppCombined component to render AppChat
    if(this.refs.alias.value && this.refs.broadcast_id.value){
      this.props.aliasHasBeenPicked();
      this.props.getBroadcast(this.refs.broadcast_id.value);
    }
		// browserHistory.push('/chat');
	},
	render: function() {
		return (
      <div>
  			<form onSubmit={this.enterChat} className="aliasForm" autoComplete="off">
  				<div className="header"><p>Enter Alias and Room</p></div>
          <div className="description">
            <p>The first person who enters the room will be the streamer. Any subsequent person who enters the room will be a viewer. </p>
          </div>
          <div className="aliasInput">
            <div className="textInput">
    					<input ref="alias" type="text" className="button inputBox" placeholder="ALIAS" pattern=".{1,}" required title="Enter an Alias" maxLength="14"></input>
              <input ref="broadcast_id" type="text" className="button inputBox" placeholder="ROOM" pattern=".{1,}" required title="Enter a Room" maxLength="14"></input>
            </div>
            <input type="submit" className="button" value="ENTER" id="enter"></input>
          </div>
  			</form>
      </div>
		);
	}
})

//This component will show all the users who are connected
var UsersList = React.createClass({
  getInitialState: function() {
     return {
         visible: false
     };
   },
   show: function(e) {
     document.addEventListener("click", this.hide);
     this.setState({ visible: true });
   },
   hide: function() {
     document.removeEventListener("click", this.hide);
     this.setState({ visible: false });
   },
	render: function() {
		return (
			<div className="users menu">
        <div className={(this.state.visible ? "visible " : "") + this.props.alignment}>
  				<h3> Online Users </h3>
  				<ul className="usersList">
  					{
  						this.props.users.map((user, i) => {
  							return (
  								<li key={i} className="userElement">
  									{user}
  								</li>
  							);
  						})
  					}
  				</ul>
        </div>
			</div>
		);
	}
});

//This component is for any message that is entered from the MessageForm Component
var Message = React.createClass({
  componentDidUpdate: function(){
    //This sets the messageInputArea to automatically scroll to the bottom
    var objDiv = document.querySelector(".messageInputArea");
    objDiv.scrollTop = objDiv.scrollHeight;
  },
	render: function() {
    //adding specific class on admin messages for joining and leaving chat room for styling purposes
    if (this.props.users === ADMIN_USER){
      return (
        <div className="message admin_message">
          <strong>{this.props.users}: </strong>
  				<span>{this.props.text}</span>
  			</div>
      );
    }
    else {
  		return (
  			<div className="message">
          <strong>{this.props.users}: </strong>
  				<span>{this.props.text}</span>
  			</div>
  		);
    }
	}
});

//This is the component that renders all the messages
var MessageList = React.createClass({
	render: function() {
    var messages = this.props.messages.map((message, i) => {
      return (
        <table className="messageTableText" key={i}>
          <tbody>
          <tr>
            <td>
            <Message
              key={i}
              users={message.user}
              text={message.text}
            />
            </td>
          </tr>
          </tbody>
        </table>
      );
    })

		return (
			<div className='messages'>
				<h3> Messages: </h3>
        <div className='messageInputArea'>
        <ReactCSSTransitionGroup transitionName="messageAnimation" transitionEnterTimeout={500} transitionLeaveTimeout={300}>
            	{messages}
        </ReactCSSTransitionGroup>

        </div>
			</div>
		);
	}
});

//This component is form for the user to submit a message
var MessageForm = React.createClass({
	getInitialState() {
		return {
      text: ''
    };
	},
	handleSubmit(event) {
		event.preventDefault();
		var message = {
      user: this.props.user,
			text : this.state.text
		}
		this.props.onMessageSubmit(message);
		this.setState({ text: '' });
	},
	changeHandler(event) {
		this.setState({text: event.target.value});
	},
	render: function() {
		return(
        <div className="messageFormDiv">
				<form onSubmit={this.handleSubmit} className="messageForm">
          <div className="messageInput">
  					<input
  						onChange={this.changeHandler}
  						value={this.state.text}
              className="messageButton"
              id="messageBox"
              autoComplete="off"
  					/>
            <input type="submit" value="SEND" className="messageButton" id="sendMessage"/>
          </div>
				</form>
        </div>
		);
	}
});

//This is the component that holds the whole chat room
var AppChat = React.createClass({
  getInitialState: function() {
    return{
      users: [],
      messages: [],
      text: ''
    }
  },
  componentDidMount: function(){
    var that = this;
    socket.on('initialize', this.initialize);
    socket.on('user:join', this.userJoins);
    socket.on('user:left', this.userLeaves);
    socket.on('send:message', this.receiveMessage);
  },
  initialize: function(data) {
    var users = data.users;
    var name = data.name;
    this.setState({
      users: users,
      user: name
    });
  },
  userJoins: function(data) {
    var users = this.state.users;
    var messages = this.state.messages;
    var name = data.name;
    messages.push({
      user: ADMIN_USER,
      text: name + ' has joined the room'
    });
    this.setState({
      users: users,
      messages: messages
    });
  },
  userLeaves: function(data) {
    var users = data.users;
    var messages = this.state.messages;
    var name = data.name;
    messages.push({
      user: ADMIN_USER,
      text: name + ' has left the room'
    })
    this.setState({
      users: users,
      messages: messages
    });
  },
  receiveMessage: function(message) {
      var messages = this.state.messages;
  		messages.push(message);
  		this.setState({
        messages: messages
      });
  },
  handleMessage: function(message) {
    socket.emit('send:message', message);
  },
  //for react sliding menu
  showLeft: function() {
    this.refs.left.show();
  },
  render: function() {
    return (
      <div>
        <div>
          <button className="userButton hvr-glow" onClick={this.showLeft}>Show Users</button>
          <UsersList
  					users={this.state.users}
            ref="left"
            alignment="left"
  				/>
        </div>
        <div id="appChat">
          <div className="messageComponent">
            <MessageList
              messages={this.state.messages}
            />
            <MessageForm
              onMessageSubmit={this.handleMessage}
              user={this.state.user}
            />
          </div>
        </div>
      </div>
    );
  }
});

var MainApp = React.createClass({
  render: function() {
    return(
      <div id="mainApp">
        <AppChat id="chatApp" broadcast_id={this.props.broadcast_id}/>
        <VideoApp id="videoApp" broadcast_id={this.props.broadcast_id}/>
      </div>
    );
  }
});

// not found "page"
var NotFound = React.createClass({
  render: function() {
    return (
      <div>
        <h2>Page Not Found!</h2>
        <a href="/" id="mainPageRedirect">Back to Main Page</a>
      </div>
    );
  }
});

//This is setup of routes to go from AliasPicker to AppChat
var routes = (
  <Router history={browserHistory}>
    <Route path="/" component={App}>
      <IndexRoute component={AppCombined}/>
      {/*<Route path="chat" component={MainApp}/>*/}
      <Route path="*" component={NotFound}/>
    </Route>
  </Router>
);

// If this line of code is not here, nothing gets displayed!
ReactDOM.render(routes, document.querySelector('#app'));
