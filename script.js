// --- GAME LOGIC (from game.js) ---

// Get references to main game elements
const game = document.getElementById('game');
const scoreDisplay = document.getElementById('score');
const bin = document.getElementById('bin');
const livesDisplay = document.getElementById('lives');
const jerrycan = document.getElementById('jerrycan');

// Set jerrycan image
if (jerrycan) {
  jerrycan.src = 'img/water-can-transparent.png';
}

// Game state variables
let score = 0;
let binModes = ['recycle', 'waste'];
let binModeIndex = 0;
let binMode = binModes[binModeIndex];
let paused = false;
let fallIntervals = [];
let pausedItems = [];
let lives = 3;

let fallSpeed = 3;
let spawnRate = 1000;
let spawnInterval = null;

// Update the display of lives (jerrycans)
function updateLives() {
  livesDisplay.innerHTML = '';
  for (let i = 0; i < lives; i++) {
    const life = document.createElement('div');
    life.className = 'life-jerrycan';
    const img = document.createElement('img');
    img.src = 'img/water-can-transparent.png';
    img.alt = 'Jerrycan life';
    life.appendChild(img);
    livesDisplay.appendChild(life);
  }
}
updateLives();

// Sound for scoring points
const popSound = new Audio('audio/pop.mp3');
popSound.volume = 0.7;

// Update the score and optionally play a sound
function updateScore(change, playSound = false) {
  score += change;
  if (score < 0) score = 0;
  scoreDisplay.textContent = `Score: ${score}`;
  if (playSound) {
    try {
      popSound.currentTime = 0;
      popSound.play();
    } catch (e) {}
  }
}

// Switch bin mode (recycle/waste) on right-click
game.addEventListener('contextmenu', e => {
  e.preventDefault();
  binModeIndex = (binModeIndex + 1) % binModes.length;
  binMode = binModes[binModeIndex];
  updateBinDisplay();
});

// Update the bin image and style based on mode
function updateBinDisplay() {
  bin.innerHTML = '';
  const img = document.createElement('img');
  img.className = 'bin-img';
  if (binMode === 'recycle') {
    img.src = 'img/Recycle_Bin.png';
    img.alt = 'Recycle Bin';
  } else {
    img.src = 'img/Trash_Bin.png';
    img.alt = 'Waste Bin';
  }
  bin.appendChild(img);
  bin.style.width = '12vw';
  bin.style.height = '10vw';
  bin.style.minWidth = '100px';
  bin.style.minHeight = '80px';
  bin.style.maxWidth = '220px';
  bin.style.maxHeight = '180px';
  bin.style.background = 'none';
  bin.style.border = 'none';
  bin.style.padding = '0';
}

// Move bin and jerrycan with mouse
game.addEventListener('mousemove', e => {
  const rect = game.getBoundingClientRect();
  const binWidth = bin.offsetWidth || 100;
  const binHeight = bin.offsetHeight || 80;
  const jerrycanWidth = jerrycan.offsetWidth || 48;
  const centerX = e.clientX - rect.left;
  const centerY = e.clientY - rect.top;
  bin.style.left = `${centerX - binWidth / 2}px`;
  bin.style.top = `${centerY - binHeight / 2}px`;
  jerrycan.style.left = `${centerX + binWidth / 2 - jerrycanWidth / 2 + -15}px`;
});

// Pause/unpause game with Escape key
document.addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if (!paused) {
      paused = true;
      fallIntervals.forEach(clearInterval);
      fallIntervals = [];
      pausedItems = Array.from(document.querySelectorAll('.falling'));
    } else {
      paused = false;
      pausedItems.forEach(item => resumeFalling(item));
      pausedItems = [];
    }
  }
});

