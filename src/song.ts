import { AudioPlayer, AudioPlayerStatus, AudioResource, createAudioResource } from '@discordjs/voice';
import { MessageEmbed, TextChannel } from 'discord.js';

import similarity from './jaccard.js';
import { Track } from './spotify.js';

import { EventEmitter } from 'node:events';

export default class Song extends EventEmitter {
  number: number;
  track: Track;
  textChannel: TextChannel;
  resource: AudioResource;

  titleGuessed: string | null;
  artistGuessed: string | null;

  titleOptions: Array<string>;
  artistOptions: Array<string>;

  finished: boolean = false;

  constructor(
    number: number,
    track: Track,
    textChannel: TextChannel,
  ) {
    super();
    this.number = number;
    this.track = track;
    this.textChannel = textChannel;
    this.resource = createAudioResource(track.preview);
    this.titleGuessed = null;
    this.artistGuessed = null;

    const title = track.title.toLowerCase();
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

    
    this.artistOptions = track.artists
      .map(a => a.name.toLowerCase())
      .flatMap(a => a.split('&'))
      .flatMap(a => a.split('and'))
      .flatMap(a => [a, Array.from(a).filter(c => !!c.charAt(0).match(/[a-z0-9]/)).join('')])
      .map(a => a.trim());
  }

  play(player: AudioPlayer) {
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

  embed(gameLength: number, score: string) {
    return new MessageEmbed()
      .setTitle(`**That was: ${this.track.title} by ${this.track.artists.map(a => a.name).join(" & ")}**`)
      .setThumbnail(this.track.albumCoverUrl || "")
      .setDescription(`__**LEADERBOARD**__\n\n${score}`)
      .setFooter({
        text: `Music Quiz - track ${this.number}/${gameLength}`
      });
  }
}
