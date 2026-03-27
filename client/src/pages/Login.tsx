import LoginForm from '../components/LoginForm';
import './Login.css';

export default function Login() {
  return (
    <div className="login-page">
      <div className="login-background-lines"></div>
      <LoginForm />
    </div>
  );
}