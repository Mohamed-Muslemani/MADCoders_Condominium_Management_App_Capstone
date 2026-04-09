import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { LoginForm } from '../components/LoginForm/LoginForm';
import { useAuth } from '../context/auth-provider';

export function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setSession } = useAuth();

  async function handleLogin(values: { email: string; password: string }) {
    try {
      setLoading(true);
      setError('');
      const result = await login(values);
      setSession(result.accessToken, result.user.role);
      navigate(result.user.role === 'OWNER' ? '/owner' : '/users', {
        replace: true,
      });
    } catch {
      setError('Invalid credentials');
    } finally {
      setLoading(false);
    }
  }

  return <LoginForm loading={loading} error={error} onSubmit={handleLogin} />;
}
