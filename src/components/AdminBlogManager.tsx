import { marked } from 'marked';
import React, { useEffect, useRef, useState } from 'react';
import type { BlogPostItem } from '../lib/sheets';

export default function AdminBlogManager() {
  const [posts, setPosts] = useState<BlogPostItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Edit vs Create mode
  const [editingId, setEditingId] = useState<string | null>(null);

  // Form state
  const [title, setTitle] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState('');

  // Editor View Mode
  const [viewMode, setViewMode] = useState<'write' | 'preview' | 'split'>('write');

  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const formRef = useRef<HTMLFormElement | null>(null);

  const fetchPosts = async () => {
    try {
      setLoading(true);
      const res = await fetch('/api/blog');
      const data = await res.json();
      if (data.posts) {
        setPosts(data.posts);
      }
    } catch (err) {
      console.error('Failed to load posts:', err);
      setError('Failed to fetch existing blog posts.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPosts();
  }, []);

  const handleTitleChange = (val: string) => {
    setTitle(val);
    if (!editingId && (!slug || slug === title.toLowerCase().replace(/[^a-z0-9-_]/g, '-'))) {
      setSlug(
        val
          .toLowerCase()
          .replace(/[^a-z0-9-_]/g, '-')
          .replace(/-+/g, '-'),
      );
    }
  };

  // Helper to insert formatting into textarea
  const insertFormatting = (prefix: string, suffix = '', defaultText = '') => {
    const textarea = textareaRef.current;
    if (!textarea) return;

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = content.substring(start, end) || defaultText;
    const replacement = `${prefix}${selectedText}${suffix}`;

    const newContent = content.substring(0, start) + replacement + content.substring(end);
    setContent(newContent);

    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(
        start + prefix.length,
        start + prefix.length + selectedText.length,
      );
    }, 10);
  };

  const startEdit = (post: BlogPostItem) => {
    setEditingId(post.id);
    setTitle(post.title);
    setSlug(post.slug);
    setDescription(post.description);
    setContent(post.content);
    setError(null);
    setSuccessMsg(null);
    formRef.current?.scrollIntoView?.({ behavior: 'smooth' });
  };

  const cancelEdit = () => {
    setEditingId(null);
    setTitle('');
    setSlug('');
    setDescription('');
    setContent('');
    setError(null);
    setSuccessMsg(null);
  };

  const handleSubmit = async (e: React.SyntheticEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!title.trim() || !content.trim()) {
      setError('Please provide both a title and content.');
      return;
    }

    try {
      setSubmitting(true);
      setError(null);
      setSuccessMsg(null);

      const endpoint = editingId ? '/api/blog/update' : '/api/blog/create';
      const payload = editingId
        ? {
            id: editingId,
            title: title.trim(),
            slug: slug.trim() || undefined,
            description: description.trim(),
            content: content.trim(),
          }
        : {
            title: title.trim(),
            slug: slug.trim() || undefined,
            description: description.trim(),
            content: content.trim(),
          };

      const res = await fetch(endpoint, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to save blog post to Google Sheets.');
      }

      setSuccessMsg(
        editingId
          ? `Updated "${title}"! View at /blog/${data.post.slug}`
          : `Published "${title}"! View at /blog/${data.post.slug}`,
      );

      setEditingId(null);
      setTitle('');
      setSlug('');
      setDescription('');
      setContent('');
      await fetchPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error saving post.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = async (id: string, postTitle: string) => {
    if (!confirm(`Delete blog post "${postTitle}"?`)) return;

    try {
      setDeletingId(id);
      setError(null);

      const res = await fetch('/api/blog/delete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id }),
      });

      const data = await res.json();
      if (!res.ok || data.error) {
        throw new Error(data.error || 'Failed to delete from Google Sheets.');
      }

      if (editingId === id) {
        cancelEdit();
      }

      setSuccessMsg(`Deleted "${postTitle}".`);
      await fetchPosts();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Error deleting post.');
    } finally {
      setDeletingId(null);
    }
  };

  const wordCount = content.trim() ? content.trim().split(/\s+/).length : 0;
  const charCount = content.length;
  const parsedPreview = content
    ? marked.parse(content)
    : '<p class="text-gray-400 italic">Preview will appear here...</p>';

  return (
    <div className="space-y-6">
      {/* 1. Rich Blog Composer Form */}
      <form
        ref={formRef}
        onSubmit={handleSubmit}
        className="space-y-4 rounded-xs border border-gray-200 bg-white p-4 dark:border-[#333333] dark:bg-[#1f1f1f]"
      >
        <div className="flex items-center justify-between border-b border-gray-200 pb-2 dark:border-[#333333]">
          <h3 className="flex items-center gap-2 text-xs font-bold tracking-wider text-black uppercase dark:text-white">
            <span>{editingId ? '✏️ Edit Blog Post' : '+ Compose New Blog Post'}</span>
            {editingId && (
              <span className="rounded-xs bg-blue-100 px-1.5 py-0.5 font-mono text-[10px] text-blue-800 dark:bg-[#152e4d] dark:text-blue-300">
                Editing: {title || editingId}
              </span>
            )}
          </h3>

          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="cursor-pointer text-xs text-gray-500 underline hover:text-black dark:hover:text-white"
            >
              Cancel Edit
            </button>
          )}
        </div>

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
              htmlFor="post-title"
              className="mb-1 block text-[11px] font-medium text-gray-700 dark:text-gray-300"
            >
              Post Title *
            </label>
            <input
              id="post-title"
              type="text"
              required
              placeholder="e.g. sourdough experiments #4"
              value={title}
              onChange={(e) => handleTitleChange(e.target.value)}
              className="w-full rounded-xs border border-gray-300 bg-white px-2.5 py-1.5 text-black dark:border-[#444444] dark:bg-[#252525] dark:text-white"
            />
          </div>

          <div>
            <label
              htmlFor="post-slug"
              className="mb-1 block text-[11px] font-medium text-gray-700 dark:text-gray-300"
            >
              URL Slug (/blog/[slug])
            </label>
            <input
              id="post-slug"
              type="text"
              placeholder="e.g. sourdough-experiments-4"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full rounded-xs border border-gray-300 bg-white px-2.5 py-1.5 font-mono text-[11px] text-black dark:border-[#444444] dark:bg-[#252525] dark:text-white"
            />
          </div>
        </div>

        <div className="text-xs">
          <label
            htmlFor="post-desc"
            className="mb-1 block text-[11px] font-medium text-gray-700 dark:text-gray-300"
          >
            Short Description / Excerpt
          </label>
          <input
            id="post-desc"
            type="text"
            placeholder="A brief 1-2 sentence preview for the homepage and blog listing..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-xs border border-gray-300 bg-white px-2.5 py-1.5 text-black dark:border-[#444444] dark:bg-[#252525] dark:text-white"
          />
        </div>

        {/* Rich Markdown Editor Toolbar & View Switcher */}
        <div className="space-y-1.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 pb-1.5 dark:border-[#333333]">
            {/* Formatting Toolbar */}
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => insertFormatting('# ', '', 'Heading 1')}
                title="Heading 1"
                className="cursor-pointer rounded-xs border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-bold hover:bg-gray-200 dark:border-[#444444] dark:bg-[#282828] dark:hover:bg-[#383838]"
              >
                H1
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('## ', '', 'Heading 2')}
                title="Heading 2"
                className="cursor-pointer rounded-xs border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-bold hover:bg-gray-200 dark:border-[#444444] dark:bg-[#282828] dark:hover:bg-[#383838]"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('### ', '', 'Heading 3')}
                title="Heading 3"
                className="cursor-pointer rounded-xs border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-bold hover:bg-gray-200 dark:border-[#444444] dark:bg-[#282828] dark:hover:bg-[#383838]"
              >
                H3
              </button>

              <span className="mx-0.5 text-gray-300 dark:text-[#444]">|</span>

              <button
                type="button"
                onClick={() => insertFormatting('**', '**', 'bold text')}
                title="Bold"
                className="cursor-pointer rounded-xs border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] font-bold hover:bg-gray-200 dark:border-[#444444] dark:bg-[#282828] dark:hover:bg-[#383838]"
              >
                B
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('*', '*', 'italic text')}
                title="Italic"
                className="cursor-pointer rounded-xs border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] italic hover:bg-gray-200 dark:border-[#444444] dark:bg-[#282828] dark:hover:bg-[#383838]"
              >
                I
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('~~', '~~', 'strikethrough')}
                title="Strikethrough"
                className="cursor-pointer rounded-xs border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] line-through hover:bg-gray-200 dark:border-[#444444] dark:bg-[#282828] dark:hover:bg-[#383838]"
              >
                S
              </button>

              <span className="mx-0.5 text-gray-300 dark:text-[#444]">|</span>

              <button
                type="button"
                onClick={() => insertFormatting('> ', '', 'quote')}
                title="Quote"
                className="cursor-pointer rounded-xs border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] hover:bg-gray-200 dark:border-[#444444] dark:bg-[#282828] dark:hover:bg-[#383838]"
              >
                &ldquo;&rdquo;
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('- ', '', 'list item')}
                title="Bullet List"
                className="cursor-pointer rounded-xs border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] hover:bg-gray-200 dark:border-[#444444] dark:bg-[#282828] dark:hover:bg-[#383838]"
              >
                &bull; List
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('1. ', '', 'first item')}
                title="Numbered List"
                className="cursor-pointer rounded-xs border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] hover:bg-gray-200 dark:border-[#444444] dark:bg-[#282828] dark:hover:bg-[#383838]"
              >
                1. List
              </button>

              <span className="mx-0.5 text-gray-300 dark:text-[#444]">|</span>

              <button
                type="button"
                onClick={() => insertFormatting('`', '`', 'code')}
                title="Inline Code"
                className="cursor-pointer rounded-xs border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-[11px] hover:bg-gray-200 dark:border-[#444444] dark:bg-[#282828] dark:hover:bg-[#383838]"
              >
                &lt;/&gt;
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('```ts\n', '\n```', '// code block')}
                title="Code Block"
                className="cursor-pointer rounded-xs border border-gray-200 bg-gray-50 px-2 py-0.5 font-mono text-[11px] hover:bg-gray-200 dark:border-[#444444] dark:bg-[#282828] dark:hover:bg-[#383838]"
              >
                Block
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('[', '](https://)', 'link text')}
                title="Link"
                className="cursor-pointer rounded-xs border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] hover:bg-gray-200 dark:border-[#444444] dark:bg-[#282828] dark:hover:bg-[#383838]"
              >
                🔗 Link
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('![', '](https://)', 'image alt text')}
                title="Image"
                className="cursor-pointer rounded-xs border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] hover:bg-gray-200 dark:border-[#444444] dark:bg-[#282828] dark:hover:bg-[#383838]"
              >
                🖼️ Image
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('\n---\n\n')}
                title="Horizontal Divider"
                className="cursor-pointer rounded-xs border border-gray-200 bg-gray-50 px-2 py-0.5 text-[11px] hover:bg-gray-200 dark:border-[#444444] dark:bg-[#282828] dark:hover:bg-[#383838]"
              >
                &mdash; Line
              </button>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode('write')}
                className={`cursor-pointer rounded-xs border px-2 py-0.5 text-[11px] ${
                  viewMode === 'write'
                    ? 'border-black bg-black font-semibold text-white dark:border-white dark:bg-white dark:text-black'
                    : 'border-gray-300 bg-white text-gray-700 dark:border-[#444444] dark:bg-[#252525] dark:text-gray-300'
                }`}
              >
                Write
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`cursor-pointer rounded-xs border px-2 py-0.5 text-[11px] ${
                  viewMode === 'preview'
                    ? 'border-black bg-black font-semibold text-white dark:border-white dark:bg-white dark:text-black'
                    : 'border-gray-300 bg-white text-gray-700 dark:border-[#444444] dark:bg-[#252525] dark:text-gray-300'
                }`}
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`hidden cursor-pointer rounded-xs border px-2 py-0.5 text-[11px] md:inline-block ${
                  viewMode === 'split'
                    ? 'border-black bg-black font-semibold text-white dark:border-white dark:bg-white dark:text-black'
                    : 'border-gray-300 bg-white text-gray-700 dark:border-[#444444] dark:bg-[#252525] dark:text-gray-300'
                }`}
              >
                Split View
              </button>
            </div>
          </div>

          {/* Editor Body */}
          <div className="relative">
            {viewMode === 'write' && (
              <textarea
                ref={textareaRef}
                id="post-content"
                required
                rows={12}
                placeholder="Write your blog post here... Supports Markdown formatting."
                value={content}
                onChange={(e) => setContent(e.target.value)}
                className="w-full rounded-xs border border-gray-300 bg-white p-3 font-mono text-xs leading-relaxed text-black focus:outline-2 focus:outline-blue-500 dark:border-[#444444] dark:bg-[#252525] dark:text-white"
              />
            )}

            {viewMode === 'preview' && (
              <div
                className="blog-preview-content prose dark:prose-invert min-h-[260px] w-full max-w-none rounded-xs border border-gray-200 bg-gray-50 p-4 text-xs leading-relaxed dark:border-[#333333] dark:bg-[#181818]"
                dangerouslySetInnerHTML={{ __html: parsedPreview }}
              />
            )}

            {viewMode === 'split' && (
              <div className="grid grid-cols-2 gap-3">
                <textarea
                  ref={textareaRef}
                  required
                  rows={12}
                  placeholder="Write your blog post here..."
                  value={content}
                  onChange={(e) => setContent(e.target.value)}
                  className="w-full rounded-xs border border-gray-300 bg-white p-3 font-mono text-xs leading-relaxed text-black focus:outline-2 focus:outline-blue-500 dark:border-[#444444] dark:bg-[#252525] dark:text-white"
                />
                <div
                  className="blog-preview-content prose dark:prose-invert h-full min-h-[260px] w-full max-w-none overflow-y-auto rounded-xs border border-gray-200 bg-gray-50 p-4 text-xs leading-relaxed dark:border-[#333333] dark:bg-[#181818]"
                  dangerouslySetInnerHTML={{ __html: parsedPreview }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between pt-1 text-[11px] text-gray-500 dark:text-gray-400">
            <span>
              {wordCount} {wordCount === 1 ? 'word' : 'words'} &bull; {charCount} characters
            </span>
            <span className="font-mono text-[10px]">Markdown supported</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3 pt-2">
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="cursor-pointer rounded-xs border border-gray-300 px-3 py-1.5 text-xs text-gray-700 hover:bg-gray-100 dark:border-[#444444] dark:text-gray-300 dark:hover:bg-[#282828]"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="cursor-pointer rounded-xs bg-black px-4 py-1.5 text-xs font-semibold text-white transition-colors hover:bg-gray-800 disabled:opacity-50 dark:bg-white dark:text-black dark:hover:bg-gray-200"
          >
            {submitting
              ? 'Saving to Google Sheets...'
              : editingId
                ? 'Update Blog Post'
                : 'Publish Blog Post'}
          </button>
        </div>
      </form>

      {/* 2. Existing Blog Posts List with Edit & Delete */}
      <div className="space-y-3">
        <div className="flex items-center justify-between border-b border-gray-200 pb-1 dark:border-[#2a2a2a]">
          <h3 className="text-xs font-bold tracking-wider text-black uppercase dark:text-white">
            Existing Blog Posts ({posts.length})
          </h3>
          <button
            type="button"
            onClick={fetchPosts}
            className="craigslist-link cursor-pointer text-[11px]"
          >
            refresh
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">Loading from Google Sheets...</p>
        ) : posts.length === 0 ? (
          <p className="text-xs text-gray-500 italic dark:text-gray-400">No posts published yet.</p>
        ) : (
          <ul className="m-0 list-none space-y-2 p-0 text-xs">
            {posts.map((post) => (
              <li
                key={post.id}
                className={`flex items-start justify-between gap-3 rounded-xs border p-3 transition-colors ${
                  editingId === post.id
                    ? 'border-blue-500 bg-blue-50/40 dark:border-blue-400 dark:bg-[#182638]'
                    : 'border-gray-200 bg-white dark:border-[#2a2a2a] dark:bg-[#181818]'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <a
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="craigslist-link truncate text-xs font-bold"
                    >
                      {post.title}
                    </a>
                    <span className="font-mono text-[10px] text-gray-400">/blog/{post.slug}</span>
                    {editingId === post.id && (
                      <span className="py-0.2 rounded-xs bg-blue-100 px-1 text-[9px] font-bold text-blue-600 uppercase dark:bg-blue-900/50 dark:text-blue-400">
                        Editing Now
                      </span>
                    )}
                  </div>
                  {post.description && (
                    <p className="mt-0.5 line-clamp-1 text-[11px] text-gray-600 dark:text-gray-400">
                      {post.description}
                    </p>
                  )}
                  <span className="mt-1 block text-[10px] text-gray-400">
                    Published:{' '}
                    {new Date(post.publishedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    {post.updatedAt && (
                      <span className="ml-2 text-gray-500 italic">
                        (Updated:{' '}
                        {new Date(post.updatedAt).toLocaleDateString('en-US', {
                          month: 'short',
                          day: 'numeric',
                        })}
                        )
                      </span>
                    )}
                  </span>
                </div>

                <div className="flex shrink-0 items-center gap-3 pt-0.5">
                  <button
                    type="button"
                    onClick={() => startEdit(post)}
                    className="cursor-pointer text-[11px] font-medium text-blue-600 hover:underline dark:text-blue-400"
                  >
                    edit
                  </button>
                  <a
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="craigslist-link text-[11px]"
                  >
                    view
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDelete(post.id, post.title)}
                    disabled={deletingId === post.id}
                    className="cursor-pointer text-[11px] text-red-600 hover:underline"
                  >
                    {deletingId === post.id ? 'deleting...' : 'delete'}
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
