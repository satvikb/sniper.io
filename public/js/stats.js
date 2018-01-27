//player stats area
var playerStatWrapper;
var playerStatBox;

//player stats values
var playerAmmoStat;
var gunNameStat;
//TEMO
var scoreStat;

function createPlayerStats(){
  playerStatWrapper = document.createElement('div')
  playerStatWrapper.className = "playerStatWrapper"
  playerStatWrapper.style.display = "none"

  playerStatBox = document.createElement('div')
  playerStatBox.className = "playerStatBox"

  playerAmmoStat = document.createElement('div')
  playerAmmoStat.innerHTML = ""

  gunNameStat = document.createElement('div')
  gunNameStat.innerHTML = ""

  scoreStat = document.createElement('div')
  scoreStat.innerHTML = ""

  playerStatBox.appendChild(playerAmmoStat)
  playerStatBox.appendChild(gunNameStat)
  playerStatBox.appendChild(scoreStat)
  playerStatWrapper.appendChild(playerStatBox)
  document.body.appendChild(playerStatWrapper)
}

function showPlayerStats(){
  playerStatWrapper.style.display = ""
}

function updateStats(data){
  playerAmmoStat.innerHTML = data.ammo+" / "+data.maxAmmo
  // gunNameStat.innerHTML = data.gunName
  var move = controls.getMove()
  gunNameStat.innerHTML = move[0]+" "+move[1]
  controls.resetMove()
  scoreStat.innerHTML = data.score
}
