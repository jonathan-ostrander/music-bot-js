import { AudioPlayerStatus, createAudioResource } from '@discordjs/voice';
import { MessageEmbed } from 'discord.js';

import similarity from './jaccard.js';

import { EventEmitter } from 'node:events';

export default class Song extends EventEmitter {
  constructor(number, song, textChannel) {
    super();
    this.number = number;
    this.song = song;
    this.textChannel = textChannel;
    this.resource = createAudioResource(song.preview);
    this.titleGuessed = null;
    this.artistGuessed = null;

    const title = song.title.toLowerCase();
    this.titleOptions = [
      title,
    ]
      .concat(title.split('/'))
      .concat(title.split('(').filter(t => !t.includes("feat") && !t.includes("with")))
      .concat(title.split('-'))
      .concat(title.split(')').filter(t => !t.includes("feat") || !t.includes("with")))
      .concat(title.split('[').filter(t => !t.includes("feat") || !t.includes("with")))
      .concat(title.split(']').filter(t => !t.includes("feat") || !t.includes("with")))
      .flatMap(t => [t, Array.from(t).filter(c => !!c.charAt(0).match(/[a-z0-9]/)).join('')])
      .filter(t => t.length > 1);

    
    this.artistOptions = song.artists
      .map(a => a.name.toLowerCase())
      .flatMap(a => a.split('&'))
      .flatMap(a => a.split('and'))
      .flatMap(a => [a, Array.from(a).filter(c => !!c.charAt(0).match(/[a-z0-9]/)).join('')])
      .map(a => a.trim());
  }

  play(player) {
    player.play(this.resource);
    const collector = this.textChannel.createMessageCollector();
    collector.on('collect', m => {
      if (m.author.bot) return;

      this.emit('guess', m.author.id);

      const titleCorrect = !this.titleGuessed && this.titleOptions.some(t => similarity(t, m.content) > 0.8);
      const artistCorrect = !this.artistGuessed && this.artistOptions.some(a => similarity(a, m.content) > 0.8);

      if (titleCorrect) {
        this.titleGuessed = m.author.id;
        m.react('✅');
        m.reply({
          content: `<@${m.author.id}> got the title!`,
        });
      }
      if (artistCorrect) {
        this.artistGuessed = m.author.id;
        m.react('✅');
        m.reply({
          content: `<@${m.author.id}> got the artist!`,
        });
      }
      if (!(titleCorrect || artistCorrect)) m.react('❌');

      if (this.titleGuessed && this.artistGuessed) {
        this.emit("done");
        collector.stop();
      }
    });

    player.once(AudioPlayerStatus.Idle, () => {
      if (this.resource.ended && !this.finished) {
        this.finished = true;
        this.emit("done");
        collector.stop();
      }
    });
  }

  embed(gameLength, score) {
    return new MessageEmbed()
      .setTitle(`**That was: ${this.song.title} by ${this.song.artists.map(a => a.name).join(" & ")}**`)
      .setThumbnail(this.song.albumCoverUrl)
      .setDescription(`__**LEADERBOARD**__\n\n${score}`)
      .setFooter({
        text: `Music Quiz - track ${this.number}/${gameLength}`
      });
  }
}