// Resume falling for paused items
function resumeFalling(item) {
  const fall = setInterval(() => {
    if (paused) return;
    const currentTop = parseInt(item.style.top);
    item.style.top = `${currentTop + fallSpeed}px`;

    // Get positions for collision detection
    const binRect = bin.getBoundingClientRect();
    const itemRect = item.getBoundingClientRect();
    const jerrycanRect = jerrycan.getBoundingClientRect();

    // Check for overlap with bin
    const overlap = !(
      itemRect.right < binRect.left ||
      itemRect.left > binRect.right ||
      itemRect.bottom < binRect.top ||
      itemRect.top > binRect.bottom
    );

    // Check for water collected by jerrycan
    const waterCollected = (
      item.dataset.type === 'water' &&
      !(itemRect.right < jerrycanRect.left ||
        itemRect.left > jerrycanRect.right ||
        itemRect.bottom < jerrycanRect.top ||
        itemRect.top > jerrycanRect.bottom)
    );

    // If item falls past jerrycan, lose a life
    if (currentTop > (jerrycan.offsetTop + jerrycan.offsetHeight)) {
      if (item.dataset.type === 'trash-recycle' || item.dataset.type === 'trash-waste') {
        lives--;
        try {
          const missSound = new Audio("audio/miss.mp3");
          missSound.volume = 0.7;
          missSound.currentTime = 0;
          missSound.play();
        } catch (e) {}
        updateLives();
        if (lives <= 0) {
          showGameOver();
          return;
        }
      }
      item.remove();
      clearInterval(fall);
      fallIntervals = fallIntervals.filter(f => f !== fall);
      return;
    }

    // Handle catching trash or water
    if (overlap) {
      if (
        (item.dataset.type === 'trash-recycle' && binMode === 'recycle') ||
        (item.dataset.type === 'trash-waste' && binMode === 'waste')
      ) {
        updateScore(1, true);
      } else {
        // Lose 2 points for wrong can
        updateScore(-2, true);
      }
      item.remove();
      clearInterval(fall);
      fallIntervals = fallIntervals.filter(f => f !== fall);
    } else if (waterCollected) {
      updateScore(1, true);
      item.remove();
      clearInterval(fall);
      fallIntervals = fallIntervals.filter(f => f !== fall);
    }
  }, 16);
  fallIntervals.push(fall);
}

// Spawn a new falling item (trash or water)
function spawnItem() {
  if (paused) return;

  const item = document.createElement('div');
  const trashTypes = [
    { type: 'trash-recycle', images: ['img/Recycle1.png', 'img/Recycle2.png'] },
    { type: 'trash-waste', images: ['img/Trash1.png', 'img/Trash2.png'] }
  ];
  const isWater = Math.random() < 0.5;
  let type, imgSrc;

  // Create water drop or trash
  if (isWater) {
    type = 'water';
    item.className = 'falling water';
    item.dataset.type = type;
    item.style.background = 'none';
    const img = document.createElement('img');
    img.src = 'img/Drop.png';
    img.alt = 'Water Drop';
    img.className = 'falling-img';
    img.style.width = '120%';
    img.style.height = '120%';
    item.appendChild(img);
  } else {
    const trash = trashTypes[Math.floor(Math.random() * trashTypes.length)];
    type = trash.type;
    item.className = `falling ${type}`;
    item.dataset.type = type;
    imgSrc = trash.images[Math.floor(Math.random() * trash.images.length)];
    const img = document.createElement('img');
    img.src = imgSrc;
    img.alt = type === 'trash-recycle' ? 'Recycle Trash' : 'Waste Trash';
    img.className = 'falling-img';
    img.style.width = '120%';
    img.style.height = '120%';
    item.appendChild(img);
  }

  // Set random horizontal position
  item.style.left = `${Math.random() * (game.clientWidth - 40)}px`;
  item.style.top = '0px';
  game.appendChild(item);

  // Animate falling
  const interval = setInterval(() => {
    if (paused) return;
    let top = parseInt(item.style.top);
    item.style.top = (top + fallSpeed) + 'px';

    // Lose a life if trash falls past jerrycan
    if (top > (jerrycan.offsetTop + jerrycan.offsetHeight)) {
      if (type === 'trash-recycle' || type === 'trash-waste') {
        lives--;
        try {
          const missSound = new Audio("audio/miss.mp3");
          missSound.volume = 0.7;
          missSound.currentTime = 0;
          missSound.play();
        } catch (e) {}
        updateLives();
        if (lives <= 0) {
          showGameOver();
          return;
        }
      }
      item.remove();
      clearInterval(interval);
      fallIntervals = fallIntervals.filter(f => f !== interval);
      return;
    }

    // Water collected by jerrycan
    if (type === 'water') {
      const itemRect = item.getBoundingClientRect();
      const jerrycanRect = jerrycan.getBoundingClientRect();
      const hitJerrycan = !(
        itemRect.right < jerrycanRect.left ||
        itemRect.left > jerrycanRect.right ||
        itemRect.bottom < jerrycanRect.top ||
        itemRect.top > jerrycanRect.bottom
      );
      if (hitJerrycan) {
        if (lives > 0) updateScore(1, true);
        item.remove();
        clearInterval(interval);
        fallIntervals = fallIntervals.filter(f => f !== interval);
        return;
      }
    }

    // Remove item if it falls off the screen
    if (top > game.clientHeight) {
      item.remove();
      clearInterval(interval);
      fallIntervals = fallIntervals.filter(f => f !== interval);
    }
  }, 16);
  fallIntervals.push(interval);

  // Allow clicking trash for points
  item.addEventListener('pointerdown', e => {
    if (e.pointerType === 'mouse' && e.button !== 0) return;
    if (lives > 0) {
      if (
        (type === 'trash-recycle' && binMode === 'recycle') ||
        (type === 'trash-waste' && binMode === 'waste')
      ) {
        updateScore(1, true);
      } else {
        // Lose 2 points for wrong can
        updateScore(-2, true);
      }
    }
    item.remove();
    clearInterval(interval);
    fallIntervals = fallIntervals.filter(f => f !== interval);
  });
}

