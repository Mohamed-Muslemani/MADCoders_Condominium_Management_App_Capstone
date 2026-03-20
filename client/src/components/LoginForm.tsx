import { useState } from 'react';
import './LoginForm.css';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setErrorMessage('');
    setIsLoading(true);

    try {
      const response = await fetch('http://localhost:3000/auth/login', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          email,
          password,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Login failed');
      }

      // Adjust this depending on your backend response shape
      const token = data.access_token || data.token;

      if (!token) {
        throw new Error('No token returned from API');
      }

      if (rememberMe) {
        localStorage.setItem('token', token);
      } else {
        sessionStorage.setItem('token', token);
      }

      console.log('Login successful:', data);

      // Temporary success behavior
      alert('Login successful');

      // Later you can redirect here
      // window.location.href = '/dashboard';
    } catch (error) {
      if (error instanceof Error) {
        setErrorMessage(error.message);
      } else {
        setErrorMessage('Something went wrong during login');
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="w-full max-w-md rounded-[28px] bg-white shadow-[0_10px_35px_rgba(0,0,0,0.08)] p-7">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="flex h-11 w-11 items-center justify-center rounded-full bg-[#0d2b66] text-lg font-bold text-white">
            CM
          </div>

          <div>
            <h2 className="m-0 text-[22px] font-bold text-gray-800">CondoManager</h2>
            <p className="m-0 text-sm text-gray-500">Building Portal</p>
          </div>
        </div>

        <div className="rounded-full border border-gray-200 bg-gray-50 px-4 py-2 text-sm text-gray-500">
          🔒 Secure
        </div>
      </div>

      <h1 className="mb-2 text-4xl font-bold text-gray-900">Sign in</h1>
      <p className="mb-6 text-base leading-6 text-gray-500">
        Welcome back. Please enter your credentials to continue.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="mb-4">
          <label className="mb-2 block font-semibold text-gray-700">Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className="w-full rounded-2xl border border-gray-300 px-4 py-4 text-base outline-none"
            required
          />
        </div>

        <div className="mb-4">
          <label className="mb-2 block font-semibold text-gray-700">Password</label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="w-full rounded-2xl border border-gray-300 px-4 py-4 pr-24 text-base outline-none"
              required
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-full border border-gray-300 bg-gray-50 px-4 py-2 text-sm"
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Remember me
          </label>

          <a href="#" className="text-sm font-semibold text-blue-600 no-underline">
            Forgot password?
          </a>
        </div>

        {errorMessage && (
          <div className="mb-4 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-600">
            {errorMessage}
          </div>
        )}

        <button
          type="submit"
          disabled={isLoading}
          className="mb-5 w-full rounded-full bg-blue-600 py-4 text-base font-bold text-white disabled:opacity-60"
        >
          {isLoading ? 'Signing in...' : 'Sign in'}
        </button>
      </form>

      <p className="text-sm text-gray-500">
        Need access?{' '}
        <a href="#" className="font-semibold text-blue-600 no-underline">
          Contact administrator
        </a>
      </p>
    </div>
  );
}