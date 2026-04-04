import type { User } from '../types/user';

interface UsersTableProps {
  users: User[];
}

export function UsersTable({ users }: UsersTableProps) {
  return (
    <div className="panel">
      <h2>Users</h2>
      <table>
        <thead>
          <tr>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Phone</th>
            <th>Status</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.userId}>
              <td>{`${user.firstName} ${user.lastName}`}</td>
              <td>{user.email}</td>
              <td>{user.role}</td>
              <td>{user.phone || '-'}</td>
              <td>{user.active ? 'ACTIVE' : 'INACTIVE'}</td>
            </tr>
          ))}
        </tbody>
      </table>
      {users.length === 0 ? <p>No users yet.</p> : null}
    </div>
  );
}