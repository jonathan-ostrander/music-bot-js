const clientId = process.env.DISCORD_CLIENT_ID;
const token = process.env.DISCORD_TOKEN;
const gameLength = parseInt(process.env.GAME_LENGTH || '15');

export { clientId, token, gameLength };
