import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { Lock, User as UserIcon, AlertCircle, Sparkles, Eye, EyeOff } from 'lucide-react';
import { playTempleBell } from '../utils/templeAudio.js';

export const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
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
      // Play authentic 3-second temple bell chime
      playTempleBell(0.6);
      if (loggedUser.role === 'admin') {
        navigate('/admin');
      } else if (loggedUser.role === 'poojari') {
        navigate('/poojari');
      } else {
        navigate('/counter');
      }
    } catch (err: any) {
      setError(err.message || 'లాగిన్ విఫలమైంది. దయచేసి యూజర్‌నేమ్ మరియు పాస్‌వర్డ్ సరిచూసుకోండి.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col justify-center items-center py-8 px-4 sm:px-6 relative overflow-hidden">
      {/* Sanctum Glow Aura Background */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(ellipse_60%_50%_at_50%_40%,rgba(224,174,24,0.15),transparent_70%)]" />

      {/* Main Temple Sanctum Card */}
      <div className="w-full max-w-md relative z-10 glass-surface p-6 sm:p-8 rounded-[32px] border border-amber-400/50 shadow-[0_15px_45px_-5px_rgba(122,28,35,0.12)]">
        
        {/* Sacred Shloka Archway Inscription */}
        <div className="flex items-center justify-between text-[#7A1C23] font-serif text-[11px] font-bold border-b border-[#E8DCCE]/70 pb-2.5 mb-3 tracking-wider">
          <span>॥ శ్రీ గురుభ్యో నమః ॥</span>
          <span>॥ శ్రీ శారదాంబాయై నమః ॥</span>
        </div>

        {/* Hanging Diyas & Golden Om Relief */}
        <div className="flex items-center justify-between px-3 my-2">
          <div className="text-3xl animate-pulse drop-shadow-[0_0_12px_rgba(224,174,24,0.8)]">
            🪔
          </div>

          <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[#E0AE18] via-[#B8860B] to-[#7A1C23] text-white flex items-center justify-center font-serif text-3xl shadow-md border-2 border-amber-300/70 scale-105 transform hover:scale-110 transition-transform">
            ॐ
          </div>

          <div className="text-3xl animate-pulse drop-shadow-[0_0_12px_rgba(224,174,24,0.8)]">
            🪔
          </div>
        </div>

        {/* Temple Title & Tradition */}
        <div className="text-center space-y-1 mb-5">
          <h1 className="text-lg sm:text-xl font-bold text-[#7A1C23] font-serif tracking-wide leading-tight">
            శ్రీ శారదా పీఠం దేవస్థానం
          </h1>
          <p className="text-xs font-semibold text-[#C86A1B] font-serif">
            శృంగేరి జగద్గురు శంకరాచార్య మహాసంస్థానం
          </p>
          <div className="h-0.5 w-20 bg-gradient-to-r from-transparent via-[#E0AE18] to-transparent mx-auto my-1.5" />
          <p className="text-[11px] text-gray-600 font-medium">
            పూజా సేవా కౌంటర్ & సంకల్ప నిర్వహణ ప్రవేశం
          </p>
        </div>

        {/* Login Form */}
        <form className="space-y-3.5" onSubmit={handleSubmit}>
          {error && (
            <div className="p-3 rounded-xl bg-red-50/90 border border-red-200 text-xs text-red-700 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 text-red-600 shrink-0" />
              <span>{error}</span>
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-[#7A1C23] mb-1 font-serif">
              వినియోగదారు పేరు (Username)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <UserIcon className="h-4 w-4" />
              </div>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                className="block w-full pl-9 pr-3 py-2 text-xs bg-white/90 border border-[#E8DCCE] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C86A1B] text-[#2D2520] font-bold shadow-2xs"
                placeholder="యూజర్‌నేమ్ నమోదు చేయండి"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-bold text-[#7A1C23] mb-1 font-serif">
              రహస్య సంకేతం (Password)
            </label>
            <div className="relative">
              <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-gray-400">
                <Lock className="h-4 w-4" />
              </div>
              <input
                type={showPassword ? 'text' : 'password'}
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="block w-full pl-9 pr-9 py-2 text-xs bg-white/90 border border-[#E8DCCE] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C86A1B] text-[#2D2520] font-bold shadow-2xs"
                placeholder="పాస్‌వర్డ్ నమోదు చేయండి"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600 transition-colors"
                title={showPassword ? 'పాస్‌వర్డ్ దాచండి' : 'పాస్‌వర్డ్ చూడండి'}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {/* Submit Button with Sacred Temple Accent */}
          <button
            type="submit"
            disabled={isSubmitting}
            className="w-full py-2.5 px-4 rounded-xl shadow-md text-xs font-bold text-white bg-gradient-to-r from-[#7A1C23] via-[#912028] to-[#7A1C23] hover:brightness-110 active:scale-[0.99] transition-all flex items-center justify-center gap-2 border border-amber-300/40"
          >
            {isSubmitting ? (
              <span className="flex items-center gap-2">
                <span className="animate-spin text-sm">⏳</span>
                పరిశీలిస్తున్నాము...
              </span>
            ) : (
              <span className="flex items-center gap-1.5 font-serif">
                <span>🔔</span>
                <span>ప్రవేశించుము (Sign In)</span>
              </span>
            )}
          </button>
        </form>

        {/* Sacred Traditional Benediction */}
        <div className="mt-5 pt-3.5 border-t border-[#E8DCCE]/70 text-center text-xs text-[#7A1C23] font-serif font-bold">
          సర్వే జనాః సుఖినో భవంతు • సమస్త సన్మంగళాని భవంతు
        </div>
      </div>
    </div>
  );
};
