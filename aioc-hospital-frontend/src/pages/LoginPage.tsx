import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Cross, AlertCircle, Loader2 } from 'lucide-react';
import { HospitalBackground } from '../components/HospitalBackground';
import { authService } from '../services/auth';

interface LoginPageProps {
  mode: 'user' | 'admin';
}

export function LoginPage({ mode }: LoginPageProps) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const isAdmin = mode === 'admin';
  const title = isAdmin ? 'Admin Portal' : 'Staff Portal';
  const subtitle = isAdmin
    ? 'Hospital Administration & Configuration'
    : 'Hospital Management System';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      if (isAdmin) {
        await authService.loginAdmin(username, password);
        navigate('/admin/dashboard');
      } else {
        await authService.loginUser(username, password);
        navigate('/dashboard');
      }
    } catch {
      setError('Invalid username or password. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative min-h-screen flex items-center justify-center p-4">
      <HospitalBackground />

      <div className="relative z-10 w-full max-w-md">
        {/* Card */}
        <div
          className="rounded-2xl p-8 shadow-2xl"
          style={{ background: 'rgba(255,255,255,0.97)', backdropFilter: 'blur(20px)' }}
        >
          {/* Logo / Header */}
          <div className="text-center mb-8">
            <div
              className="inline-flex items-center justify-center rounded-2xl mb-4"
              style={{
                width: 64,
                height: 64,
                background: isAdmin
                  ? 'linear-gradient(135deg, #0f2d4f, #0d7377)'
                  : 'linear-gradient(135deg, #1a4a7a, #14a085)',
              }}
            >
              <Cross size={28} className="text-white" />
            </div>
            <h1 className="text-2xl font-bold text-gray-800 mb-1">{title}</h1>
            <p className="text-gray-500 text-sm">{subtitle}</p>

            {isAdmin && (
              <span
                className="inline-block mt-2 px-3 py-1 rounded-full text-xs font-semibold text-white"
                style={{ background: 'linear-gradient(90deg, #0f2d4f, #0d7377)' }}
              >
                ADMINISTRATOR ACCESS
              </span>
            )}
          </div>

          {/* Divider */}
          <div
            className="h-0.5 mb-6 rounded-full"
            style={{
              background: isAdmin
                ? 'linear-gradient(90deg, #0f2d4f22, #0d737744, #0f2d4f22)'
                : 'linear-gradient(90deg, #1a4a7a22, #14a08544, #1a4a7a22)',
            }}
          />

          {/* Error */}
          {error && (
            <div className="flex items-center gap-2 p-3 mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Username
              </label>
              <input
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder={isAdmin ? 'admin' : 'username'}
                required
                autoFocus
                className="w-full px-4 py-3 rounded-xl border border-gray-200 text-gray-800 placeholder-gray-400 text-sm outline-none transition-all duration-150 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1.5">
                Password
              </label>
              <div className="relative">
                <input
                  type={showPassword ? 'text' : 'password'}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  required
                  className="w-full px-4 py-3 pr-11 rounded-xl border border-gray-200 text-gray-800 placeholder-gray-400 text-sm outline-none transition-all duration-150 focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((s) => !s)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600 transition-colors"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-3 rounded-xl font-semibold text-white text-sm transition-all duration-150 disabled:opacity-70 disabled:cursor-not-allowed flex items-center justify-center gap-2"
              style={{
                background: loading
                  ? '#94a3b8'
                  : isAdmin
                  ? 'linear-gradient(135deg, #0f2d4f, #0d7377)'
                  : 'linear-gradient(135deg, #1a4a7a, #14a085)',
              }}
            >
              {loading && <Loader2 size={16} className="animate-spin" />}
              {loading ? 'Signing in…' : 'Sign In'}
            </button>
          </form>

          {/* Footer */}
          <p className="text-center text-xs text-gray-400 mt-6">
            AIOC Hospital Management System &copy; {new Date().getFullYear()}
          </p>
        </div>

        {/* Switch portal link */}
        <p className="text-center text-sm text-white/70 mt-4">
          {isAdmin ? (
            <>
              Staff portal?{' '}
              <a href="/login" className="text-white font-medium hover:underline">
                Sign in here
              </a>
            </>
          ) : (
            <>
              Administrator?{' '}
              <a href="/admin" className="text-white font-medium hover:underline">
                Admin portal
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  );
}
