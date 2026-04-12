import { useState } from 'react';
import { isAxiosError } from 'axios';
import { useNavigate } from 'react-router-dom';
import { login } from '../api/auth';
import { LoginForm } from '../components/LoginForm/LoginForm';
import { useAuth } from '../context/auth-provider';

export function LoginPage() {
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { setSession } = useAuth();

  function getLoginErrorMessage(error: unknown) {
    if (!isAxiosError(error)) {
      return 'Unable to sign in right now. Please try again.';
    }

    if (error.response?.status === 401 || error.response?.status === 403) {
      return 'Invalid email or password.';
    }

    if (error.response?.status && error.response.status >= 500) {
      return 'The server is having trouble right now. Please try again.';
    }

    if (error.request) {
      return 'Unable to reach the server. Please try again.';
    }

    return 'Unable to sign in right now. Please try again.';
  }

  async function handleLogin(values: { email: string; password: string }) {
    try {
      setLoading(true);
      setError('');
      const result = await login(values);
      setSession(result.accessToken, result.user.role);
      navigate(result.user.role === 'OWNER' ? '/owner' : '/users', {
        replace: true,
      });
    } catch (error) {
      setError(getLoginErrorMessage(error));
    } finally {
      setLoading(false);
    }
  }

  return <LoginForm loading={loading} error={error} onSubmit={handleLogin} />;
}
