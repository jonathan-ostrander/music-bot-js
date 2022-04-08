import axios, { AxiosRequestConfig } from 'axios';
import { parse as htmlParse } from 'node-html-parser'

import { EventEmitter } from 'node:events';

import { spotify as tokens } from './config.js';

const authOptions: AxiosRequestConfig<string> = {
  auth: {
    username: tokens.id,
    password: tokens.secret,
  },
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  responseType: "json",
};

type AccessTokenResponse = {access_token: string};

type SpotifyTrack = {
  id: string,
  name: string,
  href: string,
  preview_url: string | null,
  album: {
    images: {url: string}[],
  },
  artists: {name: string, href: string}[],
}

type SpotifyPlaylistTrackPage = {
  next: string | null,
  items: { track: SpotifyTrack }[]
};

async function parseTrack(response: {track: SpotifyTrack}): Promise<Track | {preview: null}> {
  try {
    let previewUrl = response.track.preview_url;
    
    // If the preview URL isn't included in the API response then fetch the HTML for the embed
    // which includes a link to the preview track embeded Spotify players use.
    if (!!response.track.id && !previewUrl) {
      const embedResp = await axios.get<string>(`https://open.spotify.com/embed/track/${response.track.id}`);
      const dom = htmlParse(embedResp.data);
      const script = dom.querySelector(`script#resource[type="application/json"]`);
      if (script) {
        const trackJson = decodeURIComponent(script.innerText);
        previewUrl = JSON.parse(trackJson).preview_url;
      }
    }

    const albumCoverUrl = response.track.album.images[0] ? response.track.album.images[0].url : "";

    return {
      id: response.track.id,
      albumCoverUrl: albumCoverUrl,
      artists: response.track.artists.map(artist => {
        return {name: artist.name, href: artist.href};
      }),
      url: response.track.href,
      preview: previewUrl,
      title: response.track.name,
    };
  } catch (e) {
    console.warn(e);
    return {preview: null};
  }
}

async function getTracks(
  next: string,
  accessToken: string,
  retries: number,
): Promise<{tracks: Track[], next: string | null}> {
  if (retries <= 0) return {tracks: [], next: null};
  else {
    try {
      const resp = await axios.get<SpotifyPlaylistTrackPage>(next, { headers: { Authorization: `Bearer ${accessToken}` } });
      const tracks = await Promise.all(resp.data.items.map(parseTrack));
      return {
        tracks: tracks.filter(s => !!s.preview).map(s => s as Track),
        next: resp.data.next,
      };
    } catch {
      console.log(`Retrying ${next}. ${retries} left.`)
      return await getTracks(next, accessToken, retries - 1);
    }
  }
}

type Artist = {name: string, href: string};

type Track = {
  id: string,
  albumCoverUrl: string | null,
  artists: Artist[];
  url: string,
  preview: string,
  title: string,
};

class PlaylistFetcher extends EventEmitter {
  /**
   * Parses playlist ID out of spotify share URL
   * @param maybeUrl spotify share URL or raw playlist ID
   * @returns spotify playlist ID
   */
  private static parsePlaylistId(maybeUrl: string): string {
    if (maybeUrl.startsWith("https://")) {
      return maybeUrl.split("?")[0].split("/").reduce((_, t) => t);
    } else {
      return maybeUrl;
    }
  }

  private static async getAccessToken(): Promise<string> {
    const resp = await axios.post<AccessTokenResponse>(
      'https://accounts.spotify.com/api/token',
      'grant_type=client_credentials',
      authOptions,
    )
    if (resp.status === 200) {
      return resp.data.access_token;
    } else {
      return Promise.reject(`Fetching access token failed: ${resp.data}`)
    }
  }

  async getPlaylist(maybeUrl: string): Promise<Track[]> {
    const playlistId = PlaylistFetcher.parsePlaylistId(maybeUrl);
    const accessToken = await PlaylistFetcher.getAccessToken();

    let next: string | null = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
    const tracks: Track[] = [];
    let sendUpdate = false;
    while (next) {
      const cur = await getTracks(next, accessToken, 5);
      tracks.push(...cur.tracks);

      // Limit updates to tracks fetched because event emitter/discord message API fall behind
      if (sendUpdate) {
        this.emit("update", tracks.length);
        sendUpdate = false;
      } else {
        sendUpdate = true;
      }

      next = cur.next
    }

    this.emit("complete", tracks.length);

    return tracks;
  }

  async getPlaylistMetadata(url: string): Promise<PlaylistMetadata> {
    const playlistId = PlaylistFetcher.parsePlaylistId(url);
    const accessToken = await PlaylistFetcher.getAccessToken();

    const resp = await axios.get(
      `https://api.spotify.com/v1/playlists/${playlistId}`,
      { headers: { Authorization: `Bearer ${accessToken}` } },
    );

    return {
      name: resp.data.name,
      image: resp.data.images.map(i => i.url)[0],
      totalSongs: resp.data.tracks.total,
      followers: resp.data.followers.total,
    };
  }
}

type PlaylistMetadata = {
  name: string,
  image: string,
  totalSongs: number,
  followers: number,
};

export {
  PlaylistFetcher,
  Track,
};
