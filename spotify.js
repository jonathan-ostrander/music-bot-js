import axios from 'axios';

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

function parseTrack(response) {
  return {
    id: response.track.id,
    albumCoverUrl: response.track.album.images[0].url,
    artists: response.track.artists.map(artist => {
      return {name: artist.name, href: artist.href};
    }),
    url: response.track.href,
    preview: response.track.preview_url,
    title: response.track.name,
  }
}

async function getTracks(next, accessToken, retries) {
  if (retries <= 0) return {tracks: [], next: null};
  else {
    try {
      const resp = await axios.get(next, { headers: { Authorization: `Bearer ${accessToken}` } });
      return {
        tracks: resp.data.items.map(parseTrack).filter(s => !!s.preview),
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

async function getPlaylist(url) {
  const playlistId = parsePlaylistId(url);
  const accessToken = await getAccessToken();

  let next = `https://api.spotify.com/v1/playlists/${playlistId}/tracks`;
  const tracks = [];
  while (next) {
    const cur = await getTracks(next, accessToken, 5);
    tracks.push(...cur.tracks);
    next = cur.next
  }
  return tracks;
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

export { getPlaylist, getPlaylistMetadata };