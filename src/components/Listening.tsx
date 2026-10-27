import { useEffect, useState } from 'react';

export interface SpotifyTrack {
  isPlaying: boolean;
  configured?: boolean;
  title?: string;
  artist?: string;
  album?: string;
  songUrl?: string;
}

export default function Listening() {
  const [track, setTrack] = useState<SpotifyTrack | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;

    async function fetchNowPlaying() {
      try {
        const res = await fetch('/api/spotify/now-playing');
        if (res.ok) {
          const data: SpotifyTrack = await res.json();
          if (isMounted) {
            setTrack(data);
            setLoading(false);
          }
        } else {
          if (isMounted) {
            setTrack({ isPlaying: false, configured: false });
            setLoading(false);
          }
        }
      } catch {
        if (isMounted) {
          setTrack({ isPlaying: false, configured: false });
          setLoading(false);
        }
      }
    }

    fetchNowPlaying();
    const interval = setInterval(fetchNowPlaying, 15000);

    return () => {
      isMounted = false;
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-2">
      <h2 className="m-0 border-b border-gray-200 pb-1 text-xs font-bold tracking-wide text-black uppercase dark:border-[#2a2a2a] dark:text-white">
        Currently Listening to on Spotify
      </h2>
      <div className="pt-1 text-xs">
        {loading ? (
          <p className="text-gray-500 dark:text-gray-400">Checking Spotify status...</p>
        ) : track?.title ? (
          <p className="text-black dark:text-gray-200">
            <span
              className={`mr-1.5 font-bold ${
                track.isPlaying
                  ? 'text-green-600 dark:text-green-400'
                  : 'text-gray-400 dark:text-gray-500'
              }`}
            >
              {track.isPlaying ? '▶' : '⏸ (last played)'}
            </span>
            {track.songUrl ? (
              <a
                href={track.songUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="craigslist-link font-medium"
              >
                {track.title}
              </a>
            ) : (
              <span className="font-medium">{track.title}</span>
            )}
            {track.artist && (
              <span className="text-gray-600 dark:text-gray-400"> &mdash; {track.artist}</span>
            )}
            {track.album && (
              <span className="text-gray-400 dark:text-gray-500"> ({track.album})</span>
            )}
          </p>
        ) : (
          <p className="text-gray-500 dark:text-gray-400">Spotify: not playing right now</p>
        )}
      </div>
    </div>
  );
}
