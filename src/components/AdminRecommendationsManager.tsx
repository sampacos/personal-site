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
        className="space-y-3 rounded-xs border border-gray-200 bg-white p-4 dark:border-[#333333] dark:bg-[#1f1f1f]"
      >
        <h3 className="border-b border-gray-200 pb-1 text-xs font-bold tracking-wider text-black uppercase dark:border-[#333333] dark:text-white">
          + Add New Recommendation
        </h3>

        {error && (
          <div className="rounded-xs border border-red-200 bg-red-50 p-2 text-xs text-red-700 dark:border-[#5a2020] dark:bg-[#351515] dark:text-red-300">
            {error}
          </div>
        )}

        {successMsg && (
          <div className="rounded-xs border border-green-200 bg-green-50 p-2 text-xs text-green-800 dark:border-[#2a5030] dark:bg-[#1a3820] dark:text-green-300">
            {successMsg}
          </div>
        )}

        <div className="grid grid-cols-1 gap-3 text-xs sm:grid-cols-2">
          <div>
            <label
              htmlFor="rec-category"
              className="mb-1 block text-[11px] font-medium text-gray-700 dark:text-gray-300"
            >
              Category
            </label>
            <select
              id="rec-category"
              value={category}
              onChange={(e) => setCategory(e.target.value as 'songs' | 'albums' | 'podcasts')}
              className="w-full rounded-xs border border-gray-300 bg-white px-2 py-1.5 text-black dark:border-[#444444] dark:bg-[#252525] dark:text-white"
            >
              <option value="songs">Songs</option>
              <option value="albums">Albums &amp; Mixes</option>
              <option value="podcasts">Podcasts</option>
            </select>
          </div>

          <div>
            <label
              htmlFor="rec-title"
              className="mb-1 block text-[11px] font-medium text-gray-700 dark:text-gray-300"
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
              className="w-full rounded-xs border border-gray-300 bg-white px-2 py-1.5 text-black dark:border-[#444444] dark:bg-[#252525] dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="rec-artist"
              className="mb-1 block text-[11px] font-medium text-gray-700 dark:text-gray-300"
            >
              Artist / Creator
            </label>
            <input
              id="rec-artist"
              type="text"
              placeholder="e.g. sean potter"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              className="w-full rounded-xs border border-gray-300 bg-white px-2 py-1.5 text-black dark:border-[#444444] dark:bg-[#252525] dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="rec-url"
              className="mb-1 block text-[11px] font-medium text-gray-700 dark:text-gray-300"
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
              className="w-full rounded-xs border border-gray-300 bg-white px-2 py-1.5 text-black dark:border-[#444444] dark:bg-[#252525] dark:text-white"
            />
          </div>
        </div>

        <div className="flex justify-end pt-2">
          <button
            type="submit"
            disabled={submitting}
            className="cursor-pointer rounded-xs bg-black px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            {submitting ? 'Saving to Google Sheets...' : 'Save Recommendation'}
          </button>
        </div>
      </form>

      {/* 2. Existing Recommendations List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between border-b border-gray-200 pb-1 dark:border-[#2a2a2a]">
          <h3 className="text-xs font-bold tracking-wider text-black uppercase dark:text-white">
            Current Recommendations ({items.length})
          </h3>
          <button
            type="button"
            onClick={fetchItems}
            className="craigslist-link cursor-pointer text-[11px]"
          >
            refresh
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">Loading from Google Sheets...</p>
        ) : (
          <div className="grid grid-cols-1 gap-4 text-xs md:grid-cols-3">
            {/* Songs */}
            <div className="rounded-xs border border-gray-200 bg-white p-3 dark:border-[#2a2a2a] dark:bg-[#181818]">
              <h4 className="mb-2 border-b border-gray-100 pb-1 text-[11px] font-bold tracking-wide text-black uppercase dark:border-[#252525] dark:text-gray-300">
                Songs ({songs.length})
              </h4>
              <ul className="m-0 list-none space-y-2 p-0">
                {songs.map((item) => (
                  <li key={item.id} className="group flex items-start justify-between gap-1">
                    <div className="truncate">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="craigslist-link block truncate font-medium"
                      >
                        {item.title}
                      </a>
                      {item.artist && (
                        <span className="block truncate text-[10px] text-gray-500 dark:text-gray-400">
                          {item.artist}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.title)}
                      disabled={deletingId === item.id}
                      className="ml-1 shrink-0 cursor-pointer text-[10px] text-red-600 hover:underline"
                      title="Delete item"
                    >
                      {deletingId === item.id ? '...' : '×'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Albums & Mixes */}
            <div className="rounded-xs border border-gray-200 bg-white p-3 dark:border-[#2a2a2a] dark:bg-[#181818]">
              <h4 className="mb-2 border-b border-gray-100 pb-1 text-[11px] font-bold tracking-wide text-black uppercase dark:border-[#252525] dark:text-gray-300">
                Albums &amp; Mixes ({albums.length})
              </h4>
              <ul className="m-0 list-none space-y-2 p-0">
                {albums.map((item) => (
                  <li key={item.id} className="group flex items-start justify-between gap-1">
                    <div className="truncate">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="craigslist-link block truncate font-medium"
                      >
                        {item.title}
                      </a>
                      {item.artist && (
                        <span className="block truncate text-[10px] text-gray-500 dark:text-gray-400">
                          {item.artist}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.title)}
                      disabled={deletingId === item.id}
                      className="ml-1 shrink-0 cursor-pointer text-[10px] text-red-600 hover:underline"
                      title="Delete item"
                    >
                      {deletingId === item.id ? '...' : '×'}
                    </button>
                  </li>
                ))}
              </ul>
            </div>

            {/* Podcasts */}
            <div className="rounded-xs border border-gray-200 bg-white p-3 dark:border-[#2a2a2a] dark:bg-[#181818]">
              <h4 className="mb-2 border-b border-gray-100 pb-1 text-[11px] font-bold tracking-wide text-black uppercase dark:border-[#252525] dark:text-gray-300">
                Podcasts ({podcasts.length})
              </h4>
              <ul className="m-0 list-none space-y-2 p-0">
                {podcasts.map((item) => (
                  <li key={item.id} className="group flex items-start justify-between gap-1">
                    <div className="truncate">
                      <a
                        href={item.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="craigslist-link block truncate font-medium"
                      >
                        {item.title}
                      </a>
                      {item.artist && (
                        <span className="block truncate text-[10px] text-gray-500 dark:text-gray-400">
                          {item.artist}
                        </span>
                      )}
                    </div>
                    <button
                      type="button"
                      onClick={() => handleDelete(item.id, item.title)}
                      disabled={deletingId === item.id}
                      className="ml-1 shrink-0 cursor-pointer text-[10px] text-red-600 hover:underline"
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
