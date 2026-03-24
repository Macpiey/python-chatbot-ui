import React, { useEffect, useState } from 'react';
import { signIn, signOut } from 'aws-amplify/auth';
import { FiEye, FiEyeOff } from 'react-icons/fi';
import authService from '../services/authService';

const LoginScreen = ({ onAuthSuccess }) => {
  const [authState, setAuthState] = useState(authService.getAuthState());
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [showPassword, setShowPassword] = useState(false);

  useEffect(() => {
    // Subscribe to auth state changes
    const unsubscribe = authService.addListener((newAuthState) => {
      setAuthState(newAuthState);

      // If user is authenticated, call the success callback but keep loading state
      if (newAuthState.isAuthenticated && onAuthSuccess) {
        // Keep loading state active until redirect happens
        onAuthSuccess(newAuthState);
      }
    });

    // Cleanup subscription on unmount
    return unsubscribe;
  }, [onAuthSuccess]);

  const handleSignIn = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError('');

    try {
      await signIn({
        username: username,
        password: password
      });

      // The auth service will handle the sign-in event via Hub listener
      console.log('Sign in successful');
      // Don't reset loading state on success - keep it until redirect happens
    } catch (error) {
      console.error('Sign in error:', error);

      // If user is already authenticated, sign them out first and try again
      if (error.name === 'UserAlreadyAuthenticatedException') {
        try {
          console.log('User already authenticated, signing out first...');
          await signOut();
          // Wait a moment for the sign out to complete
          setTimeout(async () => {
            try {
              await signIn({
                username: username,
                password: password
              });
              console.log('Sign in successful after sign out');
            } catch (retryError) {
              console.error('Retry sign in error:', retryError);
              setError(retryError.message || 'Failed to sign in. Please check your credentials.');
              setIsLoading(false);
            }
          }, 1000);
          return;
        } catch (signOutError) {
          console.error('Sign out error:', signOutError);
          setError('Authentication error. Please refresh the page and try again.');
          setIsLoading(false);
        }
      } else {
        setError(error.message || 'Failed to sign in. Please check your credentials.');
        setIsLoading(false);
      }
    }
  };



  return (
    <div className="login-screen">
      <div className="login-container">
        {/* Header with App Title */}
        <div className="login-header">
          <div className="login-title-container">
            <h1 className="login-title">Commodities AI</h1>
          </div>
          <p className="login-subtitle">by Kalya Labs</p>
        </div>

        {/* Login Form */}
        <div className="login-form-container">
          <form onSubmit={handleSignIn} className="login-form">
            {/* Username Field */}
            <div className="form-group">
              <label className="form-label">Username</label>
              <div className="input-wrapper-login">
                <input
                  type="text"
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="username"
                  required
                  className="form-input"
                  disabled={isLoading}
                />
              </div>
            </div>

            {/* Password Field */}
            <div className="form-group">
              <label className="form-label">Password</label>
              <div className="input-wrapper-login password-wrapper">
                <input
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="form-input"
                  disabled={isLoading}
                />
                <button
                  type="button"
                  className="password-toggle"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isLoading}
                >
                  {showPassword ? <FiEyeOff size={18} /> : <FiEye size={18} />}
                </button>
              </div>
            </div>

            {/* Error Message */}
            {error && (
              <div className="error-message">
                {error}
              </div>
            )}

            {/* Sign In Button */}
            <button
              type="submit"
              disabled={isLoading || !username || !password}
              className={`signin-button ${isLoading ? 'loading' : ''}`}
            >
              <span>{isLoading ? 'Signing In...' : 'Sign In'}</span>
              {!isLoading && <span className="signin-arrow">→</span>}
            </button>
          </form>
        </div>
      </div>

      <style>{`
        .login-screen {
          min-height: 100vh;
          display: flex;
          align-items: center;
          justify-content: center;
          background: var(--gray-50);
          padding: 2rem;
          font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', sans-serif;
        }

        .login-container {
          width: 100%;
          max-width: 420px;
          background: var(--white);
          border-radius: var(--radius-2xl);
          box-shadow: var(--shadow-2xl);
          overflow: hidden;
          border: 1px solid var(--gray-200);
        }

        .login-header {
          text-align: center;
          padding: 3rem 2rem 2rem 2rem;
          background: var(--white);
          border-bottom: 1px solid var(--gray-100);
        }

        .login-title-container {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 12px;
          margin-bottom: 0.5rem;
        }

        .login-logo {
          width: 32px;
          height: 32px;
          border-radius: 6px;
          flex-shrink: 0;
        }

        .login-title {
          margin: 0;
          font-size: 2rem;
          font-weight: 600;
          letter-spacing: -0.025em;
          background: linear-gradient(135deg, var(--primary) 0%, var(--accent) 100%);
          -webkit-background-clip: text;
          -webkit-text-fill-color: transparent;
          background-clip: text;
        }

        .login-subtitle {
          margin: 0;
          font-size: 0.9rem;
          color: var(--gray-500);
          font-weight: 400;
        }

        .login-form-container {
          padding: 2rem;
        }

        .login-form {
          display: flex;
          flex-direction: column;
          gap: 1.5rem;
        }

        .form-group {
          display: flex;
          flex-direction: column;
          gap: 0.5rem;
        }

        .form-label {
          font-size: 0.9rem;
          font-weight: 500;
          color: var(--gray-700);
          margin-bottom: 0.5rem;
        }

        .input-wrapper-login {
          position: relative;
          display: flex;
          align-items: center;
        }

        .form-input {
          width: 100%;
          padding: 1rem 1.25rem;
          border: 2px solid var(--gray-200);
          border-radius: var(--radius-xl);
          background: var(--gray-50);
          color: var(--gray-900);
          font-size: 1rem;
          font-weight: 400;
          transition: all 0.2s ease;
          box-sizing: border-box;
        }

        .form-input:focus {
          outline: none;
          border-color: var(--primary);
          background: var(--white);
          box-shadow: 0 0 0 3px rgba(139, 92, 246, 0.1);
        }

        .form-input::placeholder {
          color: var(--gray-400);
          font-weight: 400;
        }

        .form-input:disabled {
          background: var(--gray-100);
          color: var(--gray-500);
          cursor: not-allowed;
          opacity: 0.7;
        }

        .password-wrapper {
          position: relative;
        }

        .password-toggle {
          position: absolute;
          right: 1rem;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          cursor: pointer;
          padding: 0.25rem;
          border-radius: var(--radius-sm);
          color: var(--gray-400);
          transition: all 0.2s ease;
          font-size: 1.1rem;
        }

        .password-toggle:hover {
          color: var(--gray-600);
          background: var(--gray-100);
        }

        .password-toggle:disabled {
          cursor: not-allowed;
          opacity: 0.5;
        }

        .error-message {
          background: linear-gradient(135deg, rgba(220, 38, 38, 0.1) 0%, rgba(239, 68, 68, 0.1) 100%);
          color: var(--error);
          padding: 0.75rem 1rem;
          border-radius: var(--radius-lg);
          font-size: 0.9rem;
          font-weight: 500;
          border: 1px solid rgba(220, 38, 38, 0.2);
          margin-top: -0.5rem;
        }

        .signin-button {
          width: 100%;
          padding: 1rem 1.5rem;
          background: linear-gradient(135deg, var(--primary) 0%, var(--primary-hover) 100%);
          color: var(--white);
          border: none;
          border-radius: var(--radius-xl);
          font-size: 1rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.2s ease;
          box-shadow: var(--shadow-lg);
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 0.5rem;
          margin-top: 0.5rem;
        }

        .signin-button:hover:not(:disabled) {
          background: linear-gradient(135deg, var(--primary-hover) 0%, var(--primary-pressed) 100%);
          transform: translateY(-1px);
          box-shadow: var(--shadow-xl);
        }

        .signin-button:active:not(:disabled) {
          transform: translateY(0);
          box-shadow: var(--shadow-lg);
        }

        .signin-button:disabled {
          background: var(--gray-300);
          color: var(--gray-500);
          cursor: not-allowed;
          transform: none;
          box-shadow: var(--shadow-sm);
        }

        .signin-button.loading {
          background: var(--gray-300);
          cursor: not-allowed;
        }

        .signin-arrow {
          font-size: 1.2rem;
          transition: transform 0.2s ease;
        }

        .signin-button:hover:not(:disabled) .signin-arrow {
          transform: translateX(2px);
        }

        /* Responsive Design */
        @media (max-width: 480px) {
          .login-screen {
            padding: 1rem;
          }

          .login-container {
            max-width: 100%;
          }

          .login-header {
            padding: 2rem 1.5rem 1.5rem 1.5rem;
          }

          .login-form-container {
            padding: 1.5rem;
          }

          .login-title {
            font-size: 1.75rem;
          }
        }
      `}</style>
    </div>
  );
};

export default LoginScreen;
