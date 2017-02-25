function play(){
  console.log("play")
  var nickname = nicknameInput.value
  // var nickname = rawNickname == "" ? "Untitled" : rawNickname
  socket.emit("joinGame", {id: socket.id, nickname: nickname})
  lobbyDiv.style.display = 'none'
  blocker.style.display = ''
  chatWrapper.style.display = ''
}

var lobbyDiv;
var nicknameInput;
var playButton;

function createLobbyScreen(){
  lobbyDiv = document.createElement('div')
  lobbyDiv.id = "lobby"

  nicknameInput = document.createElement('input')
  nicknameInput.id = "nickname"
  nicknameInput.type = "text"
  nicknameInput.placeholder = "Nickname"
  nicknameInput.maxLength = 6

  playButton = document.createElement('button')
  playButton.id = "playButton"
  playButton.onclick = function(){play()}
  playButton.innerHTML = "Play"

  lobbyDiv.appendChild(nicknameInput)
  lobbyDiv.appendChild(playButton)
  document.body.appendChild(lobbyDiv)
}
