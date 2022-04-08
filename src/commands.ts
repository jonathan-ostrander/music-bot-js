import { SlashCommandBuilder } from '@discordjs/builders';

const musicquiz =
  new SlashCommandBuilder()
    .setName('musicquiz')
    .setDescription('Starts a music quiz in this channel.')
    .addStringOption(option => option.setName('playlist').setDescription('URL or ID of playlist to create game for.').setRequired(false))
    .addIntegerOption(option => option.setName('length').setDescription('# of songs to play').setRequired(false));

const commands = [
  musicquiz,
].map(command => command.toJSON());

export default commands;
