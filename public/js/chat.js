var chatWrappper;
var chatBox;
var chatField;
var chatting = false;

function createChatElement(){
  chatWrapper = document.createElement('div')
  chatWrapper.id = "chatWrapper"
  chatWrapper.className = "chatWrapper"
  chatWrapper.style.display = "none"

  chatBox = document.createElement('div')
  chatBox.id = "chatBox"
  chatBox.className = "chatBox"

  chatField = document.createElement('input')
  chatField.className = "chatField"
  chatField.setAttribute("type", "text")
  chatField.maxLength = 128
  chatField.style.display = "none"

  chatWrapper.appendChild(chatBox)
  chatWrapper.appendChild(chatField)
  document.body.appendChild(chatWrapper)
}

function showChatfield(){
  chatField.value = ""
  chatField.style.display = ""
  chatField.focus()
  chatField.value = ""
  chatting = true;
}

function chatMessage(data){
  var chatMsg = document.createElement('div')
  chatMsg.innerHTML = data.from+": "+data.msg
  chatBox.appendChild(chatMsg)
  chatBox.scrollTop = chatBox.scrollHeight;
}

function sendChatMessage(){
  socket.emit("chatMessage", {from: socket.id, msg: chatField.value})
  chatField.style.display = "none"
  chatField.value = ""
  document.body.requestPointerLock()
  chatting = false
}
