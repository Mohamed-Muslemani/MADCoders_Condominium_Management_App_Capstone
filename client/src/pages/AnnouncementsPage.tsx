import { useEffect, useState } from 'react';
import { createAnnouncement, getAnnouncements } from '../api/announcements';
import { AnnouncementsForm } from '../components/AnnounsementsForm';
import { AnnouncementsTable } from '../components/AnnouncementsTable';
import type {
  Announcement,
  CreateAnnouncementRequest,
} from '../types/announcement';

export function AnnouncementsPage() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadAnnouncements() {
    try {
      setLoading(true);
      setError('');
      setAnnouncements(await getAnnouncements());
    } catch {
      setError('Could not load announcements');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(payload: CreateAnnouncementRequest) {
    try {
      setSaving(true);
      setError('');
      await createAnnouncement(payload);
      await loadAnnouncements();
    } catch {
      setError('Could not create announcement');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadAnnouncements();
  }, []);

  return (
    <section className="page-grid">
      <div>
        <h2>Announcements</h2>
        <p className="page-copy">Basic list and create flow for `/announcements`.</p>
        {error ? <p className="error">{error}</p> : null}
        {loading ? (
          <p>Loading announcements...</p>
        ) : (
          <AnnouncementsTable announcements={announcements} />
        )}
      </div>

      <AnnouncementsForm loading={saving} onSubmit={handleCreate} />
    </section>
  );
}