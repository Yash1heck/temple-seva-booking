import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { LogOut, Calendar, Shield, BookOpen, Layers, Sparkles, Settings, FileText, CheckSquare } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user || location.pathname === '/login' || location.pathname === '/devotee-booking' || location.pathname === '/book-seva') return null;

  const isActive = (path: string) => location.pathname === path;
  const isTabActive = (tab: string) => location.pathname === '/admin' && (new URLSearchParams(location.search).get('tab') || 'overview') === tab;

  return (
    <>
      {/* Top Header - Apple Glassmorphic Translucent Bar */}
      <header className="glass-surface border-b border-white/70 sticky top-0 z-40">
        <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-14 sm:h-16">
            {/* Temple Branding Title */}
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7A1C23] to-[#551015] text-[#FAF5EC] flex items-center justify-center font-serif text-base shadow-xs border border-[#D4AF37]/40 shrink-0">
                ॐ
              </div>
              <div>
                <div className="text-xs sm:text-base font-bold text-[#7A1C23] tracking-wide flex items-center gap-1.5 font-serif leading-tight">
                  శ్రీ శారదా పీఠం దేవస్థానం
                </div>
                <div className="text-[10px] text-[#61544B] font-medium hidden xs:block">
                  పూజా సేవా బుకింగ్ వ్యవస్థ
                </div>
              </div>
            </div>

            {/* Desktop Navigation Links */}
            <nav className="hidden md:flex items-center gap-1.5">
              {user.role === 'booking_staff' && (
                <>
                  <Link
                    to="/counter"
                    className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                      isActive('/counter')
                        ? 'bg-[#7A1C23] text-white shadow-xs'
                        : 'text-[#2D2520] hover:bg-[#F3ECE0]'
                    }`}
                  >
                    <Layers className="w-4 h-4 text-[#E0AE18]" />
                    సేవా కౌంటర్
                  </Link>
                  <Link
                    to="/bookings"
                    className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                      isActive('/bookings')
                        ? 'bg-[#7A1C23] text-white shadow-xs'
                        : 'text-[#2D2520] hover:bg-[#F3ECE0]'
                    }`}
                  >
                    <BookOpen className="w-4 h-4 text-[#C86A1B]" />
                    నమోదైన సేవలు
                  </Link>
                </>
              )}

              {user.role === 'poojari' && (
                <Link
                  to="/poojari"
                  className={`px-3 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    isActive('/poojari')
                      ? 'bg-[#7A1C23] text-white shadow-xs'
                      : 'text-[#2D2520] hover:bg-[#F3ECE0]'
                  }`}
                >
                  <Sparkles className="w-4 h-4 text-[#E0AE18]" />
                  అర్చక సంకల్ప బోర్డు
                </Link>
              )}

              {user.role === 'admin' && (
                <Link
                  to="/admin"
                  className={`px-3.5 py-2 rounded-lg text-xs font-bold flex items-center gap-1.5 transition-colors ${
                    isActive('/admin')
                      ? 'bg-[#7A1C23] text-white shadow-xs'
                      : 'text-[#2D2520] hover:bg-[#F3ECE0]'
                  }`}
                >
                  <Shield className="w-4 h-4 text-[#C86A1B]" />
                  ఆలయ నిర్వహణ
                </Link>
              )}
            </nav>

            {/* User profile & Logout */}
            <div className="flex items-center gap-2">
              <div className="text-right">
                <div className="text-xs font-bold text-[#2D2520]">{user.name}</div>
                <div className="text-[10px] font-medium text-[#7A1C23] bg-amber-100/70 px-1.5 py-0.2 rounded font-serif">
                  {user.role === 'admin'
                    ? 'నిర్వాహకులు (Admin)'
                    : user.role === 'booking_staff'
                    ? 'కౌంటర్ సిబ్బంది (Staff)'
                    : 'అర్చక బృందం (Poojari)'}
                </div>
              </div>

              {/* Quick Settings Icon for Admin */}
              {user.role === 'admin' && (
                <Link
                  to="/admin?tab=settings"
                  title="ఆలయ అమరికలు & సెట్టింగ్స్"
                  className="p-2 rounded-lg border border-[#E8DCCE] bg-[#FAF5EC] hover:bg-[#F3ECE0] text-[#7A1C23] transition-colors shrink-0"
                >
                  <Settings className="w-4 h-4 text-[#C86A1B]" />
                </Link>
              )}

              <button
                onClick={logout}
                title="లాగౌట్"
                className="p-2 rounded-lg border border-[#E8DCCE] bg-white hover:bg-red-50 text-[#7A1C23] transition-colors shrink-0"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Mobile Floating Glass Tab Bar (Apple iOS 18 style dock) */}
      <div className="md:hidden fixed bottom-3 left-4 right-4 z-50 glass-surface rounded-full border border-white/80 shadow-xl px-3 py-1.5 flex items-center justify-around">
        {/* Counter Staff Mobile Dock */}
        {user.role === 'booking_staff' && (
          <>
            <Link
              to="/counter"
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-lg text-[10px] font-bold transition-all ${
                isActive('/counter')
                  ? 'text-[#7A1C23] bg-amber-100/80 font-extrabold'
                  : 'text-gray-600 hover:text-[#7A1C23]'
              }`}
            >
              <Layers className="w-5 h-5 mb-0.5" />
              కౌంటర్
            </Link>
            <Link
              to="/bookings"
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-lg text-[10px] font-bold transition-all ${
                isActive('/bookings')
                  ? 'text-[#7A1C23] bg-amber-100/80 font-extrabold'
                  : 'text-gray-600 hover:text-[#7A1C23]'
              }`}
            >
              <BookOpen className="w-5 h-5 mb-0.5" />
              బుకింగ్స్
            </Link>
          </>
        )}

        {/* Poojari Mobile Dock */}
        {user.role === 'poojari' && (
          <Link
            to="/poojari"
            className={`flex flex-col items-center justify-center py-1.5 px-4 rounded-lg text-[10px] font-bold transition-all ${
              isActive('/poojari')
                ? 'text-[#7A1C23] bg-amber-100/80 font-extrabold'
                : 'text-gray-600 hover:text-[#7A1C23]'
            }`}
          >
            <Sparkles className="w-5 h-5 mb-0.5" />
            అర్చక బోర్డు
          </Link>
        )}

        {/* High-Frequency Daily Admin Mobile Dock (ONLY Daily Essentials!) */}
        {user.role === 'admin' && (
          <>
            <Link
              to="/admin?tab=overview"
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-[10px] font-bold transition-all ${
                isTabActive('overview')
                  ? 'text-[#7A1C23] bg-amber-100/80 font-extrabold'
                  : 'text-gray-600 hover:text-[#7A1C23]'
              }`}
            >
              <BookOpen className="w-5 h-5 mb-0.5 text-[#7A1C23]" />
              బుకింగ్స్ & పూజలు
            </Link>
            <Link
              to="/admin?tab=reports"
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-[10px] font-bold transition-all ${
                isTabActive('reports')
                  ? 'text-[#7A1C23] bg-amber-100/80 font-extrabold'
                  : 'text-gray-600 hover:text-[#7A1C23]'
              }`}
            >
              <FileText className="w-5 h-5 mb-0.5 text-emerald-700" />
              నేటి వసూళ్లు
            </Link>
            <Link
              to="/admin?tab=closure"
              className={`flex flex-col items-center justify-center py-1.5 px-3 rounded-xl text-[10px] font-bold transition-all ${
                isTabActive('closure')
                  ? 'text-[#7A1C23] bg-amber-100/80 font-extrabold'
                  : 'text-gray-600 hover:text-[#7A1C23]'
              }`}
            >
              <CheckSquare className="w-5 h-5 mb-0.5 text-[#C86A1B]" />
              రోజు ముగింపు
            </Link>
          </>
        )}
      </div>
    </>
  );
};
