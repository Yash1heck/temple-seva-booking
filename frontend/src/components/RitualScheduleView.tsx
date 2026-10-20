import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../api/client.js';
import { getTempleToday, getTempleTomorrow, formatTempleDate } from '../utils/date.js';
import { toTeluguText, formatTeluguGothram } from '../utils/teluguTransliterate.js';
import { playTempleBell } from '../utils/templeAudio.js';
import {
  Calendar, Printer, RefreshCw, Users, BookOpen,
  CheckCircle2, Clock, Zap, Check, RotateCcw, AlertTriangle, Layers
} from 'lucide-react';

interface RitualRegistration {
  ticket_number: string;
  booking_number: string;
  ritual_beneficiary_name: string;
  gothra: string;
  family_details: string | null;
  booking_date: string;
  status: string;
  completed_at?: string | null;
}

interface ScheduledRitual {
  seva_id: string;
  seva_name: string;
  telugu_name: string | null;
  category: string;
  timing: string | null;
  is_scheduled: boolean;
  scheduled_date: string | null;
  registration_count: number;
  registrations: RitualRegistration[];
}

interface RitualScheduleResponse {
  date: string;
  total_sevas: number;
  total_devotees: number;
  rituals: ScheduledRitual[];
}

interface RitualScheduleViewProps {
  selectedDate: string;
  onDateChange: (date: string) => void;
}

