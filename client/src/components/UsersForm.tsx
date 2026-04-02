
import { useState, type FormEvent } from 'react';
import type { CreateUserRequest, UserRole } from '../types/user';

interface UsersFormProps {
  loading?: boolean;
  onSubmit: (payload: CreateUserRequest) => Promise<void>;
}

export function UsersForm({ loading, onSubmit }: UsersFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [phone, setPhone] = useState('');
  const [role, setRole] = useState<UserRole>('OWNER');
  const [active, setActive] = useState(true);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    await onSubmit({
      email,
      password,
      firstName,
      lastName,
      phone: phone || undefined,
      role,
      active,
    });

    setEmail('');
    setPassword('');
    setFirstName('');
    setLastName('');
    setPhone('');
    setRole('OWNER');
    setActive(true);
  }

  return (
    <form className="panel form" onSubmit={handleSubmit}>
      <h2>Create User</h2>

      <label>
        Email
        <input
          type="email"
          value={email}
          onChange={(event) => setEmail(event.target.value)}
          required
        />
      </label>

      <label>
        Password
        <input
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          minLength={8}
          required
        />
      </label>

      <label>
        First Name
        <input
          type="text"
          value={firstName}
          onChange={(event) => setFirstName(event.target.value)}
          required
        />
      </label>

      <label>
        Last Name
        <input
          type="text"
          value={lastName}
          onChange={(event) => setLastName(event.target.value)}
          required
        />
      </label>

      <label>
        Phone
        <input
          type="text"
          value={phone}
          onChange={(event) => setPhone(event.target.value)}
        />
      </label>

      <label>
        Role
        <select
          value={role}
          onChange={(event) => setRole(event.target.value as UserRole)}
        >
          <option value="OWNER">OWNER</option>
          <option value="ADMIN">ADMIN</option>
        </select>
      </label>

      <label className="checkbox-field">
        <input
          type="checkbox"
          checked={active}
          onChange={(event) => setActive(event.target.checked)}
        />
        Active
      </label>

      <button type="submit" disabled={loading}>
        {loading ? 'Saving...' : 'Add User'}
      </button>
    </form>
  );
}
