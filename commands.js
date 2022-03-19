import { SlashCommandBuilder } from '@discordjs/builders';

const musicquiz =
  new SlashCommandBuilder()
    .setName('musicquiz')
    .setDescription('Starts a music quiz in this channel.');

const commands = [
  musicquiz,
].map(command => command.toJSON());

export default commands;
