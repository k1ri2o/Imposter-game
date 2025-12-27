// Get server URL from environment or use current origin
// IMPORTANT: Update the server URL below with your actual Socket.IO server URL
// For Vercel deployment, you need to host the server separately (e.g., Railway, Render, Fly.io)
const getServerUrl = () => {
    // For local development, use current origin
    if (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') {
        return window.location.origin;
    }
    
    // For production, use configured server URL or default
    // Update this URL to point to your Socket.IO server
    const configuredUrl = window.ENV?.SOCKET_SERVER_URL;
    if (configuredUrl) {
        return configuredUrl;
    }
    
    // Fallback - you MUST update this with your actual server URL
    // Example: 'https://your-app-name.railway.app' or 'https://your-app.onrender.com'
    return 'https://imposter-game-production-769d.up.railway.app';
};

const serverUrl = getServerUrl();

// Check if server URL is configured
if (serverUrl === 'YOUR_SERVER_URL_HERE') {
    console.error('⚠️ Server URL not configured! Please update public/client.js with your server URL.');
}

const socket = serverUrl !== 'YOUR_SERVER_URL_HERE' ? io(serverUrl, {
    transports: ['websocket', 'polling'],
    reconnection: true,
    reconnectionDelay: 1000,
    reconnectionAttempts: 5
}) : null;

let currentRoomId = null;
let playerName = '';
let isConnected = false;

// Connection status handlers
if (socket) {
    socket.on('connect', () => {
        console.log('Connected to server');
        isConnected = true;
        updateConnectionStatus('connected', 'Connected to server');
    });

    socket.on('disconnect', () => {
        console.log('Disconnected from server');
        isConnected = false;
        updateConnectionStatus('disconnected', 'Disconnected from server. Please refresh the page.');
    });

    socket.on('connect_error', (error) => {
        console.error('Connection error:', error);
        isConnected = false;
        updateConnectionStatus('error', 'Cannot connect to server. Please check if the server URL is correct and the server is running.');
    });
} else {
    // Show error if socket is not initialized
    window.addEventListener('DOMContentLoaded', () => {
        updateConnectionStatus('error', '⚠️ Server URL not configured! Please update public/client.js with your server URL and redeploy.');
    });
}

function updateConnectionStatus(status, message) {
    const statusDiv = document.getElementById('gameStatus');
    if (statusDiv) {
        statusDiv.textContent = message;
        statusDiv.className = `status-message ${status}`;
    }
}

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
    if (urlRoomId && socket) {
        document.getElementById('roomId').value = urlRoomId;
        // Wait for connection before joining
        if (isConnected) {
            joinRoom(urlRoomId);
        } else {
            socket.once('connect', () => joinRoom(urlRoomId));
        }
    }
});

// Join room
document.getElementById('joinBtn').addEventListener('click', () => {
    if (!socket) {
        updateConnectionStatus('error', 'Server URL not configured! Please update the server URL in client.js and redeploy.');
        return;
    }
    if (!isConnected) {
        updateConnectionStatus('error', 'Not connected to server. Please wait and try again.');
        return;
    }
    const roomId = document.getElementById('roomId').value.trim() || generateRoomId();
    joinRoom(roomId);
});

function generateRoomId() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

function joinRoom(roomId) {
    if (!socket) {
        updateConnectionStatus('error', 'Cannot join room: Server not configured.');
        return;
    }
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
    if (currentRoomId && socket) {
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

