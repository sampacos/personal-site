import { useEffect, useState } from 'react';
import type { SoundCloudTrack } from '../lib/soundcloud';

export default function SoundCloudLikes() {
  const [tracks, setTracks] = useState<SoundCloudTrack[]>([]);
  const [activeTrack, setActiveTrack] = useState<SoundCloudTrack | null>(null);
  const [loading, setLoading] = useState<boolean>(true);

  useEffect(() => {
    let isMounted = true;
    async function loadLikes() {
      try {
        const res = await fetch('/api/soundcloud/likes');
        if (res.ok) {
          const data: SoundCloudTrack[] = await res.json();
          if (isMounted && data.length > 0) {
            setTracks(data);
            setActiveTrack(data[0]);
            setLoading(false);
          }
        }
      } catch {
        // Fallback
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadLikes();
    return () => {
      isMounted = false;
    };
  }, []);

  const embedUrl = activeTrack
    ? `https://w.soundcloud.com/player/?url=${encodeURIComponent(
        activeTrack.url,
      )}&color=%230000ee&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false`
    : 'https://w.soundcloud.com/player/?url=https%3A//soundcloud.com/sam2445&color=%230000ee&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=false';

  return (
    <div className="space-y-3">
      {/* HTML5 Player */}
      <div className="overflow-hidden rounded-xs border border-gray-200 bg-white dark:border-[#333333] dark:bg-[#202020]">
        <iframe
          width="100%"
          height="120"
          allow="autoplay; encrypted-media; clipboard-write; picture-in-picture"
          src={embedUrl}
          className="block w-full"
          title={`SoundCloud Player${activeTrack ? ` - ${activeTrack.title}` : ''}`}
        />
      </div>

      {/* Recent Likes List */}
      <div>
        <div className="mb-1.5 border-b border-gray-200 pb-1 text-[11px] font-bold tracking-wider text-black uppercase dark:border-[#2a2a2a] dark:text-gray-300">
          Recent Likes
        </div>

        {loading ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">Loading liked tracks...</p>
        ) : tracks.length > 0 ? (
          <ul className="m-0 list-none space-y-1 p-0 text-xs">
            {tracks.map((track) => (
              <li key={track.url} className="flex items-baseline justify-between gap-2">
                <div className="truncate">
                  <button
                    type="button"
                    onClick={() => setActiveTrack(track)}
                    className="craigslist-link cursor-pointer text-left font-medium hover:underline"
                    title={`Play ${track.title}`}
                  >
                    {track.title}
                  </button>
                  <span className="ml-1.5 text-[11px] text-gray-500 dark:text-gray-400">
                    by {track.artist}
                  </span>
                </div>
                <a
                  href={track.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 text-[11px] text-gray-400 hover:underline dark:text-gray-500"
                >
                  ↗
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-gray-500 dark:text-gray-400">
            Visit profile to view likes:{' '}
            <a
              href="https://soundcloud.com/sam2445/likes"
              target="_blank"
              rel="noopener noreferrer"
              className="craigslist-link"
            >
              soundcloud.com/sam2445/likes
            </a>
          </p>
        )}
      </div>
    </div>
  );
}
