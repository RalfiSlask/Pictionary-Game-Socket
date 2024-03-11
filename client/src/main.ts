import './styles/style.css';
import { IUserType, IUserMessageType } from './utils/types';
import { swapClassBetweenTwoElements, getRandomColor } from './utils/helperfunctions';
import { io } from 'socket.io-client';
import { initializeDrawing } from './utils/drawingCanvas';

const socket = io('http://localhost:3000/');

const usernameInput = document.getElementById('loginInput');
const loginButton = document.getElementById('loginButton');
const loginSection = document.getElementById('loginSection');
const gameLobbySection = document.getElementById('gameLobbySection');
const gameLobbyList = document.getElementById('gameLobbySectionUl');
const playersReadyContainer = document.getElementById('playersReady');
const startGameButton = document.getElementById('startGameButton');
const usernameDisplay = document.getElementById('usernameDisplay');
const guessButton = document.getElementById('guessButton');
const guessInput = document.getElementById('guessInput');
const chatList = document.getElementById('chatList');
const userThatIsDrawing = document.getElementById('user');
const gameSection = document.getElementById('gameSection');
const playerHighscoreList = document.getElementById('playerHighscore');
const userIcon = document.getElementById('userIcon');
const wordToDraw: HTMLElement | null = document.getElementById('wordToDraw');

// placeholder for point logic when guessing the right answer
document.getElementById('right')?.addEventListener('click', guessedRightAnswer);

// Remove later!!! - Placeholder to click new word (Logo img)

const clickTest = document.querySelector('header img');
console.log(clickTest);

clickTest?.addEventListener('click', fetchWordsFromServer);

/**
 * Fetch endpoint for wordarray
 */

function fetchWordsFromServer() {
  fetch('http://localhost:3000/words')
    .catch(err => console.log('error', err));
}

//fetchWordsFromServer();

let gameArray: any[] = [];

/**
 * Pick random word and splice it from new array 
 */

function randomWord() {
  if (!wordToDraw) return;
  const randomWordId = Math.floor(Math.random() * gameArray.length);
  let currentWord = gameArray[randomWordId];
  //console.log(gameArray.length + ' ' + randomWordId + ' ' + currentWord.id + currentWord.word);
  wordToDraw.innerText = currentWord.word;

  gameArray.splice(randomWordId, 1); //Splice from array
  //console.log('gameArray', gameArray);
}

socket.on('words', words => {
  const wordArray = words[0].words;
  
  if (gameArray.length === 0) {
    gameArray = wordArray;
    randomWord();
  } else {
    randomWord();
  }
});



/**
 * Handles login for user
 * Picket username is set in localstorage
 * Displays error message if input is not filled
 * Emits username to server using socket
 * @param {Element | null} input
 * @param {Element | null} loginSection
 * @returns void
 */
function handleLoginOnClick(input: Element | null, loginSection: Element | null, gameLobbySection: Element | null) {
  if (!input || !loginSection) {
    return;
  }
  const inputValue = (input as HTMLInputElement).value;
  if (inputValue.trim().length <= 0) {
    // we can change this later if we want to add a red text etc
    alert('you have to fill in input');
  } else {
    localStorage.setItem('user', inputValue);
    emitUserInfoToServer(inputValue);
    if (usernameDisplay) {
      usernameDisplay.textContent = inputValue;
    }
    userIcon?.classList.remove('hidden');
    swapClassBetweenTwoElements(loginSection, gameLobbySection, 'hidden');
  }
}

function emitUserInfoToServer(username: string) {
  const randomColor = getRandomColor();
  socket.emit('newUser', { username: username, color: randomColor });
}

function createUserIcon(color: string) {
  const userIcon = document.createElement('div');
  userIcon.classList.add('list-dot');
  userIcon.style.backgroundColor = color;
  return userIcon;
}

function createUserText(username: string, color: string) {
  const userText = document.createElement('p');
  userText.textContent = username;
  userText.style.color = color;
  return userText;
}

function createReadyButton(id: string, isReady: boolean) {
  const readyButton = document.createElement('button');
  readyButton.id = id;
  readyButton.innerText = isReady ? 'ready' : 'waiting';
  isReady ? readyButton.classList.add('ready') : readyButton.classList.add('waiting');
  return readyButton;
}

/**
 * Adds a user to the lobby list with a ready button. Each user's name is displayed
 * with a specific color defined by the user's `color` property.
 * sets button id to user id
 * @param {object} user - The user object that contains username, ID and color.
 * @param {string} user.username - The users name.
 * * @param {string} user.color - The CSS color code (as a string) for the user's name.
 * @param {string} user.id - The users socket-id.
 */

