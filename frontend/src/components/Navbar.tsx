import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';
import { LogOut, Calendar, Shield, BookOpen, Layers } from 'lucide-react';

export const Navbar: React.FC = () => {
  const { user, logout } = useAuth();
  const location = useLocation();

  if (!user) return null;

  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="bg-[#FAF5EC] border-b border-[#E8DCCE] sticky top-0 z-40">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between h-16">
          {/* Temple Branding Title */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#7A1C23] text-[#FAF5EC] flex items-center justify-center font-serif text-lg shadow-sm border border-[#C86A1B]/40">
              ॐ
            </div>
            <div>
              <div className="text-sm sm:text-base font-bold text-[#7A1C23] tracking-wide flex items-center gap-2">
                Sri Sharada Peetham Temple
                <span className="hidden md:inline text-xs font-normal text-[#C86A1B] font-serif">
                  (శ్రీ శారదా పీఠం)
                </span>
              </div>
              <div className="text-[11px] text-[#61544B]">
                Devotional Seva Booking & Gothra Recording System
              </div>
            </div>
          </div>

          {/* Navigation Links */}
          <nav className="hidden md:flex items-center gap-2">
            {(user.role === 'admin' || user.role === 'booking_staff') && (
              <>
                <Link
                  to="/counter"
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    isActive('/counter')
                      ? 'bg-[#7A1C23] text-white shadow-sm'
                      : 'text-[#2D2520] hover:bg-[#F3ECE0]'
                  }`}
                >
                  <Layers className="w-4 h-4" />
                  Booking Counter
                </Link>
                <Link
                  to="/bookings"
                  className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                    isActive('/bookings')
                      ? 'bg-[#7A1C23] text-white shadow-sm'
                      : 'text-[#2D2520] hover:bg-[#F3ECE0]'
                  }`}
                >
                  <BookOpen className="w-4 h-4" />
                  Booked Sevas
                </Link>
              </>
            )}

            {user.role === 'admin' && (
              <Link
                to="/admin"
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  isActive('/admin')
                    ? 'bg-[#7A1C23] text-white shadow-sm'
                    : 'text-[#2D2520] hover:bg-[#F3ECE0]'
                }`}
              >
                <Shield className="w-4 h-4" />
                Admin Dashboard
              </Link>
            )}

            {(user.role === 'poojari' || user.role === 'admin') && (
              <Link
                to="/poojari"
                className={`px-3 py-1.5 rounded-md text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                  isActive('/poojari')
                    ? 'bg-[#7A1C23] text-white shadow-sm'
                    : 'text-[#2D2520] hover:bg-[#F3ECE0]'
                }`}
              >
                <Calendar className="w-4 h-4" />
                Poojari Ritual Board
              </Link>
            )}
          </nav>

          {/* User profile & Logout */}
          <div className="flex items-center gap-3">
            <div className="text-right">
              <div className="text-xs font-semibold text-[#2D2520]">{user.name}</div>
              <div className="text-[10px] font-medium text-[#C86A1B] uppercase tracking-wider">
                {user.role === 'booking_staff' ? 'Counter Staff' : user.role}
              </div>
            </div>
            <button
              onClick={logout}
              title="Sign Out"
              className="p-2 rounded-md border border-[#E8DCCE] bg-white hover:bg-red-50 text-[#7A1C23] transition-colors"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>
    </header>
  );
};

