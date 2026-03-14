import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { LoginForm } from '../components/LoginForm';
import { useAuth } from '../context/AuthContext';

export function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setToken } = useAuth();

  async function handleLogin(values: { email: string; password: string }) {
    try {
      setLoading(true);
      setError('');
      const result = await login(values);
      setToken(result.accessToken);
      navigate('/units', { replace: true });
    } catch {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="page auth-page">
      <LoginForm loading={loading} error={error} onSubmit={handleLogin} />
    </main>
  );
}
