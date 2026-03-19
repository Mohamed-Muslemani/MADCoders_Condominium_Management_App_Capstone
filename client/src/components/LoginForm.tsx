import { useState } from 'react';
import './LoginForm.css';

export default function LoginForm() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(false);

  const handleSubmit = (e: { preventDefault: () => void; }) => {
    e.preventDefault();
    console.log({ email, password, rememberMe });
  };

  return (
    <div className="login-card">
      <div className="login-card-header">
        <div className="brand-section">
          <div className="brand-circle">CM</div>
          <div>
            <h2 className="brand-title">CondoManager</h2>
            <p className="brand-subtitle">Building Portal</p>
          </div>
        </div>

        <div className="secure-badge">🔒 Secure</div>
      </div>

      <h1 className="login-title">Sign in</h1>
      <p className="login-subtitle">
        Welcome back. Please enter your credentials to continue.
      </p>

      <form onSubmit={handleSubmit}>
        <div className="form-group">
          <label>Email</label>
          <input
            type="email"
            placeholder="you@example.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
          />
        </div>

        <div className="form-group">
          <label>Password</label>
          <div className="password-wrapper">
            <input
              type={showPassword ? 'text' : 'password'}
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
            />
            <button
              type="button"
              className="show-btn"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? 'Hide' : 'Show'}
            </button>
          </div>
        </div>

        <div className="login-options">
          <label className="remember-me">
            <input
              type="checkbox"
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
            />
            Remember me
          </label>

          <a href="#" className="forgot-link">
            Forgot password?
          </a>
        </div>

        <button type="submit" className="sign-in-btn">
          Sign in
        </button>
      </form>

      <p className="login-footer">
        Need access? <a href="#">Contact administrator</a>
      </p>
    </div>
  );
}