// Set difficulty (easy, medium, hard)
function setDifficulty(mode) {
  if (mode === 'easy') {
    fallSpeed = 3;
    spawnRate = 1000;
  } else if (mode === 'medium') {
    fallSpeed = 5;
    spawnRate = 700;
  } else if (mode === 'hard') {
    fallSpeed = 8;
    spawnRate = 400;
  }
  restartGame();
}

// Show game over screen
function showGameOver() {
  clearInterval(spawnInterval);
  fallIntervals.forEach(clearInterval);
  fallIntervals = [];
  game.style.display = 'none';
  if (typeof showGameOverPage === 'function') {
    showGameOverPage(score);
  }
}

// Hide game on welcome page
if (document.getElementById('welcome-page')) {
  document.getElementById('game').style.display = 'none';
} else {
  document.getElementById('game').style.display = '';
}

// Restart the game and reset state
function restartGame() {
  document.querySelectorAll('.falling').forEach(el => el.remove());
  score = 0;
  lives = 3;
  binModeIndex = 0;
  binMode = binModes[binModeIndex];
  paused = false;
  fallIntervals.forEach(clearInterval);
  fallIntervals = [];
  pausedItems = [];
  updateScore(0);
  updateLives();
  bin.textContent = binMode.charAt(0).toUpperCase() + binMode.slice(1);
  bin.classList.remove('bin-recycle', 'bin-waste');
  bin.classList.add('bin-recycle');
  game.style.display = '';
  clearInterval(spawnInterval);
  spawnInterval = setInterval(spawnItem, spawnRate);
  updateBinDisplay();
}

// Expose functions for other scripts
window.restartGame = restartGame;
window.setDifficulty = setDifficulty;

// Initialize bin display
updateBinDisplay();

// Remove duplicate logos and unused elements on DOM load
window.addEventListener('DOMContentLoaded', () => {
  const logoBar = document.getElementById('logo-bar');
  if (logoBar) logoBar.remove();
  const well = document.getElementById('well');
  if (well) well.remove();
  document.querySelectorAll('.cw-logo').forEach(el => el.remove());
  document.querySelectorAll('.cw-logo-top').forEach(el => el.remove());
});

// --- GAME OVER LOGIC (from gameover.js) ---

// Show the game over page with the final score
window.showGameOverPage = function(finalScore) {
  let page = document.getElementById('gameover-page');
  if (!page) {
    page = document.createElement('div');
    page.id = 'gameover-page';
    page.innerHTML = `
      <div class="gameover-content">
        <img class="gameover-img" src="img/gameover.png" alt="Game Over">
        <div class="gameover-msg">Game Over!</div>
        <div class="gameover-score"></div>
        <button class="gameover-btn" id="restart-btn">Restart</button>
      </div>
    `;
    document.body.appendChild(page);
  }
  page.style.display = '';
  page.querySelector('.gameover-score').textContent = `Final Score: ${finalScore}`;
  const restartBtn = page.querySelector('#restart-btn');
  restartBtn.onclick = () => {
    page.style.display = 'none';
    restartGame();
  };
};
