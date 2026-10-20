import React, { useState, useEffect, useMemo } from 'react';
import { Booking, Ticket } from '../types.js';
import { apiRequest } from '../api/client.js';
import { TicketPrintModal } from '../components/TicketPrintModal.js';
import { RitualScheduleView } from '../components/RitualScheduleView.js';
import { getTempleToday, formatTempleDateTime, formatTempleDate } from '../utils/date.js';
import { formatCurrency } from '../utils/format.js';
import { toTeluguText, formatTeluguGothram } from '../utils/teluguTransliterate.js';
import { Search, Calendar, RefreshCw, Printer, BookOpen, Layers, Sparkles, ListFilter, CheckCircle, Clock, Zap } from 'lucide-react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext.js';

export const BookedSevasPage: React.FC = () => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [activeView, setActiveView] = useState<'transactions' | 'schedule'>('transactions');
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(getTempleToday());
  const [filterMode, setFilterMode] = useState<'booking_date' | 'scheduled_date' | 'future_only' | 'all'>('booking_date');
  const [ritualStatusFilter, setRitualStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');
  const [isLoading, setIsLoading] = useState(true);
  const [isBatchCompletingAll, setIsBatchCompletingAll] = useState(false);

  const handleAdminBatchCompleteForDate = async () => {
    if (ritualCounts.pending === 0) return;
    const confirmMsg = `శ్రీ శృంగేరి శారదా పీఠం సన్నిధానం:\nతేదీ (${selectedDate}) కు సంబంధించిన మొత్తం ${ritualCounts.pending} పెండింగ్ పూజలను ఒకేసారి పూర్తి చేయాలనుకుంటున్నారా?`;
    if (!window.confirm(confirmMsg)) return;

    setIsBatchCompletingAll(true);
    try {
      await apiRequest('/poojari/batch-complete', {
        method: 'POST',
        body: JSON.stringify({
          target_date: selectedDate
        })
      });
      await loadBookings();
    } catch (err: any) {
      alert(err.message || 'పూజలు నమోదు చేయడం విఫలమైంది');
    } finally {
      setIsBatchCompletingAll(false);
    }
  };

  // Ticket Modal State
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedBookingNumber, setSelectedBookingNumber] = useState('');
  const [selectedBookingTickets, setSelectedBookingTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    loadBookings();
  }, [selectedDate, filterMode]);

  const loadBookings = async () => {
    setIsLoading(true);
    try {
      let url = `/bookings?search=${encodeURIComponent(search.trim())}&limit=100`;
      if (filterMode === 'booking_date') {
        url += `&bookingDate=${selectedDate}`;
      } else if (filterMode === 'scheduled_date') {
        url += `&scheduledDate=${selectedDate}`;
      } else if (filterMode === 'future_only') {
        url += `&futureOnly=true`;
      }
      const data = await apiRequest<Booking[]>(url);
      setBookings(data);
    } catch (err) {
      console.error('Failed to load booked sevas', err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleInspectTickets = async (bookingId: string) => {
    try {
      const details = await apiRequest<any>(`/bookings/${bookingId}`);
      setSelectedBookingNumber(details.booking.booking_number);
      setSelectedBookingTickets(details.tickets);
      setPrintModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'టికెట్ వివరాలు పొందడం విఫలమైంది');
    }
  };

  // Strict ritual date isolation and completion status filtering
  const filteredBookingsList = useMemo<Booking[]>(() => {
    let list = bookings;
    if (filterMode === 'scheduled_date' && selectedDate) {
      list = (list as Booking[]).map(b => {
        const relevantItems = (b.items_summary || []).filter((item: any) =>
          item.scheduled_date === selectedDate || (!item.scheduled_date && selectedDate === getTempleToday())
        );
        return {
          ...b,
          items_summary: relevantItems
        };
      }).filter(b => b.items_summary.length > 0);
    }

    if (ritualStatusFilter === 'completed') {
      list = list.filter(b => Number(b.completed_ticket_count || 0) > 0);
    } else if (ritualStatusFilter === 'pending') {
      list = list.filter(b => Number(b.completed_ticket_count || 0) < Number(b.ticket_count || 1));
    }

    return list;
  }, [bookings, filterMode, selectedDate, ritualStatusFilter]);

  const ritualCounts = useMemo(() => {
    let pending = 0;
    let completed = 0;
    bookings.forEach(b => {
      const isCompleted = Number(b.completed_ticket_count || 0) > 0;
      const isPending = Number(b.completed_ticket_count || 0) < Number(b.ticket_count || 1);
      if (isCompleted) completed++;
      if (isPending) pending++;
    });
    return { all: bookings.length, pending, completed };
  }, [bookings]);

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 pb-32 lg:pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-[#E8DCCE]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🕉️</span>
            <h1 className="text-lg sm:text-2xl font-bold text-[#7A1C23] font-serif">
              నమోదైన పూజా సేవల రికార్డులు
            </h1>
          </div>
          <p className="text-xs text-gray-600 mt-0.5">
            భక్తులు నమోదు చేసుకున్న పూజలు, సంకల్ప కర్త గోత్ర వివరాలు మరియు టికెట్ల పునఃముద్రణ.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/counter"
            className="flex-1 sm:flex-initial flex items-center justify-center gap-1.5 px-3.5 py-2 bg-[#7A1C23] hover:bg-[#5C1217] text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <Layers className="w-4 h-4 text-[#E0AE18]" />
            నూతన బుకింగ్
          </Link>
          <button
            onClick={loadBookings}
            className="flex items-center gap-1 px-3 py-2 bg-[#FAF5EC] border border-[#E8DCCE] text-[#7A1C23] rounded-lg text-xs font-bold hover:bg-[#F3ECE0]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            రిఫ్రెష్
          </button>
        </div>
      </div>

      {/* Main View Mode Switcher: Only visible for Administrators */}
      {isAdmin && (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 mb-5">
          <button
            type="button"
            onClick={() => setActiveView('transactions')}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold transition-all border ${
              activeView === 'transactions'
                ? 'bg-[#7A1C23] text-white border-[#7A1C23] shadow-sm'
                : 'bg-white text-[#7A1C23] border-[#E8DCCE] hover:bg-[#FAF5EC]'
            }`}
          >
            <ListFilter className="w-4 h-4" />
            కౌంటర్ బుకింగ్ రికార్డులు (రసీదుల జాబితా)
          </button>

          <button
            type="button"
            onClick={() => setActiveView('schedule')}
            className={`flex items-center justify-center gap-2 p-3 rounded-xl text-xs font-bold transition-all border ${
              activeView === 'schedule'
                ? 'bg-[#7A1C23] text-white border-[#7A1C23] shadow-sm'
                : 'bg-white text-[#7A1C23] border-[#E8DCCE] hover:bg-[#FAF5EC]'
            }`}
          >
            <Sparkles className="w-4 h-4 text-[#E0AE18]" />
            పూజా సంకల్ప పట్టిక (ఆలయ పూజారుల కొరకు & ముద్రణ)
          </button>
        </div>
      )}

      {isAdmin && activeView === 'schedule' ? (
        <RitualScheduleView
          selectedDate={selectedDate}
          onDateChange={setSelectedDate}
        />
      ) : (
        <>
          {/* Search & Filters */}
          <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#E8DCCE] shadow-xs mb-5 space-y-3">
            <div className="grid grid-cols-1 sm:grid-cols-12 gap-2.5 items-center">
              <div className="sm:col-span-6 relative">
                <input
                  type="text"
                  placeholder="📱 భక్తుని మొబైల్ సంఖ్య (ఉదా: 9848012345) లేదా టికెట్ / పేరు..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadBookings()}
                  className="w-full pl-9 pr-4 py-2 bg-[#FAF5EC]/40 border border-[#E8DCCE] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#C86A1B] text-[#2D2520] font-medium"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              </div>

              <div className="sm:col-span-4 flex items-center gap-2">
                <input
                  type="date"
                  disabled={filterMode === 'all' || filterMode === 'future_only'}
                  value={selectedDate}
                  onChange={(e) => setSelectedDate(e.target.value)}
                  className="flex-1 px-2.5 py-2 bg-white border border-[#E8DCCE] rounded-lg text-xs font-medium text-[#2D2520] disabled:bg-gray-100 disabled:text-gray-400"
                />
                <button
                  type="button"
                  onClick={() => setSelectedDate(getTempleToday())}
                  className="px-3 py-2 bg-[#FAF5EC] border border-[#E8DCCE] rounded-lg text-xs font-bold text-[#7A1C23] hover:bg-[#F3ECE0]"
                >
                  నేడు
                </button>
              </div>

              <div className="sm:col-span-2">
                <button
                  onClick={loadBookings}
                  className="w-full py-2 bg-[#7A1C23] hover:bg-[#5C1217] text-white font-bold rounded-lg text-xs transition-colors"
                >
                  వెతుకుము
                </button>
              </div>
            </div>

            {/* Ultra-Clean Single-Row Horizontal Filter Tracks (Zero Mobile Clutter) */}
            <div className="space-y-1.5 pt-2 border-t border-[#E8DCCE]/60">
              {/* Date Filter Track */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <span className="text-[11px] font-bold text-gray-500 shrink-0 mr-0.5">తేదీ:</span>
                <button
                  type="button"
                  onClick={() => setFilterMode('booking_date')}
                  className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    filterMode === 'booking_date'
                      ? 'bg-[#7A1C23] text-white shadow-xs'
                      : 'bg-[#FAF5EC] text-[#7A1C23] hover:bg-[#F3ECE0] border border-[#E8DCCE]'
                  }`}
                >
                  కౌంటర్ ({selectedDate})
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('scheduled_date')}
                  className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    filterMode === 'scheduled_date'
                      ? 'bg-[#7A1C23] text-white shadow-xs'
                      : 'bg-[#FAF5EC] text-[#7A1C23] hover:bg-[#F3ECE0] border border-[#E8DCCE]'
                  }`}
                >
                  సంకల్ప దినం
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('future_only')}
                  className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    filterMode === 'future_only'
                      ? 'bg-[#7A1C23] text-white shadow-xs'
                      : 'bg-[#FAF5EC] text-[#7A1C23] hover:bg-[#F3ECE0] border border-[#E8DCCE]'
                  }`}
                >
                  ముందస్తు
                </button>
                <button
                  type="button"
                  onClick={() => setFilterMode('all')}
                  className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    filterMode === 'all'
                      ? 'bg-[#7A1C23] text-white shadow-xs'
                      : 'bg-[#FAF5EC] text-[#7A1C23] hover:bg-[#F3ECE0] border border-[#E8DCCE]'
                  }`}
                >
                  అన్ని రికార్డులు
                </button>
              </div>

              {/* Ritual Completion Status Track */}
              <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5">
                <span className="text-[11px] font-bold text-gray-500 shrink-0 mr-0.5">స్థితి:</span>
                <button
                  type="button"
                  onClick={() => setRitualStatusFilter('all')}
                  className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    ritualStatusFilter === 'all'
                      ? 'bg-[#C86A1B] text-white shadow-xs'
                      : 'bg-white text-gray-700 hover:bg-gray-50 border border-[#E8DCCE]'
                  }`}
                >
                  అన్నీ ({ritualCounts.all})
                </button>
                <button
                  type="button"
                  onClick={() => setRitualStatusFilter('pending')}
                  className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    ritualStatusFilter === 'pending'
                      ? 'bg-amber-600 text-white shadow-xs'
                      : 'bg-amber-50 text-amber-900 hover:bg-amber-100 border border-amber-300'
                  }`}
                >
                  ⏳ పెండింగ్ ({ritualCounts.pending})
                </button>
                <button
                  type="button"
                  onClick={() => setRitualStatusFilter('completed')}
                  className={`shrink-0 whitespace-nowrap px-2.5 py-1 rounded-lg text-[11px] font-bold transition-colors ${
                    ritualStatusFilter === 'completed'
                      ? 'bg-emerald-700 text-white shadow-xs'
                      : 'bg-emerald-50 text-emerald-900 hover:bg-emerald-100 border border-emerald-300'
                  }`}
                >
                  ★ పూర్తయినవి ({ritualCounts.completed})
                </button>

                {isAdmin && ritualCounts.pending > 0 && (
                  <button
                    type="button"
                    disabled={isBatchCompletingAll}
                    onClick={handleAdminBatchCompleteForDate}
                    className="shrink-0 whitespace-nowrap ml-auto px-2.5 py-1 bg-gradient-to-r from-[#7A1C23] to-[#5C1217] hover:brightness-110 active:scale-95 text-white rounded-lg text-[11px] font-bold shadow-2xs flex items-center gap-1 transition-all border border-amber-300/40"
                  >
                    <Zap className="w-3 h-3 text-amber-300" />
                    <span>{isBatchCompletingAll ? 'పూర్తవుతున్నాయి...' : `నేటి అన్ని పెండింగ్ పూజలను పూర్తి చేయండి (${ritualCounts.pending})`}</span>
                  </button>
                )}
              </div>
            </div>
          </div>

          {/* Bookings Display */}
          {isLoading ? (
            <div className="bg-white p-8 rounded-xl border border-[#E8DCCE] text-center text-xs text-gray-500">
              పూజా బుకింగ్‌ల వివరాలు లోడ్ అవుతున్నాయి...
            </div>
          ) : filteredBookingsList.length === 0 ? (
            <div className="bg-white p-8 rounded-xl border border-[#E8DCCE] text-center text-xs text-gray-500 space-y-2">
              <BookOpen className="w-8 h-8 text-gray-300 mx-auto" />
              <div className="font-bold text-[#7A1C23] text-sm">ఎటువంటి బుకింగ్‌లు లభించలేదు</div>
              <div>తేదీ లేదా వెతికే వివరాలను మార్చి మళ్లీ ప్రయత్నించండి.</div>
            </div>
          ) : (
            <>
              {/* Mobile View: High-Priority Responsive Cards */}
              <div className="md:hidden space-y-2.5">
                {filteredBookingsList.map((b) => (
                  <div
                    key={b.id}
                    className="glass-surface-interactive p-3.5 rounded-2xl border border-white/80 shadow-xs space-y-2"
                  >
                    <div className="flex items-center justify-between border-b border-[#E8DCCE] pb-2">
                      <div>
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="font-mono font-bold text-sm text-[#7A1C23]">
                            {b.booking_number}
                          </span>
                          {b.payer_mobile && (
                            <span className="font-mono text-[11px] font-bold text-amber-900 bg-amber-50 px-1.5 py-0.2 rounded border border-amber-200">
                              📱 {b.payer_mobile}
                            </span>
                          )}
                        </div>
                        <div className="text-[10px] text-gray-500 mt-0.5">
                          {formatTempleDateTime(b.created_at)}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-sm font-bold text-[#7A1C23]">
                          ₹{formatCurrency(b.total_amount)}
                        </div>
                        <div className="flex items-center gap-1 justify-end mt-0.5">
                          <span className="text-[10px] font-semibold text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200">
                            {b.payment_method === 'cash' ? 'నగదు' : 'యూపీఐ'}
                          </span>
                          {b.completed_ticket_count !== undefined && (
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded border ${
                              b.completed_ticket_count >= (b.ticket_count || 1)
                                ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                : b.completed_ticket_count > 0
                                ? 'bg-amber-100 text-amber-900 border-amber-300'
                                : 'bg-gray-100 text-gray-700 border-gray-300'
                            }`}>
                              {b.completed_ticket_count >= (b.ticket_count || 1)
                                ? '★ నిర్వహించబడింది'
                                : b.completed_ticket_count > 0
                                ? `పాక్షికం (${b.completed_ticket_count}/${b.ticket_count})`
                                : 'పెండింగ్'}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-1 text-xs">
                      <div>
                        <span className="text-gray-500">సంకల్ప కర్త:</span>{' '}
                        <strong className="text-[#2D2520]">{toTeluguText(b.ritual_beneficiary_name)}</strong>
                      </div>
                      <div>
                        <span className="text-gray-500">గోత్రం:</span>{' '}
                        <span className="font-medium text-amber-950">{formatTeluguGothram(b.gothra)}</span>
                      </div>
                      {b.family_details && (
                        <div className="text-[11px] text-gray-600">
                          <span className="text-gray-400">కుటుంబం:</span> {toTeluguText(b.family_details)}
                        </div>
                      )}
                      <div className="pt-1">
                        <span className="text-gray-500 font-semibold text-[11px]">పూజలు & నిర్వహణ తేదీలు:</span>
                        {b.items_summary && b.items_summary.length > 0 ? (
                          <div className="mt-1 space-y-1">
                            {b.items_summary.map((item: any, i: number) => (
                              <div key={i} className="flex items-center justify-between text-[11px] bg-[#FAF5EC]/70 p-1.5 rounded border border-[#E8DCCE]">
                                <span className="font-bold text-[#7A1C23]">{item.seva_name} ({item.quantity})</span>
                                <span className={`px-1.5 py-0.5 rounded text-[10px] font-bold ${
                                  item.scheduled_date ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                }`}>
                                  📅 {item.scheduled_date || 'నేటి పూజ'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-emerald-800 bg-emerald-50 px-1.5 py-0.2 rounded border border-emerald-200 text-[10px] font-bold">
                            ⚡ నేటి పూజ
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-[#E8DCCE] flex items-center justify-between">
                      <span className="text-[11px] text-gray-500">
                        {b.ticket_count || 1} సేవా టికెట్లు
                      </span>
                      <button
                        type="button"
                        onClick={() => handleInspectTickets(b.id)}
                        className="px-3 py-1.5 bg-[#FAF5EC] border border-[#E8DCCE] text-[#7A1C23] font-bold rounded-lg text-xs flex items-center gap-1 hover:bg-[#F3ECE0]"
                      >
                        <Printer className="w-3.5 h-3.5 text-[#C86A1B]" />
                        టికెట్లు / ముద్రణ
                      </button>
                    </div>
                  </div>
                ))}
              </div>

              {/* Desktop View: Full Table */}
              <div className="hidden md:block glass-surface rounded-2xl border border-white/80 shadow-xs overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#FAF5EC] text-gray-700 font-bold border-b border-[#E8DCCE]">
                      <tr>
                        <th className="py-3 px-4">బుకింగ్ సంఖ్య</th>
                        <th className="py-3 px-4">మొబైల్ సంఖ్య</th>
                        <th className="py-3 px-4">కౌంటర్ సమయం</th>
                        <th className="py-3 px-4">పూజా నిర్వహణ తేదీ</th>
                        <th className="py-3 px-4">సంకల్ప కర్త</th>
                        <th className="py-3 px-4">గోత్రం</th>
                        <th className="py-3 px-4">మొత్తం రుసుము</th>
                        <th className="py-3 px-4">పూజా స్థితి</th>
                        <th className="py-3 px-4">చెల్లింపు</th>
                        <th className="py-3 px-4 text-right">చర్యలు</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#FAF5EC]">
                      {filteredBookingsList.map((b) => (
                        <tr key={b.id} className="hover:bg-[#FAF5EC]/40 transition-colors">
                          <td className="py-3 px-4 font-mono font-bold text-[#7A1C23]">
                            {b.booking_number}
                            <div className="text-[10px] text-gray-400 font-sans">
                              {b.ticket_count || 1} టికెట్లు
                            </div>
                          </td>
                          <td className="py-3 px-4 font-mono font-bold text-[#7A1C23]">
                            {b.payer_mobile ? (
                              <span className="bg-amber-50 text-amber-900 px-2 py-0.5 rounded border border-amber-200">
                                📱 {b.payer_mobile}
                              </span>
                            ) : (
                              <span className="text-gray-400">—</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-gray-600">
                            {formatTempleDateTime(b.created_at)}
                          </td>
                          <td className="py-3 px-4">
                            {b.items_summary && b.items_summary.length > 0 ? (
                              <div className="space-y-1">
                                {b.items_summary.map((item: any, i: number) => (
                                   <div key={i} className="flex items-center gap-1.5 flex-wrap">
                                     <span className="font-bold text-[#7A1C23] text-xs">{item.seva_name}:</span>
                                     <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                       item.scheduled_date ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                     }`}>
                                       📅 {item.scheduled_date || 'నేటి పూజ'}
                                     </span>
                                   </div>
                                 ))}
                              </div>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                                ⚡ నేటి పూజ
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4 font-semibold text-[#2D2520]">
                            {toTeluguText(b.ritual_beneficiary_name)}
                          </td>
                          <td className="py-3 px-4 font-medium text-amber-950">
                            {formatTeluguGothram(b.gothra)}
                          </td>
                          <td className="py-3 px-4 font-bold text-[#7A1C23]">
                            ₹{formatCurrency(b.total_amount)}
                          </td>
                          <td className="py-3 px-4">
                            {b.completed_ticket_count !== undefined && (
                              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-bold border ${
                                b.completed_ticket_count >= (b.ticket_count || 1)
                                  ? 'bg-emerald-100 text-emerald-900 border-emerald-300'
                                  : b.completed_ticket_count > 0
                                  ? 'bg-amber-100 text-amber-900 border-amber-300'
                                  : 'bg-gray-100 text-gray-700 border-gray-300'
                              }`}>
                                {b.completed_ticket_count >= (b.ticket_count || 1)
                                  ? '★ నిర్వహించబడింది'
                                  : b.completed_ticket_count > 0
                                  ? `పాక్షికం (${b.completed_ticket_count}/${b.ticket_count})`
                                  : 'పెండింగ్'}
                              </span>
                            )}
                          </td>
                          <td className="py-3 px-4">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-emerald-50 text-emerald-800 border border-emerald-200">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              {b.payment_method === 'cash' ? 'నగదు' : 'యూపీఐ'}
                            </span>
                          </td>
                          <td className="py-3 px-4 text-right">
                            <button
                              onClick={() => handleInspectTickets(b.id)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#FAF5EC] hover:bg-[#F3ECE0] border border-[#E8DCCE] text-[#7A1C23] font-bold rounded-lg text-xs transition-colors"
                            >
                              <Printer className="w-3.5 h-3.5 text-[#C86A1B]" />
                              టికెట్లు / ముద్రణ
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </>
          )}
        </>
      )}

      {/* Ticket Modal */}
      <TicketPrintModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        bookingNumber={selectedBookingNumber}
        tickets={selectedBookingTickets}
        onTicketsUpdated={(t) => setSelectedBookingTickets(t)}
      />
    </div>
  );
};
