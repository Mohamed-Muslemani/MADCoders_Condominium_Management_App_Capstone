import { useState, type FormEvent } from 'react';
import type {
  AnnouncementStatus,
  CreateAnnouncementRequest,
} from '../types/announcement';

interface AnnouncementsFormProps {
  loading?: boolean;
  onSubmit: (payload: CreateAnnouncementRequest) => Promise<void>;
}

export function AnnouncementsForm({
  loading,
  onSubmit,
}: AnnouncementsFormProps) {
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [status, setStatus] = useState<AnnouncementStatus>('DRAFT');
  const [pinned, setPinned] = useState(false);
  const [publishedAt, setPublishedAt] = useState('');

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSubmit({
      title,
      content,
      status,
      pinned,
      publishedAt: publishedAt || undefined,
    });

    setTitle('');
    setContent('');
    setStatus('DRAFT');
    setPinned(false);
    setPublishedAt('');
  }

  return (
    <form className="panel form" onSubmit={handleSubmit}>
      <h2>Create Announcement</h2>

      <label>
        Title
        <input
          type="text"
          value={title}
          onChange={(event) => setTitle(event.target.value)}
          required
        />
      </label>

      <label>
        Content
        <textarea
          value={content}
          onChange={(event) => setContent(event.target.value)}
          rows={5}
          required
        />
      </label>

      <label>
        Status
        <select
          value={status}
          onChange={(event) =>
            setStatus(event.target.value as AnnouncementStatus)
          }
        >
          <option value="DRAFT">DRAFT</option>
          <option value="PUBLISHED">PUBLISHED</option>
          <option value="ARCHIVED">ARCHIVED</option>
        </select>
      </label>

      <label>
        Published At
        <input
          type="date"
          value={publishedAt}
          onChange={(event) => setPublishedAt(event.target.value)}
        />
      </label>

      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={pinned}
          onChange={(event) => setPinned(event.target.checked)}
        />
        Pinned
      </label>

      <button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Add Announcement'}
      </button>
    </form>
  );
}