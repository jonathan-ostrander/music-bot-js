# `musicbot.js`

<a href="https://discord.com/api/oauth2/authorize?client_id=740074306045870100&permissions=36703296&scope=bot">
  <img src="https://img.shields.io/static/v1?logo=discord&logoColor=white&label=&message=Add%20to%20your%20server&color=5865F2" />
</a>

A Discord bot that runs music quizzes based on Spotify playlists.

# Commands

## `/musicquiz`

### Options

#### `playlist: string | null`

The link to a Spotify playlist (e.g. https://open.spotify.com/playlist/6XOLmQWwf0Id5xYnKcHz3O) or the playlist ID (e.g. `6XOLmQWwf0Id5xYnKcHz3O`).

Defaults to: `6XOLmQWwf0Id5xYnKcHz3O`

#### `length: number | null`

The number of songs you want to include in the quiz. The bot will randomly select this number of songs from `playlist`.

Defaults to: `15`

# Running locally

## Requirements

### Discord

<a href="https://discord.com/developers/applications">
  <img src="https://img.shields.io/static/v1?logo=discord&logoColor=white&label=&message=Developer%20Portal&&color=5865F2" />
</a>

In order to run the bot yourself, you need to create an application in Discord's developer portal.
From the OAuth2 screen, copy the client ID and client secret.
You'll need set these 2 tokens as environment variables when running the app through `node` directly or through Docker.

### Spotify

<a href="https://developer.spotify.com/dashboard/login">
  <img src="https://img.shields.io/static/v1?logo=spotify&logoColor=white&label=&message=Developer%20Portal&&color=1DB954" />
</a>

The bot also needs credentials for Spotify's Web API in order to fetch the tracks from public playlists.
Once you've logged into the developer portal, create a new app and copy the client ID and client secret.
Like the discord tokens, you'll need to set these 2 as environment variables when running the app.

## Docker

<a href="https://hub.docker.com/r/ostrander/music-bot-js/tags">
  <img src="https://img.shields.io/static/v1?logo=docker&logoColor=white&label=&message=ostrander/music-bot-js&color=0db7ed" />
</a>

You can run the latest build locally through Docker.
If this is the first time you're running the bot after creating your Discord application, you'll need to run the `deploy-commands.js` script to add the global commands:

```bash
docker run \
  -e DISCORD_CLIENT_ID=<your docker app client id> \
  -e DISCORD_TOKEN=<your docker app token> \
  ostrander/music-bot-js:latest \
  node deploy-commands.js
```

The container should log the following and exit

```
Started refreshing application (/) commands.
Successfully reloaded application (/) commands.
```

To run the actual bot:

```bash
docker run \
  -e DISCORD_CLIENT_ID=<your docker app client id> \
  -e DISCORD_TOKEN=<your docker app token> \
  -e SPOTIFY_CLIENT_ID=<your spotify app client id> \
  -e SPOTIFY_CLIENT_SECRET=<your spotify app client secret> \
  ostrander/music-bot-js:latest
```

## `node.js`

To run the app using `node.js`, you need to install the required dependencies using your prefered `node.js` package manager (e.g. `npm install`, `yarn install`, etc.).

Once the dependencies are installed, set the Discord and Spotify environment variables:

```bash
export DISCORD_CLIENT_ID=<your docker app client id>
export DISCORD_TOKEN=<your docker app token>
export SPOTIFY_CLIENT_ID=<your spotify app client id>
export SPOTIFY_CLIENT_SECRET=<your spotify app client secret>
```

If this is the first time you're running the bot after creating your Discord application, you'll need to run the `deploy-commands.js` script to add the global commands:

```bash
node deploy-commands.js
```

This script should log the following and exit

```
Started refreshing application (/) commands.
Successfully reloaded application (/) commands.
```

To run the actual bot:

```bash
node index.js
```