function appendUserToList(user: { username: string; color: string; id: string; isReady: boolean }) {
  if (!gameLobbyList) return;
  const { username, color, id, isReady } = user;
  const userElement = document.createElement('div');
  const userPanel = document.createElement('div');
  const userIconContainer = document.createElement('div');
  const dotContainer = document.createElement('div');
  dotContainer.classList.add('dot-panel');
  const userIcon = createUserIcon(color);
  const userText = createUserText(username, color);
  const readyButton = createReadyButton(id, isReady);
  userIconContainer.id = 'dot-container';
  dotContainer.append(userIcon);
  userIconContainer.append(dotContainer);
  userPanel.classList.add('player-panel');
  userPanel.append(userIconContainer, userText);
  userElement.style.color = color;
  userElement.append(userPanel, readyButton);
  const listItem = document.createElement('li');
  listItem.appendChild(userElement);
  checkNumberOfPlayers(listItem);
}

function checkNumberOfPlayers(player: HTMLElement) {
  if (gameLobbyList !== null) {
    let liElements = gameLobbyList.getElementsByTagName('li');
    const amountLiElements = liElements.length;
    if (amountLiElements >= 5) {
      alert('Spelet är fullt!');
    } else {
      gameLobbyList.appendChild(player);
    }
  }
}

/**
 * With event delegation checks if target is button
 * If target is button, change player status and send to server together with button id
 * @param {Event} e - click event
 * @returns void
 */
function handleClickOnButtons(e: Event) {
  const target = e.target as HTMLElement;
  const storedId = localStorage.getItem('userId');
  if (target.tagName !== 'BUTTON' || target.id !== storedId) return;
  const currentStatus = target.textContent === 'waiting' ? 'ready' : 'waiting';
  const statusClass = target.textContent === 'waiting' ? 'ready' : 'waiting';
  socket.emit('userStatus', { statusText: currentStatus, statusId: target.id, statusClass: statusClass });
}

function updatePlayersReadyAndWhenFullDisplayStartGameButton(
  startGameButton: Element | null,
  playersReadyContainer: Element | null,
  players: number
) {
  if (!playersReadyContainer) return;
  playersReadyContainer.textContent = `${players}/5`;
  if (players === 5) {
    startGameButton?.removeAttribute('disabled');
  } else {
    /*  startGameButton?.setAttribute('disabled', 'true'); */
  }
}

/**
 * Generates player highscore based on usernames and current points
 * @param {IUserType[]} users
 * @param {Element | null} playerHighscoreList
 * @returns void
 */
function generatePlayerHighscore(users: IUserType[], playerHighscoreList: Element | null) {
  if (!playerHighscoreList) return;
  playerHighscoreList.innerHTML = '';
  users.forEach((user, index) => {
    const { username, points } = user;
    const li = document.createElement('li');
    const playerNumber = document.createElement('p');
    const userNameContainer = document.createElement('p');
    const colon = document.createElement('p');
    const pointsContainer = document.createElement('div');
    playerNumber.classList.add('player-number');
    pointsContainer.classList.add('points');
    colon.classList.add('colon');
    playerNumber.textContent = (index + 1).toString();
    colon.textContent = ':';
    userNameContainer.textContent = username;
    pointsContainer.textContent = points.toString();
    li.append(playerNumber, pointsContainer, colon, userNameContainer);
    playerHighscoreList.append(li);
  });
}

/**
 * Updates the chat where users write their guesses
 */
function updateGuessChat(guess: IUserMessageType) {
  let li = document.createElement('li');
  let userContainer = document.createElement('p');
  let messageContainer = document.createElement('p');
  userContainer.textContent = guess.user + ':';
  userContainer.style.color = guess.color;
  messageContainer.textContent = guess.message;
  li.append(userContainer, messageContainer);
  console.log(li);
  if (chatList !== null) {
    chatList.appendChild(li);
    chatList.scrollTop = chatList.scrollHeight;
  }
}

// ---------------------- COUNTDOWN FUNCTIONS ---------------------- //

// Function to update the countdown display
function updateCountdownDisplay(countdown: number) {
  const countdownDisplay = document.getElementById('countdownValue');
  if (countdownDisplay) {
    countdownDisplay.textContent = countdown.toString();
  }
}

function guessedRightAnswer() {
  const userId = localStorage.getItem('userId');
  socket.emit('updatePoints', userId);
  // Listen for countdown updates from the server
  socket.on('countdownUpdate', (countdown: number) => {
    updateCountdownDisplay(countdown);
  });
}

// ---------------------- SOCKET FUNCTIONS ---------------------- //

/**
 * Initializes a listener for the 'updateUserList' event from the server. Upon receiving the event,
 * the user list in the interface is updated with the received list of users.
 * Each user is displayed as a list item with their name in the specified color and their socket ID.
 */

function initializeUserList(gameLobbyList: Element | null): void {
  socket.on('updateUserList', (users: IUserType[]) => {
    if (!gameLobbyList) return;
    gameLobbyList.innerHTML = '';
    users.forEach(user => appendUserToList(user));
    generatePlayerHighscore(users, playerHighscoreList);
  });
}

// Listen for countdown updates from the server
socket.on('countdownUpdate', (countdown: number) => {
  updateCountdownDisplay(countdown);
});

