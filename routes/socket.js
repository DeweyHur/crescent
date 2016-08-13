// Keep track of which names are used so that there are no duplicates
class UserNames {

	constructor() {
		this.names = {};
	}

  claim(name) {
    if (!name || this.names[name]) {
      return false;
    } else {
      this.names[name] = true;
      return true;
    }
  };

  // find the lowest unused "guest" name and claim it
  getGuestName() {
    let name,
      nextUserId = 1;

    do {
      name = 'Guest ' + nextUserId;
      nextUserId += 1;
    } while (!this.claim(name));

    return name;
  };

  // serialize claimed names as an array
  serialize() {
	  return Object.keys(this.names);
  };

  remove(name) {
    if (this.names[name]) {
      delete this.names[name];
    }
  };
}
const userNames = new UserNames();

// export function for listening to the socket
module.exports = (socket) => {
  let name = userNames.getGuestName();

  // send the new user their name and a list of users
  socket.emit('init', {
    name: name,
    users: userNames.serialize()
  });

  // notify other clients that a new user has joined
  socket.broadcast.emit('user:join', {
    name: name
  });

  // broadcast a user's message to other users
  socket.on('send:message', (data) => {
    socket.broadcast.emit('send:message', {
      user: name,
      text: data.text
    });
  });

  // validate a user's name change, and broadcast it on success
  socket.on('change:name', (data, fn) => {
    if (userNames.claim(data.name)) {
      const oldName = name;
      userNames.remove(oldName);

      name = data.name;
      
      socket.broadcast.emit('change:name', {
        oldName: oldName,
        newName: name
      });

      fn(true);
    } else {
      fn(false);
    }
  });

  // clean up when a user leaves, and broadcast it to other users
  socket.on('disconnect', () => {
    socket.broadcast.emit('user:left', {
      name: name
    });
    userNames.remove(name);
  });
};
