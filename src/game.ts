import { MessageEmbed, TextChannel, VoiceChannel } from 'discord.js';
import {
  AudioPlayer,
  AudioPlayerStatus,
  AudioResource,
  createAudioPlayer,
  createAudioResource,
  joinVoiceChannel,
  StreamType,
  VoiceConnection,
} from '@discordjs/voice';

import { EventEmitter } from 'node:events';
import { dirname, join } from 'path';
import { fileURLToPath } from 'url';

import { gameLength, defaultPlaylist } from './config.js';
import Song from './song.js';
import { PlaylistFetcher } from './spotify.js';

// @ts-ignore
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

export default class Game extends EventEmitter {
  textChannel: TextChannel;
  voiceChannel: VoiceChannel;

  playlist: string;
  length: number;

  songs: Song[] = [];
  currentSong: number = 0;
  score: { [key: string]: number; } = {};

  countdown: AudioResource<null>;
  connection: VoiceConnection;
  player: AudioPlayer;

  constructor(
    textChannel: TextChannel,
    voiceChannel: VoiceChannel,
    playlist: string | null,
    length: number | null,
  ) {
    super();
    this.length = length || gameLength;
    this.playlist = playlist || defaultPlaylist;

    this.countdown = createAudioResource(join(__dirname, '../countdown.mp3'), {
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
    countdownPlayer.play(this.countdown);
    this.initSongs();

    countdownPlayer.once(AudioPlayerStatus.Idle, () => {
      this.init();
    });
  }

  async initSongs() {
    const fetcher = new PlaylistFetcher();

    const playlistMetadata = await fetcher.getPlaylistMetadata(this.playlist);

    const playlistMetadataEmbed = new MessageEmbed()
      .setTitle(`Fetching playlist ${playlistMetadata.name}`)
      .setDescription(`Total songs: ${playlistMetadata.totalSongs}\n\nLikes: ${playlistMetadata.followers}`)
      .setFooter({ text: `Fetched 0/${playlistMetadata.totalSongs} songs`})
      .setThumbnail(playlistMetadata.image);

    this.textChannel.send({
      embeds: [playlistMetadataEmbed],
    }).then(m => {
      fetcher.on("update", (u) => {
        const updated = playlistMetadataEmbed.setFooter({ text: `Fetched ${u}/${playlistMetadata.totalSongs} songs.` });
        m.edit({
          embeds: [updated],
        });
      });

      fetcher.on("complete", (u) => {
        const updated = playlistMetadataEmbed.setFooter({ text: `Fetching complete. Fetched ${u}/${playlistMetadata.totalSongs} songs.` });
        m.edit({
          embeds: [updated],
        });
      });
    });

    const playlistTracks = await fetcher.getPlaylist(this.playlist);
    const tracks = playlistTracks.map(s => {return {track: s, rand: Math.random()}}).sort((a, b) => a.rand - b.rand).map(s => s.track).slice(0, this.length);

    this.songs = tracks.map((track, i) => new Song(i + 1, track, this.textChannel));
    return this.init();
  }

  init() {
    if (this.songs.length > 0 && this.countdown.ended) {
      this.connection.subscribe(this.player);
      this.currentSong = 0;
      this.playNext();
    }
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
          embeds: [song.embed(this.length, this.formattedScore())],
        })
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

  formattedScore(): string {
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
