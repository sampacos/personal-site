import { SPOTIFY_CLIENT_ID, SPOTIFY_CLIENT_SECRET, SPOTIFY_REFRESH_TOKEN } from 'astro:env/server';

const TOKEN_ENDPOINT = 'https://accounts.spotify.com/api/token';
const NOW_PLAYING_ENDPOINT = 'https://api.spotify.com/v1/me/player/currently-playing';
const RECENTLY_PLAYED_ENDPOINT = 'https://api.spotify.com/v1/me/player/recently-played?limit=1';

export function getSpotifyCredentials() {
  const clientId =
    SPOTIFY_CLIENT_ID || process.env.SPOTIFY_CLIENT_ID || import.meta.env.SPOTIFY_CLIENT_ID || '';
  const clientSecret =
    SPOTIFY_CLIENT_SECRET ||
    process.env.SPOTIFY_CLIENT_SECRET ||
    import.meta.env.SPOTIFY_CLIENT_SECRET ||
    '';
  const refreshToken =
    SPOTIFY_REFRESH_TOKEN ||
    process.env.SPOTIFY_REFRESH_TOKEN ||
    import.meta.env.SPOTIFY_REFRESH_TOKEN ||
    '';
  return { clientId, clientSecret, refreshToken };
}

export async function getAccessToken(): Promise<string | null> {
  const { clientId, clientSecret, refreshToken } = getSpotifyCredentials();
  if (!clientId || !clientSecret || !refreshToken) return null;

  try {
    const basic = Buffer.from(`${clientId}:${clientSecret}`).toString('base64');
    const response = await fetch(TOKEN_ENDPOINT, {
      method: 'POST',
      headers: {
        Authorization: `Basic ${basic}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }),
    });

    if (!response.ok) return null;
    const data = await response.json();
    return data.access_token || null;
  } catch {
    return null;
  }
}

export interface NowPlayingResponse {
  isPlaying: boolean;
  title?: string;
  artist?: string;
  album?: string;
  albumImageUrl?: string;
  songUrl?: string;
}

export async function getNowPlaying(): Promise<NowPlayingResponse> {
  const accessToken = await getAccessToken();

  if (!accessToken) {
    return { isPlaying: false };
  }

  try {
    const response = await fetch(NOW_PLAYING_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (response.status === 204 || response.status > 400) {
      return getRecentlyPlayed(accessToken);
    }

    const song = await response.json();

    if (!song?.item) {
      return getRecentlyPlayed(accessToken);
    }

    const isPlaying = song.is_playing ?? false;
    const title = song.item.name;
    const artist = song.item.artists?.map((_artist: { name: string }) => _artist.name).join(', ');
    const album = song.item.album?.name;
    const albumImageUrl = song.item.album?.images?.[0]?.url;
    const songUrl = song.item.external_urls?.spotify;

    return {
      isPlaying,
      title,
      artist,
      album,
      albumImageUrl,
      songUrl,
    };
  } catch {
    return { isPlaying: false };
  }
}

export async function getRecentlyPlayed(accessToken: string): Promise<NowPlayingResponse> {
  try {
    const response = await fetch(RECENTLY_PLAYED_ENDPOINT, {
      headers: {
        Authorization: `Bearer ${accessToken}`,
      },
    });

    if (!response.ok) return { isPlaying: false };

    const data = await response.json();
    const item = data.items?.[0]?.track;

    if (!item) return { isPlaying: false };

    return {
      isPlaying: false,
      title: item.name,
      artist: item.artists?.map((_artist: { name: string }) => _artist.name).join(', '),
      album: item.album?.name,
      albumImageUrl: item.album?.images?.[0]?.url,
      songUrl: item.external_urls?.spotify,
    };
  } catch {
    return { isPlaying: false };
  }
}
