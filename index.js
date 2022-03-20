import { Client, Intents, MessageEmbed } from 'discord.js';

import { discord } from './config.js';
import Game from './game.js';

const client = new Client({ intents: [
  Intents.FLAGS.GUILDS,
  Intents.FLAGS.GUILD_VOICE_STATES,
  Intents.FLAGS.GUILD_MESSAGES,
  Intents.FLAGS.GUILD_MESSAGE_REACTIONS,
] });

client.once('ready', () => {
  console.log('Ready!');
});

const games = {};

client.on('interactionCreate', async interaction => {
  if (!interaction.isCommand()) return;

  const { commandName } = interaction;

  if (commandName === 'musicquiz') {
    const voiceChannel = interaction.member.voice.channel;
    if (games[interaction.channelId]) {
      await interaction.reply({
        content: "There's already a game happening you idiot.",
        ephemeral: true,
      });
    } else if (voiceChannel) {
      const game = new Game(interaction.channel, voiceChannel);
      games[interaction.channelId] = game;
      game.once('end', () => {
        delete games[interaction.channelId];
      });

      const embed = new MessageEmbed()
        .setTitle(`🎶 **Music quiz starting now!** 🎶`)
        .setDescription(
          `Voice channel: <#${voiceChannel.id}>\n\n` +
          `This game will have ${game.length} song previews, 30 seconds per song.\n\n` +
          `You'll have to guess the artist name and the song name.\n\n` +
          `+ 1 point for the song name\n` +
          `+ 1 point for the artist name\n` +
          `+ 3 points for both\n\n` + 
          `🔥 Sit back and relax, the music quiz is starting in ** 10 seconds!**`
        );
      await interaction.reply({
        embeds: [embed]
      });
    } else {
      await interaction.reply({
        content: "You must be in a voice channel to start a music quiz",
        ephemeral: true,
      });
    }
  }
});

client.login(discord.token);
