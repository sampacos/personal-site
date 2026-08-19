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
        className="p-4 border border-gray-200 dark:border-[#333333] bg-white dark:bg-[#1f1f1f] rounded-xs space-y-4"
      >
        <div className="flex items-center justify-between pb-2 border-b border-gray-200 dark:border-[#333333]">
          <h3 className="text-xs font-bold uppercase tracking-wider text-black dark:text-white flex items-center gap-2">
            <span>{editingId ? '✏️ Edit Blog Post' : '+ Compose New Blog Post'}</span>
            {editingId && (
              <span className="text-[10px] bg-blue-100 dark:bg-[#152e4d] text-blue-800 dark:text-blue-300 px-1.5 py-0.5 rounded-xs font-mono">
                Editing: {title || editingId}
              </span>
            )}
          </h3>

          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="text-xs text-gray-500 hover:text-black dark:hover:text-white underline cursor-pointer"
            >
              Cancel Edit
            </button>
          )}
        </div>

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
              htmlFor="post-title"
              className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1"
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
              className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-[#444444] bg-white dark:bg-[#252525] text-black dark:text-white rounded-xs"
            />
          </div>

          <div>
            <label
              htmlFor="post-slug"
              className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1"
            >
              URL Slug (/blog/[slug])
            </label>
            <input
              id="post-slug"
              type="text"
              placeholder="e.g. sourdough-experiments-4"
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-[#444444] bg-white dark:bg-[#252525] text-black dark:text-white rounded-xs font-mono text-[11px]"
            />
          </div>
        </div>

        <div className="text-xs">
          <label
            htmlFor="post-desc"
            className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-1"
          >
            Short Description / Excerpt
          </label>
          <input
            id="post-desc"
            type="text"
            placeholder="A brief 1-2 sentence preview for the homepage and blog listing..."
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full px-2.5 py-1.5 border border-gray-300 dark:border-[#444444] bg-white dark:bg-[#252525] text-black dark:text-white rounded-xs"
          />
        </div>

        {/* Rich Markdown Editor Toolbar & View Switcher */}
        <div className="space-y-1.5 text-xs">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 dark:border-[#333333] pb-1.5">
            {/* Formatting Toolbar */}
            <div className="flex flex-wrap items-center gap-1">
              <button
                type="button"
                onClick={() => insertFormatting('# ', '', 'Heading 1')}
                title="Heading 1"
                className="px-2 py-0.5 border border-gray-200 dark:border-[#444444] bg-gray-50 dark:bg-[#282828] hover:bg-gray-200 dark:hover:bg-[#383838] text-[11px] font-bold rounded-xs cursor-pointer"
              >
                H1
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('## ', '', 'Heading 2')}
                title="Heading 2"
                className="px-2 py-0.5 border border-gray-200 dark:border-[#444444] bg-gray-50 dark:bg-[#282828] hover:bg-gray-200 dark:hover:bg-[#383838] text-[11px] font-bold rounded-xs cursor-pointer"
              >
                H2
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('### ', '', 'Heading 3')}
                title="Heading 3"
                className="px-2 py-0.5 border border-gray-200 dark:border-[#444444] bg-gray-50 dark:bg-[#282828] hover:bg-gray-200 dark:hover:bg-[#383838] text-[11px] font-bold rounded-xs cursor-pointer"
              >
                H3
              </button>

              <span className="text-gray-300 dark:text-[#444] mx-0.5">|</span>

              <button
                type="button"
                onClick={() => insertFormatting('**', '**', 'bold text')}
                title="Bold"
                className="px-2 py-0.5 border border-gray-200 dark:border-[#444444] bg-gray-50 dark:bg-[#282828] hover:bg-gray-200 dark:hover:bg-[#383838] text-[11px] font-bold rounded-xs cursor-pointer"
              >
                B
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('*', '*', 'italic text')}
                title="Italic"
                className="px-2 py-0.5 border border-gray-200 dark:border-[#444444] bg-gray-50 dark:bg-[#282828] hover:bg-gray-200 dark:hover:bg-[#383838] text-[11px] italic rounded-xs cursor-pointer"
              >
                I
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('~~', '~~', 'strikethrough')}
                title="Strikethrough"
                className="px-2 py-0.5 border border-gray-200 dark:border-[#444444] bg-gray-50 dark:bg-[#282828] hover:bg-gray-200 dark:hover:bg-[#383838] text-[11px] line-through rounded-xs cursor-pointer"
              >
                S
              </button>

              <span className="text-gray-300 dark:text-[#444] mx-0.5">|</span>

              <button
                type="button"
                onClick={() => insertFormatting('> ', '', 'quote')}
                title="Quote"
                className="px-2 py-0.5 border border-gray-200 dark:border-[#444444] bg-gray-50 dark:bg-[#282828] hover:bg-gray-200 dark:hover:bg-[#383838] text-[11px] rounded-xs cursor-pointer"
              >
                &ldquo;&rdquo;
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('- ', '', 'list item')}
                title="Bullet List"
                className="px-2 py-0.5 border border-gray-200 dark:border-[#444444] bg-gray-50 dark:bg-[#282828] hover:bg-gray-200 dark:hover:bg-[#383838] text-[11px] rounded-xs cursor-pointer"
              >
                &bull; List
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('1. ', '', 'first item')}
                title="Numbered List"
                className="px-2 py-0.5 border border-gray-200 dark:border-[#444444] bg-gray-50 dark:bg-[#282828] hover:bg-gray-200 dark:hover:bg-[#383838] text-[11px] rounded-xs cursor-pointer"
              >
                1. List
              </button>

              <span className="text-gray-300 dark:text-[#444] mx-0.5">|</span>

              <button
                type="button"
                onClick={() => insertFormatting('`', '`', 'code')}
                title="Inline Code"
                className="px-2 py-0.5 border border-gray-200 dark:border-[#444444] bg-gray-50 dark:bg-[#282828] hover:bg-gray-200 dark:hover:bg-[#383838] text-[11px] font-mono rounded-xs cursor-pointer"
              >
                &lt;/&gt;
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('```ts\n', '\n```', '// code block')}
                title="Code Block"
                className="px-2 py-0.5 border border-gray-200 dark:border-[#444444] bg-gray-50 dark:bg-[#282828] hover:bg-gray-200 dark:hover:bg-[#383838] text-[11px] font-mono rounded-xs cursor-pointer"
              >
                Block
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('[', '](https://)', 'link text')}
                title="Link"
                className="px-2 py-0.5 border border-gray-200 dark:border-[#444444] bg-gray-50 dark:bg-[#282828] hover:bg-gray-200 dark:hover:bg-[#383838] text-[11px] rounded-xs cursor-pointer"
              >
                🔗 Link
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('![', '](https://)', 'image alt text')}
                title="Image"
                className="px-2 py-0.5 border border-gray-200 dark:border-[#444444] bg-gray-50 dark:bg-[#282828] hover:bg-gray-200 dark:hover:bg-[#383838] text-[11px] rounded-xs cursor-pointer"
              >
                🖼️ Image
              </button>
              <button
                type="button"
                onClick={() => insertFormatting('\n---\n\n')}
                title="Horizontal Divider"
                className="px-2 py-0.5 border border-gray-200 dark:border-[#444444] bg-gray-50 dark:bg-[#282828] hover:bg-gray-200 dark:hover:bg-[#383838] text-[11px] rounded-xs cursor-pointer"
              >
                &mdash; Line
              </button>
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setViewMode('write')}
                className={`px-2 py-0.5 text-[11px] rounded-xs cursor-pointer border ${
                  viewMode === 'write'
                    ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white font-semibold'
                    : 'bg-white dark:bg-[#252525] border-gray-300 dark:border-[#444444] text-gray-700 dark:text-gray-300'
                }`}
              >
                Write
              </button>
              <button
                type="button"
                onClick={() => setViewMode('preview')}
                className={`px-2 py-0.5 text-[11px] rounded-xs cursor-pointer border ${
                  viewMode === 'preview'
                    ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white font-semibold'
                    : 'bg-white dark:bg-[#252525] border-gray-300 dark:border-[#444444] text-gray-700 dark:text-gray-300'
                }`}
              >
                Preview
              </button>
              <button
                type="button"
                onClick={() => setViewMode('split')}
                className={`hidden md:inline-block px-2 py-0.5 text-[11px] rounded-xs cursor-pointer border ${
                  viewMode === 'split'
                    ? 'bg-black dark:bg-white text-white dark:text-black border-black dark:border-white font-semibold'
                    : 'bg-white dark:bg-[#252525] border-gray-300 dark:border-[#444444] text-gray-700 dark:text-gray-300'
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
                className="w-full font-mono text-xs p-3 border border-gray-300 dark:border-[#444444] bg-white dark:bg-[#252525] text-black dark:text-white rounded-xs leading-relaxed focus:outline-2 focus:outline-blue-500"
              />
            )}

            {viewMode === 'preview' && (
              <div
                className="w-full min-h-[260px] p-4 border border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[#181818] rounded-xs blog-preview-content prose dark:prose-invert max-w-none text-xs leading-relaxed"
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
                  className="w-full font-mono text-xs p-3 border border-gray-300 dark:border-[#444444] bg-white dark:bg-[#252525] text-black dark:text-white rounded-xs leading-relaxed focus:outline-2 focus:outline-blue-500"
                />
                <div
                  className="w-full h-full min-h-[260px] p-4 border border-gray-200 dark:border-[#333333] bg-gray-50 dark:bg-[#181818] rounded-xs blog-preview-content prose dark:prose-invert max-w-none text-xs leading-relaxed overflow-y-auto"
                  dangerouslySetInnerHTML={{ __html: parsedPreview }}
                />
              </div>
            )}
          </div>

          <div className="flex items-center justify-between text-[11px] text-gray-500 dark:text-gray-400 pt-1">
            <span>
              {wordCount} {wordCount === 1 ? 'word' : 'words'} &bull; {charCount} characters
            </span>
            <span className="font-mono text-[10px]">Markdown supported</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="pt-2 flex items-center justify-end gap-3">
          {editingId && (
            <button
              type="button"
              onClick={cancelEdit}
              className="px-3 py-1.5 text-xs text-gray-700 dark:text-gray-300 border border-gray-300 dark:border-[#444444] rounded-xs hover:bg-gray-100 dark:hover:bg-[#282828] cursor-pointer"
            >
              Cancel
            </button>
          )}

          <button
            type="submit"
            disabled={submitting}
            className="px-4 py-1.5 text-xs font-semibold bg-black dark:bg-white text-white dark:text-black rounded-xs hover:bg-gray-800 dark:hover:bg-gray-200 transition-colors disabled:opacity-50 cursor-pointer"
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
        <div className="flex items-center justify-between border-b border-gray-200 dark:border-[#2a2a2a] pb-1">
          <h3 className="text-xs font-bold uppercase tracking-wider text-black dark:text-white">
            Existing Blog Posts ({posts.length})
          </h3>
          <button
            type="button"
            onClick={fetchPosts}
            className="text-[11px] craigslist-link cursor-pointer"
          >
            refresh
          </button>
        </div>

        {loading ? (
          <p className="text-xs text-gray-500 dark:text-gray-400">Loading from Google Sheets...</p>
        ) : posts.length === 0 ? (
          <p className="text-xs text-gray-500 dark:text-gray-400 italic">No posts published yet.</p>
        ) : (
          <ul className="space-y-2 list-none p-0 m-0 text-xs">
            {posts.map((post) => (
              <li
                key={post.id}
                className={`flex items-start justify-between gap-3 p-3 border rounded-xs transition-colors ${
                  editingId === post.id
                    ? 'border-blue-500 dark:border-blue-400 bg-blue-50/40 dark:bg-[#182638]'
                    : 'border-gray-200 dark:border-[#2a2a2a] bg-white dark:bg-[#181818]'
                }`}
              >
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <a
                      href={`/blog/${post.slug}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="craigslist-link font-bold text-xs truncate"
                    >
                      {post.title}
                    </a>
                    <span className="text-[10px] text-gray-400 font-mono">/blog/{post.slug}</span>
                    {editingId === post.id && (
                      <span className="text-[9px] uppercase font-bold text-blue-600 dark:text-blue-400 bg-blue-100 dark:bg-blue-900/50 px-1 py-0.2 rounded-xs">
                        Editing Now
                      </span>
                    )}
                  </div>
                  {post.description && (
                    <p className="text-[11px] text-gray-600 dark:text-gray-400 line-clamp-1 mt-0.5">
                      {post.description}
                    </p>
                  )}
                  <span className="text-[10px] text-gray-400 block mt-1">
                    Published:{' '}
                    {new Date(post.publishedAt).toLocaleDateString('en-US', {
                      month: 'short',
                      day: 'numeric',
                      year: 'numeric',
                    })}
                    {post.updatedAt && (
                      <span className="ml-2 italic text-gray-500">
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

                <div className="flex items-center gap-3 shrink-0 pt-0.5">
                  <button
                    type="button"
                    onClick={() => startEdit(post)}
                    className="text-[11px] text-blue-600 dark:text-blue-400 hover:underline font-medium cursor-pointer"
                  >
                    edit
                  </button>
                  <a
                    href={`/blog/${post.slug}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[11px] craigslist-link"
                  >
                    view
                  </a>
                  <button
                    type="button"
                    onClick={() => handleDelete(post.id, post.title)}
                    disabled={deletingId === post.id}
                    className="text-[11px] text-red-600 hover:underline cursor-pointer"
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
