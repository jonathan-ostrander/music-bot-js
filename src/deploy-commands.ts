import { REST } from '@discordjs/rest';
import { Routes } from 'discord-api-types/v9';

import { discord } from './config.js';
import commands from './commands.js';

const rest = new REST({ version: '9' }).setToken(discord.token);

(async () => {
  try {
    console.log('Started refreshing application (/) commands.');

    await rest.put(
      Routes.applicationCommands(discord.clientId),
      { body: commands },
    );

    console.log('Successfully reloaded application (/) commands.');
  } catch (error) {
    console.error(error);
  }
})();
