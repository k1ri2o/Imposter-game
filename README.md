# Imposter Number Game 🎮

A simple multiplayer game where 2 players know a secret number (1-100) and 1 player is the imposter who doesn't know it!

## How to Play

1. **Start the server:**
   ```bash
   npm install
   npm start
   ```

2. **Open your browser:**
   - Go to `http://localhost:3000`
   - Or share the link with your friends (if deployed)

3. **Join a room:**
   - Enter a room ID (or leave empty to create a new one)
   - Share the link with 2 friends
   - Wait for 3 players to join

4. **Play:**
   - When 3 players join, the game starts automatically
   - 2 players will see the secret number
   - 1 player (the imposter) won't know the number
   - Try to figure out who the imposter is!

5. **Restart:**
   - Click "Restart Game" to play again with the same players

## Deploy Online

### Important: Two-Part Deployment Required

This game uses **WebSockets (Socket.IO)**, which requires a persistent server connection. **Vercel's serverless functions do not support WebSockets**, so you need to deploy in two parts:

#### 1. Frontend (Static Files) - Vercel ✅
- Deploy the `public` folder to Vercel
- The `vercel.json` configuration is already set up
- Update `public/config.js` or `public/client.js` with your server URL (see step 2)

#### 2. Backend (Server) - Requires WebSocket Support ⚠️
Deploy `server.js` to a platform that supports WebSockets:
- **Railway** (recommended, free tier available)
- **Render** (free tier available)
- **Fly.io** (free tier available)
- **Heroku** (paid plans only)

After deploying the server, update the `serverUrl` in `public/client.js` to point to your server URL.

### Quick Setup for Vercel + Railway

1. **Deploy Server to Railway:**
   ```bash
   # Push your code to GitHub
   # Connect Railway to your repo
   # Railway will auto-detect and deploy
   ```

2. **Update Client Configuration:**
   - Edit `public/client.js`
   - Replace `YOUR_SERVER_URL_HERE` with your Railway server URL (e.g., `https://your-app.railway.app`)

3. **Deploy Frontend to Vercel:**
   ```bash
   vercel
   ```

That's it! Your frontend on Vercel will connect to your server on Railway.

## Requirements

- Node.js (v14 or higher)
- npm

Enjoy the game! 🎉

