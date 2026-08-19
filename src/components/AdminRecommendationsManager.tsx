import React, { useEffect, useState } from 'react';
import type { RecommendedItem } from '../lib/sheets';

export default function AdminRecommendationsManager() {
  const [items, setItems] = useState<RecommendedItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Form state
  const [category, setCategory] = useState<'songs' | 'albums' | 'podcasts'>('songs');
  const [title, setTitle] = useState('');
  const [artist, setArtist] = useState('');
  const [url, setUrl] = useState('');

  const fetchItems = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/recommendations');
      const data = await res.json();
      if (data.items) {
        setItems(data.items);
      }
    } catch (err) {
      console.error('Failed to load items:', err);
      setError('Failed to fetch existing recommendations.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchItems();
  }, []);

  const handleAdd = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) {
      setError('Please provide a title and URL.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccessMsg(null);

      const res = await fetch('/api/recommendations/add', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          category,
          title: title.trim(),
          artist: artist.trim(),
          url: url.trim(),
        }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save to Google Sheets.');
      }

      setSuccessMsg(`Added "${title}" to ${category}!`);
      setTitle('');
      setArtist('');
      setUrl('');
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error adding item.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, itemTitle: string) => {
    if (!confirm(`Delete "${itemTitle}"?`)) return;

    try {
      setDeletingId(id);
      setError(null);

      const res = await fetch('/api/recommendations/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to delete from Google Sheets.');
      }

      setSuccessMsg(`Deleted "${itemTitle}".`);
      await fetchItems();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting item.');
    } finally {
      setDeletingId(null);
    }
  };

  const songs = items.filter((i) => i.category === 'songs');
  const albums = items.filter((i) => i.category === 'albums');
  const podcasts = items.filter((i) => i.category === 'podcasts');

  return (
    <div className="space-y-6">
      {/* 1. Add Recommendation Form */}
      <form
        onSubmit={handleAdd}
        className="p-4 border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#1f1f1f] rounded-xs space-y-3"
      >
        <h3 className="text-xs font-bold uppercase tracking-wider text-black dark:text-white pb-1 border-b border-gray-200 dark:border-[#333333]">
          + Add New Recommendation
        </h3>

        {error && (
          <div className="p-2 text-xs bg-red-50 dark:bg-[#351515] border border-red-200 dark:border-[#5a2020] text-red-700 dark:text-red-300 rounded-xs">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="p-2 text-xs bg-green-50 dark:bg-[#1a3820] border border-green-200 dark:border-[#2a5030] text-green-800 dark:text-green-300 rounded-xs">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label
              htmlFor="rec-category"
              className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Category
            </label>
            <select
              id="rec-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as 'songs' | 'albums' | 'podcasts')}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-[#444444] bg-white dark:bg-[#252525] text-black dark:text-white rounded-xs"
            >
              <option value="songs">Songs</option>
              <option value="albums">Albums &amp; Mixes</option>
              <option value="podcasts">Podcasts</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="rec-title"
              className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Title / Track Name *
            </label>
            <input
              id="rec-title"
              type="text"
              required
              placeholder="e.g. jetski2013"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-[#444444] bg-white dark:bg-[#252525] text-black dark:text-white rounded-xs"
            />
          </div>

          <div>
            <label
              htmlFor="rec-artist"
              className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Artist / Creator
            </label>
            <input
              id="rec-artist"
              type="text"
              placeholder="e.g. sean potter"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-[#444444] bg-white dark:bg-[#252525] text-black dark:text-white rounded-xs"
            />
          </div>

          <div>
            <label
              htmlFor="rec-url"
              className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              Link URL (SoundCloud, Spotify, YouTube, etc.) *
            </label>
            <input
              id="rec-url"
              type="url"
              required
              placeholder="https://..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-2 py-1.5 border border-gray-300 dark:border-[#444444] bg-white dark:bg-[#252525] text-black dark:text-white rounded-xs"
            />
          </div>
        </div>

        <div className="pt-2 flex justify-end">
          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-1.5 text-xs font-semibold bg-black dark:bg-white text-white dark:text-black rounded-xs hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Saving to Google Sheets...' : 'Save Recommendation'}
          </button>
        </div>
      </form>

      {/* 2. Existing Recommendations List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#2a2a2a] pb-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-black dark:text-white">
            Current Recommendations ({items.length})
          </h3>
          <button
            type="button"
            onClick={fetchItems}
            className="text-[11px] craigslist-link cursor-pointer"
          >
            refresh
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">Loading from Google Sheets...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            {/* Songs */}
            <div className="border border-gray-200 dark:border-[#2a2a2a] p-3 rounded-xs bg-white dark:bg-[#181818]">
              <h4 className="font-bold text-[11px] uppercase tracking-wide mb-2 text-black dark:text-gray-300 pb-1 border-b border-gray-100 dark:border-[#252525]">
                Songs ({songs.length})
              </h4>
              <ul className="space-y-2 list-none p-0 m-0">
                {songs.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-1 group">
                    <div className="truncate">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="craigslist-link font-medium block truncate"
                      >
                        {item.title}
                      </a>
                      {item.artist && (
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 block truncate">
                          {item.artist}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.title)}
                      disabled={deletingId === item.id}
                      className="text-[10px] text-red-600 hover:underline shrink-0 ml-1 cursor-pointer"
                      title="Delete item"
                    >
                      {deletingId === item.id ? '...' : '×'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Albums & Mixes */}
            <div className="border border-gray-200 dark:border-[#2a2a2a] p-3 rounded-xs bg-white dark:bg-[#181818]">
              <h4 className="font-bold text-[11px] uppercase tracking-wide mb-2 text-black dark:text-gray-300 pb-1 border-b border-gray-100 dark:border-[#252525]">
                Albums &amp; Mixes ({albums.length})
              </h4>
              <ul className="space-y-2 list-none p-0 m-0">
                {albums.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-1 group">
                    <div className="truncate">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="craigslist-link font-medium block truncate"
                      >
                        {item.title}
                      </a>
                      {item.artist && (
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 block truncate">
                          {item.artist}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.title)}
                      disabled={deletingId === item.id}
                      className="text-[10px] text-red-600 hover:underline shrink-0 ml-1 cursor-pointer"
                      title="Delete item"
                    >
                      {deletingId === item.id ? '...' : '×'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Podcasts */}
            <div className="border border-gray-200 dark:border-[#2a2a2a] p-3 rounded-xs bg-white dark:bg-[#181818]">
              <h4 className="font-bold text-[11px] uppercase tracking-wide mb-2 text-black dark:text-gray-300 pb-1 border-b border-gray-100 dark:border-[#252525]">
                Podcasts ({podcasts.length})
              </h4>
              <ul className="space-y-2 list-none p-0 m-0">
                {podcasts.map((item) => (
                  <li key={item.id} className="flex items-start justify-between gap-1 group">
                    <div className="truncate">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="craigslist-link font-medium block truncate"
                      >
                        {item.title}
                      </a>
                      {item.artist && (
                        <span className="text-[10px] text-gray-500 dark:text-gray-400 block truncate">
                          {item.artist}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.title)}
                      disabled={deletingId === item.id}
                      className="text-[10px] text-red-600 hover:underline shrink-0 ml-1 cursor-pointer"
                      title="Delete item"
                    >
                      {deletingId === item.id ? '...' : '×'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
