const socket = io();
let currentRoomId = null;
let playerName = '';

// Generate or get room ID from URL
function getRoomIdFromUrl() {
    const params = new URLSearchParams(window.location.search);
    return params.get('room') || null;
}

// Set room ID in URL
function setRoomIdInUrl(roomId) {
    const url = new URL(window.location);
    url.searchParams.set('room', roomId);
    window.history.pushState({}, '', url);
}

// Initialize
window.addEventListener('DOMContentLoaded', () => {
    const urlRoomId = getRoomIdFromUrl();
    if (urlRoomId) {
        document.getElementById('roomId').value = urlRoomId;
        joinRoom(urlRoomId);
    }
});

// Join room
document.getElementById('joinBtn').addEventListener('click', () => {
    const roomId = document.getElementById('roomId').value.trim() || generateRoomId();
    joinRoom(roomId);
});

function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function joinRoom(roomId) {
    currentRoomId = roomId;
    socket.emit('join-room', roomId);
    setRoomIdInUrl(roomId);
    
    // Show room info
    document.getElementById('currentRoomId').textContent = roomId;
    document.getElementById('shareLink').value = window.location.href;
    document.getElementById('roomInfo').classList.remove('hidden');
}

// Copy link
document.getElementById('copyBtn').addEventListener('click', () => {
    const shareLink = document.getElementById('shareLink');
    shareLink.select();
    document.execCommand('copy');
    
    const btn = document.getElementById('copyBtn');
    const originalText = btn.textContent;
    btn.textContent = 'Copied!';
    btn.style.background = '#28a745';
    
    setTimeout(() => {
        btn.textContent = originalText;
        btn.style.background = '#28a745';
    }, 2000);
});

// Restart game
document.getElementById('restartBtn').addEventListener('click', () => {
    if (currentRoomId) {
        socket.emit('restart-game', currentRoomId);
    }
});

// Socket events
socket.on('player-name', (name) => {
    playerName = name;
});

socket.on('players-update', (players) => {
    const playersList = document.getElementById('playersList');
    const playerCount = document.getElementById('playerCount');
    
    playerCount.textContent = players.length;
    playersList.innerHTML = '';
    
    players.forEach((player, index) => {
        const li = document.createElement('li');
        li.textContent = player;
        if (player === playerName) {
            li.style.borderLeftColor = '#28a745';
            li.textContent += ' (You)';
        }
        playersList.appendChild(li);
    });
});

socket.on('game-status', (data) => {
    const statusDiv = document.getElementById('gameStatus');
    statusDiv.textContent = data.message;
    statusDiv.className = `status-message ${data.status}`;
});

socket.on('game-start', (data) => {
    const gameArea = document.getElementById('gameArea');
    const roleDisplay = document.getElementById('roleDisplay');
    const numberDisplay = document.getElementById('numberDisplay');
    const roleMessage = document.getElementById('roleMessage');
    
    gameArea.classList.remove('hidden');
    
    if (data.role === 'knower') {
        roleDisplay.textContent = 'You Know the Number!';
        roleDisplay.className = 'role-display knower';
        numberDisplay.textContent = data.number;
        numberDisplay.style.display = 'block';
    } else {
        roleDisplay.textContent = 'You are the IMPOSTER!';
        roleDisplay.className = 'role-display imposter';
        numberDisplay.textContent = '???';
        numberDisplay.style.display = 'block';
    }
    
    roleMessage.textContent = data.message;
});

socket.on('game-restarted', () => {
    const gameArea = document.getElementById('gameArea');
    gameArea.classList.add('hidden');
    
    const roleDisplay = document.getElementById('roleDisplay');
    const numberDisplay = document.getElementById('numberDisplay');
    const roleMessage = document.getElementById('roleMessage');
    
    roleDisplay.textContent = '';
    numberDisplay.textContent = '';
    roleMessage.textContent = '';
});

