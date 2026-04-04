import { useEffect, useState } from 'react';
import { createUser, getUsers } from '../api/users';
import { UsersForm } from '../components/UsersForm';
import { UsersTable } from '../components/UsersTable';
import type { CreateUserRequest, User } from '../types/user';

export function UsersPage() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  async function loadUsers() {
    try {
      setLoading(true);
      setError('');
      setUsers(await getUsers());
    } catch {
      setError('Could not load users');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreate(payload: CreateUserRequest) {
    try {
      setSaving(true);
      setError('');
      await createUser(payload);
      await loadUsers();
    } catch {
      setError('Could not create user');
    } finally {
      setSaving(false);
    }
  }

  useEffect(() => {
    void loadUsers();
  }, []);

  return (
    <section className="page-grid">
      <div>
        <h2>Users</h2>
        <p className="page-copy">Basic list and create flow for `/users`.</p>
        {error ? <p className="error">{error}</p> : null}
        {loading ? <p>Loading users...</p> : <UsersTable users={users} />}
      </div>

      <UsersForm loading={saving} onSubmit={handleCreate} />
    </section>
  );
}