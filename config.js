const discord = {
  clientId: process.env.DISCORD_CLIENT_ID,
  token: process.env.DISCORD_TOKEN,
};
const spotify = {
  id: process.env.SPOTIFY_CLIENT_ID,
  secret: process.env.SPOTIFY_CLIENT_SECRET,
};

const gameLength = parseInt(process.env.GAME_LENGTH || '15');


export { discord, gameLength, spotify };
