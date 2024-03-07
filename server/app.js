const app = require('express')();
const server = require('http').createServer(app);

const io = require('socket.io')(server, {
  cors: {
    origin: '*',
    methods: ['GET', 'POST'],
  },
});

const users = [];
let playersReady = 0;
let usedIndexes = []; // keeps track of how many users have already drawn

/**
 * Calculates in 5 seconds interval based on timeLeft how many points are recieved
 * @param {number} timeLeft
 * @returns {number} - points
 */
function getPointsAsNumberBasedOnTime(timeLeft) {
  // if time left is greater than 5 seconds give player points
  const pointsThreshold = 5;
  const secsPerPointInterval = 5;
  const pointsPerInterval = 100;
  const minPointsAboveThreshold = 100; // min amount of points over 5 seconds
  if (timeLeft >= pointsThreshold) {
    const secsAboveThreshold = timeLeft - pointsThreshold;
    return minPointsAboveThreshold + Math.floor(secsAboveThreshold / secsPerPointInterval) * pointsPerInterval;
  }
  // if player does not answer above the time threshold they get no points
  return 0;
}

/**
 * Returns random string from provided array of strings
 * Checks if user has already been picked
 * @param {string[]} array
 * @returns random string
 */
function getRandomizedUserToDraw(users) {
  let randomIndex = Math.floor(Math.random() * users.length);
  if (usedIndexes.length >= users.length) return;
  const hasPlayerAlreadyDrawn = usedIndexes.findIndex(index => index === randomIndex);
  if (hasPlayerAlreadyDrawn === -1) {
    usedIndexes.push(randomIndex);
    return users[randomIndex];
  } else {
    return getRandomizedUserToDraw(users);
  }
}

app.get('/', (req, res) => {
  res.send('<h1>Welcome to our server!</h1>');
});

io.on('connection', socket => {
  socket.on('chat', arg => {
    console.log('incoming chat', arg);
    io.emit('chat', arg);
  });

  // Triggers updateUserList for the user that connects to the server.
  socket.emit('updateUserList', users);

  socket.on('newUser', user => {
    const newUser = { username: user.username, color: user.color, id: socket.id, isReady: false, points: 0 };
    users.push(newUser);
    io.emit('updateUserList', users);
    socket.emit('newUser', { userId: socket.id, playersReady });
  });

  // gets stored id from client, if user exists update user points based on time
  // sending back all users with the updated points
  socket.on('updatePoints', userId => {
    const user = users.find(user => user.id === userId);
    if (user) {
      // placeholder right now
      user.points += getPointsAsNumberBasedOnTime(50);
      io.emit('updatedUserPoints', users);
    }
  });

  socket.on('startGame', gameState => {
    if (!gameState) return;
    const nameOnlyUsers = users.map(user => user.username);
    const randomUser = getRandomizedUserToDraw(nameOnlyUsers);
    io.emit('randomUser', randomUser);
  });

  // from the client ready / waiting status change the player status
  socket.on('userStatus', status => {
    // does user exist in users, if not exit function
    const user = users.find(user => user.id === socket.id);
    if (!user) return;

    if (status.statusText === 'ready') {
      if (!user.isReady) {
        user.isReady = true;
        playersReady += 1;
      }
    } else {
      if (user.isReady) {
        user.isReady = false;
        playersReady -= 1;
      }
    }
    io.emit('userStatus', status);
    io.emit('playersReady', playersReady);
  });

  // on disconnect kick player from game
  socket.on('disconnect', () => {
    // find the userindex in the users array that corresponds to the disconnected socket.id
    const userIndex = users.findIndex(user => user.id === socket.id);
    if (userIndex === -1) return;
    // if player was in ready move, remove their ready from the playersReady number
    if (users[userIndex].isReady) {
      playersReady -= 1;
      io.emit('playersReady', playersReady);
    }
    // remove the user with splice
    users.splice(userIndex, 1);
    io.emit('updateUserList', users);
  });

// Listen for the "startGame" event from the server
socket.on('startGame', () => {
  let countdown = 60; // Initial countdown value in seconds

  // An interval to update the countdown every second
  const countdownInterval = setInterval(() => {
    if (countdown <= 0) {
      // If countdown reaches zero, clear the interval and emit a "countdownFinished" event
      clearInterval(countdownInterval);
      io.emit('countdownFinished'); // Notify clients that the countdown has finished
    } else {
      // Update the countdown value and emit a "countdownUpdate" event to all connected clients
      io.emit('countdownUpdate', countdown); // Send the updated countdown value to clients
      countdown--; // Decrement the countdown value by 1 second
    }
  }, 1000); // Run the interval every 1000 milliseconds (1 second)
});
});

const PORT = process.env.PORT || 3000;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
