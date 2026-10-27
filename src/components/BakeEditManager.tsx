import { type SubmitEvent, useState } from 'react';

export interface EditableBake {
  id: string;
  date: string;
  description: string;
  notes: string;
  /** Existing photos as Drive file IDs with their renderable URLs. */
  photos: Array<{ id: string; url: string }>;
}

export default function BakeEditManager({ bake }: { bake: EditableBake }) {
  const [description, setDescription] = useState(bake.description);
  const [notes, setNotes] = useState(bake.notes);
  const [keptPhotos, setKeptPhotos] = useState<Array<{ id: string; url: string }>>(bake.photos);
  const [newFiles, setNewFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const removePhoto = (fileId: string) => {
    setKeptPhotos((current) => current.filter((photo) => photo.id !== fileId));
  };

  const handleSave = async (event: SubmitEvent) => {
    event.preventDefault();
    if (busy) return;
    setBusy(true);
    setError(null);

    try {
      const uploadedUrls: string[] = [];
      for (const file of newFiles) {
        const body = new FormData();
        body.append('file', file);
        const uploadRes = await fetch('/api/bakes/upload', { method: 'POST', body });
        const uploadData: unknown = await uploadRes.json();
        if (!uploadRes.ok) {
          const message =
            typeof uploadData === 'object' && uploadData !== null && 'error' in uploadData
              ? String((uploadData as { error: unknown }).error)
              : 'Photo upload failed';
          throw new Error(message);
        }
        uploadedUrls.push(String((uploadData as { url: string }).url));
      }

      const res = await fetch('/api/bakes/update', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          id: bake.id,
          description,
          notes,
          photos: [...keptPhotos.map((photo) => photo.id), ...uploadedUrls],
        }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const message =
          typeof data === 'object' && data !== null && 'error' in data
            ? String((data as { error: unknown }).error)
            : 'Failed to update bake';
        throw new Error(message);
      }

      window.location.reload();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to update bake');
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (deleting) return;
    if (!window.confirm(`Delete the bake from ${bake.date}? This cannot be undone.`)) {
      return;
    }
    setDeleting(true);
    setError(null);

    try {
      const res = await fetch('/api/bakes/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: bake.id }),
      });
      const data: unknown = await res.json();
      if (!res.ok) {
        const message =
          typeof data === 'object' && data !== null && 'error' in data
            ? String((data as { error: unknown }).error)
            : 'Failed to delete bake';
        throw new Error(message);
      }

      window.location.assign('/bread/bakes');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to delete bake');
      setDeleting(false);
    }
  };

  return (
    <section
      aria-label="Manage this bake"
      className="w-full rounded-xs border border-gray-200 bg-white p-4 text-left shadow-sm dark:border-[#333333] dark:bg-[#1c1c1c]"
    >
      <h2 className="mb-2 font-serif text-sm font-bold text-black dark:text-[#f0f0f0]">
        Manage this bake
      </h2>
      <form onSubmit={handleSave} className="flex flex-col gap-3">
        <div className="flex items-center justify-between gap-2">
          <label htmlFor="edit-bake-description" className="text-[13px]">
            Description
          </label>
          <input
            id="edit-bake-description"
            type="text"
            maxLength={200}
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            className="w-56 rounded-xs border border-gray-300 bg-white px-2 py-1 text-[13px] text-black focus:outline-2 focus:outline-blue-500 dark:border-[#444444] dark:bg-[#252525] dark:text-[#e0e0e0]"
          />
        </div>
        <label htmlFor="edit-bake-notes" className="text-[13px]">
          Notes
        </label>
        <textarea
          id="edit-bake-notes"
          rows={4}
          value={notes}
          onChange={(event) => setNotes(event.target.value)}
          className="rounded-xs border border-gray-300 bg-white px-2 py-1 text-[13px] text-black focus:outline-2 focus:outline-blue-500 dark:border-[#444444] dark:bg-[#252525] dark:text-[#e0e0e0]"
        />
        <fieldset className="rounded-xs border border-gray-200 p-2 dark:border-[#333333]">
          <legend className="px-1 text-[13px] font-semibold">Photos</legend>
          {keptPhotos.length === 0 && newFiles.length === 0 ? (
            <p className="py-1 text-xs text-gray-500 dark:text-gray-400">No photos attached.</p>
          ) : (
            <ul className="flex flex-wrap gap-2">
              {keptPhotos.map((photo) => (
                <li key={photo.id} className="relative">
                  <img
                    src={photo.url}
                    alt={`Bread or dough for the bake logged on ${bake.date}`}
                    className="h-20 w-20 rounded-xs border border-gray-200 object-cover dark:border-[#333333]"
                  />
                  <button
                    type="button"
                    onClick={() => removePhoto(photo.id)}
                    aria-label={`Remove photo ${keptPhotos.indexOf(photo) + 1}`}
                    className="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full border border-gray-400 bg-white text-[11px] font-bold text-black hover:bg-gray-100 focus:outline-2 focus:outline-blue-500 dark:border-[#555555] dark:bg-[#252525] dark:text-white dark:hover:bg-[#303030]"
                  >
                    ×
                  </button>
                </li>
              ))}
              {Array.from(newFiles).map((file, index) => (
                <li
                  key={`${file.name}-${index}`}
                  className="flex h-20 w-20 items-center justify-center rounded-xs border border-dashed border-gray-300 p-1 text-center text-[10px] text-gray-500 dark:border-[#444444] dark:text-gray-400"
                >
                  <span className="break-all line-clamp-3">{file.name}</span>
                </li>
              ))}
            </ul>
          )}
          <label htmlFor="edit-bake-photos" className="mt-2 block text-[13px]">
            Add photos <span className="text-gray-400">(up to 10 MB each)</span>
          </label>
          <input
            id="edit-bake-photos"
            type="file"
            accept="image/jpeg,image/png,image/webp,image/gif"
            multiple
            onChange={(event) => setNewFiles(Array.from(event.target.files ?? []))}
            className="mt-1 text-[13px]"
          />
        </fieldset>
        {error ? (
          <p role="alert" className="text-xs font-semibold text-red-700 dark:text-red-400">
            {error}
          </p>
        ) : null}
        <div className="flex items-center gap-2">
          <button
            type="submit"
            disabled={busy || deleting}
            className="rounded-xs border border-gray-800 bg-black px-3 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-gray-800 focus:outline-2 focus:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-[#555555] dark:bg-[#e0e0e0] dark:text-black dark:hover:bg-white"
          >
            {busy ? 'Saving…' : 'Save changes'}
          </button>
          <button
            type="button"
            onClick={handleDelete}
            disabled={busy || deleting}
            className="rounded-xs border border-red-700 px-3 py-1.5 text-xs font-semibold text-red-700 transition-colors hover:bg-red-50 focus:outline-2 focus:outline-blue-500 disabled:cursor-not-allowed disabled:opacity-50 dark:border-red-400 dark:text-red-400 dark:hover:bg-[#3d1a1a]"
          >
            {deleting ? 'Deleting…' : 'Delete bake'}
          </button>
        </div>
      </form>
    </section>
  );
}
