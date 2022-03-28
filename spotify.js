import axios from 'axios';
import htmlParser from 'node-html-parser'

import { EventEmitter } from 'node:events';

import { spotify as tokens } from './config.js';

const authOptions = {
  auth: {
    username: tokens.id,
    password: tokens.secret,
  },
  headers: {
    'Content-Type': 'application/x-www-form-urlencoded',
  },
  responseType: "json",
};

async function getAccessToken() {
  const resp = await axios.post(
    'https://accounts.spotify.com/api/token',
    'grant_type=client_credentials',
    authOptions,
  )
  if (resp.status === 200) {
    return resp.data.access_token
  } else {
    console.error(resp);
  }
}

async function parseTrack(response) {
  try {
    let previewUrl = response.track.preview_url;
    
    // If the preview URL isn't included in the API response then fetch the HTML for the embed
    // which includes a link to the preview track embeded Spotify players use.
    if (!!response.track.id && !previewUrl) {
      const embedResp = await axios.get(`https://open.spotify.com/embed/track/${response.track.id}`);
      const dom = htmlParser.parse(embedResp.data);
      const trackJson = decodeURIComponent(dom.querySelector(`script#resource[type="application/json"]`).innerText);
      previewUrl = JSON.parse(trackJson).preview_url;
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
    return {};
  }
}

async function getTracks(next, accessToken, retries) {
  if (retries <= 0) {
    return {tracks: [], next: null};
  } else {
    try {
      const resp = await axios.get(next, { headers: { Authorization: `Bearer ${accessToken}` } });
      const tracks = await Promise.all(resp.data.items.map(parseTrack));
      return {
        tracks: tracks.filter(s => !!s.preview),
        next: resp.data.next,
      };
    } catch {
      console.log(`Retrying ${next}. ${retries} left.`)
      return await getTracks(next, accessToken, retries - 1);
    }
  }
}

function parsePlaylistId(maybeUrl) {
  if (maybeUrl.startsWith("https://")) {
    return maybeUrl.split("?")[0].split("/").reduce((_, t) => t);
  } else {
    return maybeUrl;
  }
}

class PlaylistFetcher extends EventEmitter {
  async getPlaylist(url) {
    const playlistId = parsePlaylistId(url);
    const accessToken = await getAccessToken();

    let next = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
    const tracks = [];
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
}

async function getPlaylistMetadata(url) {
  const playlistId = parsePlaylistId(url);
  const accessToken = await getAccessToken();

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

export { PlaylistFetcher, getPlaylistMetadata };