// Listen for countdown finished event from the server
socket.on('countdownFinished', () => {
  // Display a message when the countdown finishes
  const countdownMessage = document.getElementById('countdownMessage');
  if (countdownMessage) {
    countdownMessage.textContent = "Time's up!";
  }
});

/**
 * Recieves users info from server, user id and how many players are ready
 * Sets userid in localstorage
 * Updates UI for how many players are ready when logging in
 * @param {Element | null} startGameButton
 * @param {Element | null} playersReadyContainer
 */
function recieveSocketForNewUser(startGameButton: Element | null, playersReadyContainer: Element | null) {
  socket.on('newUser', usersInfo => {
    const { userId, playersReady } = usersInfo;
    localStorage.setItem('userId', userId);
    updatePlayersReadyAndWhenFullDisplayStartGameButton(startGameButton, playersReadyContainer, playersReady);
  });
}

/**
 * Socket on from which status the user has, catches io.emit
 * Changes the button text to the status
 */
function recieveSocketUserStatus(gameLobbyList: Element | null) {
  socket.on('userStatus', status => {
    if (!gameLobbyList) return;
    const buttons = gameLobbyList.querySelectorAll('button');
    const { statusId, statusText, statusClass } = status;
    console.log(statusClass);
    buttons.forEach(button => {
      if (button.id !== statusId) return;
      button.textContent = statusText;
      button.className = '';
      button.classList.add(statusClass);
    });
  });
}

/**
 * Updates how many players are currently ready
 */
function recieveSocketPlayersReady(startGameButton: Element | null, playersReadyContainer: Element | null) {
  socket.on('playersReady', players => {
    updatePlayersReadyAndWhenFullDisplayStartGameButton(startGameButton, playersReadyContainer, players);
  });
}

function recieveSocketForUpdatedUserPoints() {
  socket.on('updatedUserPoints', users => {
    // here implement some kind of logic for guessing right in chat
    generatePlayerHighscore(users, playerHighscoreList);
  });
}

/**
 * Sets up a listener for the "newRound" event. Updates the user interface with the name
 * of the user that is drawing in the new round. It also includes a TODO for adding logic to
 * enable or disable drawing capabilities based on the current user's role.
 * @param {Element | null} userThatIsDrawing - The DOM element where the current drawing user's name is displayed.
 */
function startNewRound(userThatIsDrawing: Element | null) {
  socket.on('newRound', (nextUserName: string) => {
    if (userThatIsDrawing) {
      userThatIsDrawing.textContent = nextUserName;
    }
    // TODO: Add logic to ensure enable or disable the canvas
    // depending on whether we're the new player or not
  });
}

/**
 * Sets up a listener for the "startGame" event. When a game starts, it changes the visibility of the
 * game section and lobby section by toggling their classes, effectively showing the game section and
 * hiding the game lobby section. This function is used to transition the user interface from the lobby
 * to the active game state.
 * @param {Element | null} gameSection - The DOM element representing the main game area, to be shown when the game starts.
 * @param {Element | null} gameLobbySection - The DOM element representing the game lobby, to be hidden when the game starts.
 */
function startNewGame(gameSection: Element | null, gameLobbySection: Element | null) {
  socket.on('startGame', () => {
    if (gameSection && gameLobbySection) {
      gameLobbySection.classList.add('hidden');
      gameSection.classList.remove('hidden');
    }
  });
}

socket.on('guess', arg => {
  console.log('guess!', arg);
  updateGuessChat(arg);
});

function initialFunctionsOnLoad() {
  initializeUserList(gameLobbyList);
  recieveSocketUserStatus(gameLobbyList);
  recieveSocketPlayersReady(startGameButton, playersReadyContainer);
  recieveSocketForNewUser(startGameButton, playersReadyContainer);
  startNewRound(userThatIsDrawing);
  recieveSocketForUpdatedUserPoints();
  startNewGame(gameSection, gameLobbySection);
}

document.addEventListener('DOMContentLoaded', initialFunctionsOnLoad);

gameLobbyList?.addEventListener('click', e => {
  handleClickOnButtons(e);
});

/* function StartGame() {
  // add functions here when starting game, when done move to proper place in our code
  // socket.emit('startGame', true); uncommenct later
  // swapClassBetweenTwoElements(gameLobbySection, gameSection, 'hidden');
  socket.emit('startGame');
  swapClassBetweenTwoElements(gameLobbySection, gameSection, 'hidden');
  
}

startGameButton?.addEventListener('click', StartGame); */

startGameButton?.addEventListener('click', () => {
  socket.emit('startGame');
  fetchWordsFromServer(); // Random word
});

/**
 * Sends user guess to the server
 */
guessButton?.addEventListener('click', () => {
  if (guessInput !== null) {
    const input = guessInput as HTMLInputElement;
    const guessUser = localStorage.getItem('user');

    socket.emit('guess', {
      message: input.value,
      user: guessUser,
    });
  }
});

loginButton?.addEventListener('click', () => {
  handleLoginOnClick(usernameInput, loginSection, gameLobbySection);
});

window.onload = () => {
  initializeDrawing(socket);
};
