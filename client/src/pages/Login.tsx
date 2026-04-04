import { useState } from 'react';
import { login, type AuthUser } from '../api';

type Props = {
  onLogin: (accessToken: string, user: AuthUser) => void;
};

export default function Login({ onLogin }: Props) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setLoading(true);
    setError('');

    try {
      const response = await login(email, password);
      onLogin(response.accessToken, response.user);
    } catch (submitError) {
      setError(
        submitError instanceof Error ? submitError.message : 'Login failed.',
      );
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="login-shell">
      <section className="login-card">
        <h1>Sign in</h1>
        <p className="muted-text">
          Use an existing CondoManager account to access the AI document test
          page.
        </p>

        <form className="stack" onSubmit={handleSubmit}>
          <label>
            Email
            <input
              type="email"
              value={email}
              onChange={(event) => setEmail(event.target.value)}
              placeholder="admin@example.com"
              required
            />
          </label>

          <label>
            Password
            <input
              type="password"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              placeholder="Minimum 8 characters"
              minLength={8}
              required
            />
          </label>

          <button type="submit" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign in'}
          </button>
        </form>

        {error ? <p className="error-message">{error}</p> : null}
      </section>
    </main>
  );
}
