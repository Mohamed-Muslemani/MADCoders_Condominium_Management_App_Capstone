import type { Announcement } from '../types/announcement';

interface AnnouncementsTableProps {
  announcements: Announcement[];
}

export function AnnouncementsTable({
  announcements,
}: AnnouncementsTableProps) {
  return (
    <div className="panel">
      <h2>Announcements</h2>
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Status</th>
            <th>Pinned</th>
            <th>Published</th>
            <th>Created By</th>
          </tr>
        </thead>
        <tbody>
          {announcements.map((announcement) => (
            <tr key={announcement.announcementId}>
              <td>{announcement.title}</td>
              <td>{announcement.status}</td>
              <td>{announcement.pinned ? 'YES' : 'NO'}</td>
              <td>{announcement.publishedAt?.slice(0, 10) ?? '-'}</td>
              <td>
                {announcement.createdBy
                  ? `${announcement.createdBy.firstName} ${announcement.createdBy.lastName}`
                  : '-'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
      {announcements.length === 0 ? <p>No announcements yet.</p> : null}
    </div>
  );
}