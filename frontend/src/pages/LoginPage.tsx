import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Lock, User as UserIcon, LogIn, AlertCircle } from 'lucide-react';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('staff');
  const [password, setPassword] = useState('Staff@Sringeri123');
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const { login } = useAuth();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setIsSubmitting(true);

    try {
      const loggedUser = await login(username, password);
      if (loggedUser.role === 'admin') {
        navigate('/admin');
      } else if (loggedUser.role === 'poojari') {
        navigate('/poojari');
      } else {
        navigate('/counter');
      }
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check your credentials.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const setPreset = (u: string, p: string) => {
    setUsername(u);
    setPassword(p);
    setError(null);
  };

  return (
    <div className="min-h-screen bg-[#FDFBF7] flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center">
        {/* Sacred Temple Motif */}
        <div className="mx-auto w-16 h-16 rounded-full bg-[#7A1C23] text-[#FAF5EC] flex items-center justify-center font-serif text-3xl shadow-md border-2 border-[#C86A1B]/40">
          ॐ
        </div>
        <h2 className="mt-4 text-2xl font-bold tracking-tight text-[#7A1C23]">
          Sri Sharada Peetham Temple
        </h2>
        <p className="mt-1 text-xs text-[#C86A1B] font-serif">
          శ్రీ శారదా పీఠం • శృంగేరి జగద్గురు శంకరాచార్య మహాసంస్థానం
        </p>
        <p className="mt-1 text-sm text-gray-600">
          Devotional Seva Booking & Gothra Recording System
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md px-4">
        <div className="bg-white py-8 px-6 shadow-md rounded-xl border border-[#E8DCCE] sm:px-10">
          <form className="space-y-5" onSubmit={handleSubmit}>
            {error && (
              <div className="p-3 rounded-md bg-red-50 border border-red-200 text-xs text-red-700 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 text-red-600 flex-shrink-0" />
                <span>{error}</span>
              </div>
            )}

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A1C23]">
                Username
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <UserIcon className="h-4 w-4" />
                </div>
                <input
                  type="text"
                  required
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#E8DCCE] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C86A1B] text-[#2D2520]"
                  placeholder="Enter username"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold uppercase tracking-wider text-[#7A1C23]">
                Password
              </label>
              <div className="mt-1 relative rounded-md shadow-sm">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                  <Lock className="h-4 w-4" />
                </div>
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  className="block w-full pl-9 pr-3 py-2 text-sm bg-white border border-[#E8DCCE] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C86A1B] text-[#2D2520]"
                  placeholder="Enter password"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full flex justify-center items-center gap-2 py-2.5 px-4 border border-transparent rounded-md shadow-sm text-sm font-semibold text-white bg-[#7A1C23] hover:bg-[#5C1217] focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-[#7A1C23] disabled:opacity-50 transition-colors"
            >
              <LogIn className="w-4 h-4" />
              {isSubmitting ? 'Signing In...' : 'Sign In to Counter'}
            </button>
          </form>

          {/* Quick Preset Selector for Easy Testing & Multi-role Access */}
          <div className="mt-6 pt-5 border-t border-[#E8DCCE]">
            <p className="text-[11px] font-semibold text-gray-500 uppercase tracking-wider text-center mb-3">
              Quick Role Presets
            </p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => setPreset('staff', 'Staff@Sringeri123')}
                className="px-2 py-1.5 border border-[#E8DCCE] bg-[#FAF5EC] hover:bg-[#F3ECE0] rounded text-[11px] font-medium text-[#7A1C23] text-center"
              >
                Counter Staff
              </button>
              <button
                type="button"
                onClick={() => setPreset('admin', 'Admin@Sringeri123')}
                className="px-2 py-1.5 border border-[#E8DCCE] bg-[#FAF5EC] hover:bg-[#F3ECE0] rounded text-[11px] font-medium text-[#7A1C23] text-center"
              >
                Admin
              </button>
              <button
                type="button"
                onClick={() => setPreset('poojari', 'Poojari@Sringeri123')}
                className="px-2 py-1.5 border border-[#E8DCCE] bg-[#FAF5EC] hover:bg-[#F3ECE0] rounded text-[11px] font-medium text-[#7A1C23] text-center"
              >
                Poojari
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