export const RitualScheduleView: React.FC<RitualScheduleViewProps> = ({
  selectedDate,
  onDateChange
}) => {
  const [data, setData] = useState<RitualScheduleResponse | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filterSeva, setFilterSeva] = useState<string>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'pending' | 'completed'>('all');

  // Loading states for actions
  const [isBulkCompletingAll, setIsBulkCompletingAll] = useState(false);
  const [completingSevaId, setCompletingSevaId] = useState<string | null>(null);
  const [togglingTicketNumber, setTogglingTicketNumber] = useState<string | null>(null);

  useEffect(() => {
    loadSchedule();
  }, [selectedDate]);

  const loadSchedule = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await apiRequest<RitualScheduleResponse>(
        `/reports/ritual-schedule?date=${selectedDate}`
      );
      setData(res);
    } catch (err: any) {
      setError(err.message || 'పూజా సంకల్ప పట్టిక లోడ్ చేయడం విఫలమైంది');
    } finally {
      setIsLoading(false);
    }
  };

  // Overall totals and status counts
  const overallCounts = useMemo(() => {
    if (!data || !data.rituals) return { total: 0, completed: 0, pending: 0 };
    let total = 0;
    let completed = 0;
    data.rituals.forEach(r => {
      total += r.registrations.length;
      r.registrations.forEach(reg => {
        if (reg.status === 'completed' || !!reg.completed_at) {
          completed++;
        }
      });
    });
    return {
      total,
      completed,
      pending: total - completed
    };
  }, [data]);

  // Bulk complete ALL pending poojas for the entire day
  const handleBulkCompleteAll = async () => {
    if (overallCounts.pending === 0) return;

    const confirmMsg = `శ్రీ శృంగేరి శారదా పీఠం సన్నిధానం:\n\nతేదీ: ${selectedDate}\nఈ రోజుకు సంబంధించిన మొత్తం ${overallCounts.pending} పెండింగ్ పూజలను ఒకేసారి "నిర్వహించబడినవి (COMPLETED)" గా నమోదు చేయాలనుకుంటున్నారా?`;
    if (!window.confirm(confirmMsg)) return;

    setIsBulkCompletingAll(true);
    playTempleBell(0.4);

    try {
      await apiRequest('/poojari/batch-complete', {
        method: 'POST',
        body: JSON.stringify({
          target_date: selectedDate
        })
      });
      await loadSchedule();
    } catch (err: any) {
      alert(err.message || 'పూజలను పూర్తి చేయడం విఫలమైంది');
    } finally {
      setIsBulkCompletingAll(false);
    }
  };

  // Bulk complete all pending tickets for ONE specific seva
  const handleBulkCompleteSeva = async (sevaId: string, sevaTitle: string, pendingCount: number) => {
    if (pendingCount === 0) return;

    const confirmMsg = `శ్రీ శృంగేరి శారదా పీఠం సన్నిధానం:\n\nపూజా సేవ: "${sevaTitle}"\nతేదీ: ${selectedDate}\nఈ సేవలోని మొత్తం ${pendingCount} పెండింగ్ సంకల్పాలను పూర్తి చేయాలనుకుంటున్నారా?`;
    if (!window.confirm(confirmMsg)) return;

    setCompletingSevaId(sevaId);
    playTempleBell(0.35);

    try {
      await apiRequest('/poojari/batch-complete', {
        method: 'POST',
        body: JSON.stringify({
          target_date: selectedDate,
          seva_id: sevaId
        })
      });
      await loadSchedule();
    } catch (err: any) {
      alert(err.message || 'ఈ సేవ పూజలను పూర్తి చేయడం విఫలమైంది');
    } finally {
      setCompletingSevaId(null);
    }
  };

  // 1-Click Toggle for individual devotee ticket
  const handleToggleTicket = async (ticketNumber: string) => {
    setTogglingTicketNumber(ticketNumber);
    playTempleBell(0.25);

    try {
      await apiRequest('/poojari/complete-ticket', {
        method: 'POST',
        body: JSON.stringify({ ticket_number: ticketNumber })
      });
      await loadSchedule();
    } catch (err: any) {
      alert(err.message || 'టికెట్ స్థితి నవీకరణ విఫలమైంది');
    } finally {
      setTogglingTicketNumber(null);
    }
  };

  const handlePrint = () => {
    window.print();
  };

  // Filtered rituals based on seva selection & status filter
  const displayedRituals = useMemo(() => {
    if (!data || !data.rituals) return [];
    return data.rituals
      .filter(r => filterSeva === 'all' || r.seva_id === filterSeva)
      .map(r => {
        let matchingRegs = r.registrations;
        if (statusFilter === 'pending') {
          matchingRegs = r.registrations.filter(reg => reg.status !== 'completed' && !reg.completed_at);
        } else if (statusFilter === 'completed') {
          matchingRegs = r.registrations.filter(reg => reg.status === 'completed' || !!reg.completed_at);
        }
        return {
          ...r,
          registrations: matchingRegs
        };
      })
      .filter(r => statusFilter === 'all' || r.registrations.length > 0);
  }, [data, filterSeva, statusFilter]);

  return (
    <div className="space-y-4 w-full max-w-full overflow-hidden">
      {/* 1. TOP ACTION & BULK COMPLETE BAR */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-[#E8DCCE] shadow-xs flex flex-col lg:flex-row lg:items-center justify-between gap-3">
        {/* Date Selector */}
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 font-serif">
            <Calendar className="w-4 h-4 text-[#C86A1B]" />
            పూజా నిర్వహణ తేదీ:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="px-3 py-1.5 bg-white border border-[#E8DCCE] rounded-xl text-xs font-bold text-[#2D2520] focus:ring-2 focus:ring-[#C86A1B] focus:outline-none shadow-2xs"
          />
          <button
            type="button"
            onClick={() => onDateChange(getTempleToday())}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-2xs ${
              selectedDate === getTempleToday()
                ? 'bg-[#7A1C23] text-white'
                : 'bg-[#FAF5EC] border border-[#E8DCCE] text-[#7A1C23] hover:bg-[#F3ECE0]'
            }`}
          >
            నేడు
          </button>
          <button
            type="button"
            onClick={() => onDateChange(getTempleTomorrow())}
            className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors shadow-2xs ${
              selectedDate === getTempleTomorrow()
                ? 'bg-[#7A1C23] text-white'
                : 'bg-[#FAF5EC] border border-[#E8DCCE] text-[#7A1C23] hover:bg-[#F3ECE0]'
            }`}
          >
            రేపు
          </button>
        </div>

        {/* Action Controls & Big Bulk Complete Button */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Seva Dropdown */}
          {data && data.rituals.length > 0 && (
            <select
              value={filterSeva}
              onChange={(e) => setFilterSeva(e.target.value)}
              className="px-3 py-1.5 bg-white border border-[#E8DCCE] rounded-xl text-xs font-semibold text-[#2D2520] shadow-2xs"
            >
              <option value="all">అన్ని పూజలు ({data.rituals.length})</option>
              {data.rituals.map(r => (
                <option key={r.seva_id} value={r.seva_id}>
                  {r.telugu_name || r.seva_name} ({r.registration_count})
                </option>
              ))}
            </select>
          )}

          {/* Refresh */}
          <button
            type="button"
            onClick={loadSchedule}
            title="తాజా సమాచారం"
            className="p-2 bg-[#FAF5EC] border border-[#E8DCCE] text-[#7A1C23] rounded-xl text-xs font-bold hover:bg-[#F3ECE0] shadow-2xs active:scale-95"
          >
            <RefreshCw className="w-3.5 h-3.5" />
          </button>

          {/* Print Roster */}
          <button
            type="button"
            onClick={handlePrint}
            disabled={!data || data.total_devotees === 0}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#FAF5EC] border border-[#E8DCCE] text-[#7A1C23] hover:bg-[#F3ECE0] rounded-xl text-xs font-bold shadow-2xs transition-colors disabled:opacity-50"
          >
            <Printer className="w-4 h-4 text-[#C86A1B]" />
            <span className="hidden sm:inline">ముద్రణ</span>
          </button>

          {/* ADMIN BULK MARK ALL AS COMPLETE BUTTON */}
          <button
            type="button"
            disabled={isBulkCompletingAll || overallCounts.pending === 0}
            onClick={handleBulkCompleteAll}
            className={`flex items-center gap-2 px-4 py-2 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-95 ${
              overallCounts.pending === 0
                ? 'bg-emerald-50 text-emerald-800 border border-emerald-300 cursor-default'
                : 'bg-gradient-to-r from-[#7A1C23] via-[#94202A] to-[#5C1217] hover:brightness-110 text-white border border-amber-300/40 shadow-amber-900/20'
            }`}
          >
            {overallCounts.pending === 0 ? (
              <>
                <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                <span>అన్ని పూజలు పూర్తయ్యాయి</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 text-amber-300 animate-pulse" />
                <span>
                  {isBulkCompletingAll
                    ? 'నమోదవుతున్నాయి...'
                    : `ఈ రోజు మొత్తం పూజలను పూర్తి చేయండి (${overallCounts.pending})`}
                </span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 2. SUMMARY METRICS & STATUS FILTERS */}
      {data && (
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5">
          <div className="bg-white p-3 rounded-xl border border-[#E8DCCE] shadow-2xs">
            <div className="text-[10px] font-bold text-gray-500 uppercase">పూజా తేదీ</div>
            <div className="text-sm sm:text-base font-bold text-[#7A1C23] mt-0.5 font-mono">
              📅 {selectedDate}
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">లక్ష్య సంకల్ప దినం</div>
          </div>

          <div className="bg-white p-3 rounded-xl border border-[#E8DCCE] shadow-2xs">
            <div className="text-[10px] font-bold text-gray-500 uppercase">సేవల సంఖ్య</div>
            <div className="text-sm sm:text-base font-bold text-[#C86A1B] mt-0.5">
              {data.total_sevas} పూజలు
            </div>
            <div className="text-[10px] text-gray-400 mt-0.5">కార్యక్రమాల సమాహారం</div>
          </div>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'completed' ? 'all' : 'completed')}
            className={`p-3 rounded-xl border text-left transition-all ${
              statusFilter === 'completed'
                ? 'bg-emerald-100/90 border-emerald-400 ring-2 ring-emerald-500/30'
                : 'bg-emerald-50/70 border-emerald-200 hover:bg-emerald-100/60'
            }`}
          >
            <div className="text-[10px] font-bold text-emerald-700 uppercase flex items-center justify-between">
              <span>పూర్తయినవి</span>
              <span>✓</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-emerald-900 mt-0.5 font-mono">
              {overallCounts.completed} మంది
            </div>
            <div className="text-[10px] text-emerald-700 mt-0.5">
              {statusFilter === 'completed' ? 'ఫిల్టర్ వర్తించింది (Click to reset)' : 'క్లిక్ చేసి చూడండి'}
            </div>
          </button>

          <button
            type="button"
            onClick={() => setStatusFilter(statusFilter === 'pending' ? 'all' : 'pending')}
            className={`p-3 rounded-xl border text-left transition-all ${
              statusFilter === 'pending'
                ? 'bg-amber-100/90 border-amber-400 ring-2 ring-amber-500/30'
                : 'bg-amber-50/70 border-amber-200 hover:bg-amber-100/60'
            }`}
          >
            <div className="text-[10px] font-bold text-amber-800 uppercase flex items-center justify-between">
              <span>మిగిలినవి</span>
              <span>⏳</span>
            </div>
            <div className="text-sm sm:text-base font-bold text-amber-950 mt-0.5 font-mono">
              {overallCounts.pending} మంది
            </div>
            <div className="text-[10px] text-amber-800 mt-0.5">
              {statusFilter === 'pending' ? 'ఫిల్టర్ వర్తించింది (Click to reset)' : 'క్లిక్ చేసి చూడండి'}
            </div>
          </button>
        </div>
      )}

      {/* 3. ROSTER / SEVA LIST - ZERO SWIPE CARDS, ZERO OVERFLOW */}
      {isLoading ? (
        <div className="bg-white p-10 rounded-2xl border border-[#E8DCCE] text-center text-xs text-gray-500 shadow-xs">
          <div className="animate-spin text-lg mb-2">🕉️</div>
          {selectedDate} తేదీకి పూజా సంకల్ప వివరాలు లోడ్ అవుతున్నాయి...
        </div>
      ) : error ? (
        <div className="bg-red-50 p-4 rounded-xl border border-red-200 text-center text-xs text-red-700">
          {error}
        </div>
      ) : !data || displayedRituals.length === 0 ? (
        <div className="bg-white p-10 rounded-2xl border border-[#E8DCCE] text-center text-xs text-gray-500 space-y-2 shadow-xs">
          <BookOpen className="w-8 h-8 text-gray-300 mx-auto" />
          <div className="font-bold text-[#7A1C23] text-sm">ఈ తేదీకి ఎటువంటి పూజలు లేవు లేదా ఫిల్టర్‌లో లభించలేదు</div>
          <p className="text-[11px] text-gray-500">
            మరో తేదీని ఎంచుకోండి లేదా ఫిల్టర్లను తొలగించి ప్రయత్నించండి.
          </p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayedRituals.map((r, sIdx) => {
            const sevaPending = r.registrations.filter(reg => reg.status !== 'completed' && !reg.completed_at).length;
            const sevaCompleted = r.registrations.length - sevaPending;
            const isAllSevaDone = r.registrations.length > 0 && sevaPending === 0;

            return (
              <div
                key={r.seva_id}
                className="w-full bg-white rounded-2xl border border-[#E8DCCE] shadow-xs overflow-hidden"
              >
                {/* Seva Header Bar with 1-Click "Mark Entire Pooja Complete" Button */}
                <div className="bg-[#FAF5EC] px-4 py-3 border-b border-[#E8DCCE] flex flex-col sm:flex-row sm:items-center justify-between gap-2.5">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7A1C23] to-[#5C1217] text-white flex items-center justify-center text-sm font-bold shadow-2xs shrink-0">
                      🪔
                    </div>
                    <div>
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-xs sm:text-sm font-bold text-[#7A1C23] font-serif">
                          {sIdx + 1}. {r.telugu_name || r.seva_name}
                        </h3>
                        {r.timing && (
                          <span className="text-[10px] font-bold text-gray-500 bg-white/80 px-2 py-0.5 rounded-md border border-[#E8DCCE]">
                            ⏰ {r.timing}
                          </span>
                        )}
                        <span className="text-[10px] font-bold text-amber-800 bg-amber-100/70 px-2 py-0.5 rounded-md border border-amber-200">
                          {r.category}
                        </span>
                      </div>
                      <div className="text-[11px] text-gray-600 mt-0.5">
                        మొత్తం: <strong>{r.registrations.length}</strong> • పూర్తయినవి: <strong className="text-emerald-700">{sevaCompleted}</strong> • మిగిలినవి: <strong className="text-amber-800">{sevaPending}</strong>
                      </div>
                    </div>
                  </div>

                  {/* 1-CLICK MARK ENTIRE POOJA COMPLETED BUTTON */}
                  <div className="flex items-center gap-2 self-end sm:self-auto shrink-0">
                    {sevaPending > 0 ? (
                      <button
                        type="button"
                        disabled={completingSevaId === r.seva_id}
                        onClick={() => handleBulkCompleteSeva(r.seva_id, r.telugu_name || r.seva_name, sevaPending)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-gradient-to-r from-amber-600 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white rounded-xl text-xs font-bold shadow-xs active:scale-95 transition-all"
                      >
                        <Zap className="w-3.5 h-3.5 text-amber-200" />
                        <span>
                          {completingSevaId === r.seva_id
                            ? 'పూర్తవుతున్నాయి...'
                            : `ఈ పూజలోని అన్నిటినీ పూర్తి చేయండి (${sevaPending})`}
                        </span>
                      </button>
                    ) : (
                      <span className="flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-xl text-xs font-bold">
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span>ఈ పూజ సంకల్పాలు పూర్తయ్యాయి</span>
                      </span>
                    )}
                  </div>
                </div>

                {/* Devotees List / Table (100% Responsive, Zero Horizontal Scroll Overflow) */}
                {r.registrations.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-400 italic">
                    ఈ సేవకు ఎంచుకున్న ఫిల్టర్‌లో ఎటువంటి రికార్డులు లేవు.
                  </div>
                ) : (
                  <>
                    {/* Desktop View: Clean Table */}
                    <div className="hidden md:block overflow-x-auto">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-[#FAF5EC]/50 text-gray-600 font-bold border-b border-[#E8DCCE]">
                          <tr>
                            <th className="py-2.5 px-4 w-12 text-center">క్రమ</th>
                            <th className="py-2.5 px-4 w-36">టికెట్ సంఖ్య</th>
                            <th className="py-2.5 px-4">సంకల్ప కర్త నామం</th>
                            <th className="py-2.5 px-4 w-36">గోత్రము</th>
                            <th className="py-2.5 px-4">కుటుంబ సభ్యులు / నక్షత్రం</th>
                            <th className="py-2.5 px-4 w-32 text-center">స్థితి</th>
                            <th className="py-2.5 px-4 w-36 text-right">చర్య</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-[#FAF5EC]">
                          {r.registrations.map((reg, idx) => {
                            const isDone = reg.status === 'completed' || !!reg.completed_at;
                            return (
                              <tr
                                key={reg.ticket_number}
                                className={`transition-colors ${
                                  isDone ? 'bg-emerald-50/30 hover:bg-emerald-50/50' : 'hover:bg-[#FAF5EC]/40'
                                }`}
                              >
                                <td className="py-2.5 px-4 text-center font-bold text-gray-400">
                                  {idx + 1}
                                </td>
                                <td className="py-2.5 px-4 font-mono font-bold text-[#7A1C23]">
                                  {reg.ticket_number}
                                </td>
                                <td className="py-2.5 px-4 font-bold text-[#2D2520] font-serif text-sm">
                                  {toTeluguText(reg.ritual_beneficiary_name)}
                                </td>
                                <td className="py-2.5 px-4 font-bold text-amber-950">
                                  {formatTeluguGothram(reg.gothra)}
                                </td>
                                <td className="py-2.5 px-4 text-gray-600">
                                  {reg.family_details ? toTeluguText(reg.family_details) : '—'}
                                </td>
                                <td className="py-2.5 px-4 text-center">
                                  {isDone ? (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                      <Check className="w-3 h-3 text-emerald-600" />
                                      పూర్తయింది
                                    </span>
                                  ) : (
                                    <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                      <Clock className="w-3 h-3 text-amber-700" />
                                      పెండింగ్
                                    </span>
                                  )}
                                </td>
                                <td className="py-2.5 px-4 text-right">
                                  <button
                                    type="button"
                                    disabled={togglingTicketNumber === reg.ticket_number}
                                    onClick={() => handleToggleTicket(reg.ticket_number)}
                                    className={`px-3 py-1 rounded-lg text-xs font-bold transition-all shadow-2xs active:scale-95 ${
                                      isDone
                                        ? 'bg-gray-100 text-gray-600 hover:bg-gray-200 border border-gray-300'
                                        : 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-emerald-900/10'
                                    }`}
                                  >
                                    {togglingTicketNumber === reg.ticket_number
                                      ? '...'
                                      : isDone
                                      ? 'పూర్తయింది ✓'
                                      : 'పూర్తి చేయండి'}
                                  </button>
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>

                    {/* Mobile View: High-Density Card Rows (Zero Horizontal Overflow) */}
                    <div className="md:hidden divide-y divide-[#FAF5EC] p-2 space-y-2">
                      {r.registrations.map((reg, idx) => {
                        const isDone = reg.status === 'completed' || !!reg.completed_at;
                        return (
                          <div
                            key={reg.ticket_number}
                            className={`p-3 rounded-xl border flex flex-col gap-2 transition-colors ${
                              isDone ? 'bg-emerald-50/40 border-emerald-200' : 'bg-white border-[#E8DCCE]'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <div className="min-w-0 flex-1">
                                <div className="flex items-center gap-1.5 flex-wrap">
                                  <span className="text-[10px] font-bold text-gray-400 font-mono">#{idx + 1}</span>
                                  <span className="text-[11px] font-mono font-bold text-[#7A1C23]">{reg.ticket_number}</span>
                                </div>
                                <h4 className="text-sm font-bold text-[#2D2520] font-serif mt-0.5 break-words">
                                  {toTeluguText(reg.ritual_beneficiary_name)}
                                </h4>
                                <div className="text-xs font-bold text-amber-950 mt-0.5">
                                  గోత్రం: {formatTeluguGothram(reg.gothra)}
                                </div>
                                {reg.family_details && (
                                  <div className="text-[11px] text-gray-600 mt-0.5 break-words">
                                    కుటుంబం: {toTeluguText(reg.family_details)}
                                  </div>
                                )}
                              </div>

                              <div className="shrink-0 flex flex-col items-end gap-1.5">
                                {isDone ? (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                                    ✓ పూర్తయింది
                                  </span>
                                ) : (
                                  <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                                    ⏳ పెండింగ్
                                  </span>
                                )}

                                <button
                                  type="button"
                                  disabled={togglingTicketNumber === reg.ticket_number}
                                  onClick={() => handleToggleTicket(reg.ticket_number)}
                                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all active:scale-95 ${
                                    isDone
                                      ? 'bg-gray-100 text-gray-600 border border-gray-300'
                                      : 'bg-emerald-600 text-white shadow-xs'
                                  }`}
                                >
                                  {togglingTicketNumber === reg.ticket_number
                                    ? '...'
                                    : isDone
                                    ? 'మార్చండి'
                                    : 'పూర్తి చేయండి'}
                                </button>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* PRINT-ONLY SANCTUM SANKALPA SHEET (Portaled directly to document body) */}
      {createPortal(
        <div id="sankalpa-print-container" className="hidden print:block">
          <div style={{ textAlign: 'center', marginBottom: '20px', borderBottom: '2px solid #000', paddingBottom: '12px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0', textTransform: 'uppercase' }}>
              శ్రీ శారదా పీఠం దేవస్థానం
            </h1>
            <h2 style={{ fontSize: '15px', fontWeight: '600', margin: '4px 0 0 0' }}>
              రోజువారీ పూజా సంకల్ప పట్టిక (DAILY POOJA SANKALPA ROSTER)
            </h2>
            <div style={{ fontSize: '13px', marginTop: '6px' }}>
              <strong>పూజా నిర్వహణ తేదీ:</strong> {selectedDate} | <strong>మొత్తం సంకల్ప కర్తలు:</strong> {data?.total_devotees || 0}
            </div>
          </div>

          {data?.rituals.map((r, sIdx) => (
            <div key={r.seva_id} style={{ marginBottom: '25px', pageBreakInside: 'avoid' }}>
              <div style={{ background: '#f0f0f0', padding: '6px 10px', fontWeight: 'bold', fontSize: '14px', border: '1px solid #000', borderBottom: 'none' }}>
                {sIdx + 1}. {r.telugu_name || r.seva_name} ({r.seva_name}) - [{r.registration_count} మంది భక్తులు]
                {r.timing && <span style={{ fontSize: '11px', fontWeight: 'normal', marginLeft: '10px' }}>({r.timing})</span>}
              </div>

              {r.registrations.length === 0 ? (
                <div style={{ padding: '8px', border: '1px solid #000', fontSize: '12px', fontStyle: 'italic' }}>
                  ఈ పూజకు {selectedDate} తేదీన ఎటువంటి నమోదులు లేవు.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '12px', border: '1px solid #000' }}>
                  <thead>
                    <tr style={{ background: '#eaeaea' }}>
                      <th style={{ border: '1px solid #000', padding: '5px', width: '35px', textAlign: 'center' }}>క్రమ</th>
                      <th style={{ border: '1px solid #000', padding: '5px', width: '120px' }}>టికెట్ సంఖ్య</th>
                      <th style={{ border: '1px solid #000', padding: '5px' }}>సంకల్ప కర్త</th>
                      <th style={{ border: '1px solid #000', padding: '5px', width: '100px' }}>గోత్రం</th>
                      <th style={{ border: '1px solid #000', padding: '5px' }}>కుటుంబ సభ్యులు / నక్షత్రం</th>
                    </tr>
                  </thead>
                  <tbody>
                    {r.registrations.map((reg, idx) => (
                      <tr key={reg.ticket_number}>
                        <td style={{ border: '1px solid #000', padding: '5px', textAlign: 'center' }}>{idx + 1}</td>
                        <td style={{ border: '1px solid #000', padding: '5px', fontFamily: 'monospace', fontWeight: 'bold' }}>{reg.ticket_number}</td>
                        <td style={{ border: '1px solid #000', padding: '5px', fontWeight: 'bold' }}>{toTeluguText(reg.ritual_beneficiary_name)}</td>
                        <td style={{ border: '1px solid #000', padding: '5px' }}>{formatTeluguGothram(reg.gothra)}</td>
                        <td style={{ border: '1px solid #000', padding: '5px' }}>{reg.family_details ? toTeluguText(reg.family_details) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}

          <div style={{ marginTop: '30px', borderTop: '1px solid #000', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <div>సమయం: {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
            <div>పరిశీలన: ఆలయ కార్యనిర్వాహక అధికారి (EO) / ప్రధాన అర్చకులు</div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
