import {
  AudioPlayerStatus,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  StreamType,
} from '@discordjs/voice';
import pg from 'pg';

import { EventEmitter } from 'node:events';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { gameLength } from './config.js';
import Song from './song.js';
import { MessageEmbed } from 'discord.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default class Game extends EventEmitter {
  constructor(textChannel, voiceChannel) {
    super();
    this.length = gameLength;
    this.score = {};

    const countdown = createAudioResource(join(__dirname, 'countdown.mp3'), {
      inputType: StreamType.Raw,
    });

    this.textChannel = textChannel;
    this.voiceChannel = voiceChannel;

    const countdownPlayer = createAudioPlayer();
    this.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: voiceChannel.guild.id,
      adapterCreator: voiceChannel.guild.voiceAdapterCreator,
    });

    this.player = createAudioPlayer();

    this.connection.subscribe(countdownPlayer);
    countdownPlayer.play(countdown);

    countdownPlayer.on(AudioPlayerStatus.Idle, () => {
      this.init();
    });
  }

  async init() {
    this.connection.subscribe(this.player);

    const pgClient = new pg.Pool();
    const random = await pgClient.query(`SELECT * FROM quiz_songs ORDER BY RANDOM() LIMIT ${this.length}`);

    this.songs = random.rows.map((row, i) => new Song(i + 1, JSON.parse(row.song), this.textChannel));
    this.currentSong = 0;
    this.playNext();
  }

  playNext() {    
    const song = this.songs[this.currentSong];
    song.play(this.player);
    song.on('guess', (id) => {
      this.score[id] = this.score[id] || 0;
    });
    song.once('done', () => {
      if (!!song.artistGuessed && song.artistGuessed == song.titleGuessed) {
        this.score[song.artistGuessed] += 3;
      } else {
        if (!!song.artistGuessed) {
          this.score[song.artistGuessed] += 1;
        }
        if (!!song.titleGuessed) {
          this.score[song.titleGuessed] += 1;
        }
      }
      this.currentSong += 1;

      if (this.currentSong >= this.length) {
        this.textChannel.send({
          embeds: [new MessageEmbed().setTitle("**Music Quiz Ranking**").setDescription(this.formattedScore())],
        });
        this.connection.disconnect();
        this.emit('end');
      } else {
        this.textChannel.send({
          embeds: [song.embed(this.length, this.formattedScore())],
        });
        this.playNext();
      }
    });
  }

  formattedScore() {
    const medals = {
      0: "🥇",
      1: "🥈",
      2: "🥉",
    };
    return Object.entries(this.score).sort((a, b) => b[1] - a[1]).map((entry, i) => {
      const id = entry[0];
      const score = entry[1];
      const place = medals[i] || `${i + 1}`;
      const spacing = medals[i] ? "\n" : "";
      return `${place} - <@${id}> - ${score} pts${spacing}`;
    }).join("\n");
  }
}
