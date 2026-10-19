import React, { useState, useEffect, useMemo } from 'react';
import { PoojariAssignmentSummary } from '../types.js';
import { apiRequest } from '../api/client.js';
import {
  Calendar, Search, Filter, Printer, RefreshCw, CheckCircle2,
  Circle, Clock, Sparkles, BookOpen, LayoutGrid, ListFilter, Users
} from 'lucide-react';

export const PoojariDashboardPage: React.FC = () => {
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [rituals, setRituals] = useState<PoojariAssignmentSummary[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // In-session local completion status for the priests on duty
  // (Provides interactive Jira-like task tracking without violating read-only backend rules)
  const [completedTickets, setCompletedTickets] = useState<Record<string, boolean>>({});

  useEffect(() => {
    loadRituals();
  }, [selectedDate]);

  const loadRituals = async () => {
    setIsLoading(true);
    setError(null);
    try {
      // board=true instructs backend to return all active temple sevas for today's shared altar board
      const data = await apiRequest<{ date: string; rituals: PoojariAssignmentSummary[] }>(
        `/poojari/dashboard?date=${selectedDate}&board=true`
      );
      setRituals(data.rituals);
    } catch (err: any) {
      setError(err.message || 'Failed to load ritual queue.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleTicketCompletion = (ticketNumber: string) => {
    setCompletedTickets(prev => ({
      ...prev,
      [ticketNumber]: !prev[ticketNumber]
    }));
  };

  // Categories extracted from sevas
  const categories = useMemo(() => {
    const set = new Set<string>();
    rituals.forEach(r => {
      if (r.category) set.add(r.category);
    });
    return ['All', ...Array.from(set)];
  }, [rituals]);

  // Filtered rituals by category and search query
  const filteredRituals = useMemo(() => {
    return rituals
      .filter(r => selectedCategory === 'All' || r.category === selectedCategory)
      .map(r => {
        if (!searchQuery.trim()) return r;
        const q = searchQuery.toLowerCase();
        const matchingRegistrations = r.registrations.filter(reg =>
          reg.ritual_beneficiary_name.toLowerCase().includes(q) ||
          reg.gothra.toLowerCase().includes(q) ||
          reg.ticket_number.toLowerCase().includes(q) ||
          (reg.family_details && reg.family_details.toLowerCase().includes(q))
        );
        return {
          ...r,
          registrations: matchingRegistrations,
          registration_count: matchingRegistrations.length
        };
      })
      .filter(r => !searchQuery.trim() || r.registrations.length > 0 || r.seva_name.toLowerCase().includes(searchQuery.toLowerCase()));
  }, [rituals, selectedCategory, searchQuery]);

  // Overall counts
  const totalDevotees = useMemo(() => {
    return rituals.reduce((sum, r) => sum + r.registrations.length, 0);
  }, [rituals]);

  const totalCompleted = useMemo(() => {
    let count = 0;
    rituals.forEach(r => {
      r.registrations.forEach(reg => {
        if (completedTickets[reg.ticket_number]) count++;
      });
    });
    return count;
  }, [rituals, completedTickets]);

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Header */}
      <div className="bg-white rounded-xl border border-[#E8DCCE] p-5 shadow-sm mb-6 space-y-4">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-[#E8DCCE]">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-2xl">🪔</span>
              <h1 className="text-xl sm:text-2xl font-bold text-[#7A1C23]">
                Poojari Ritual Queue Board
                <span className="text-sm font-normal text-[#C86A1B] font-serif ml-2">
                  (అర్చక కర్మ నిర్వహణ బోర్డు)
                </span>
              </h1>
            </div>
            <p className="text-xs text-gray-600 mt-1">
              Collaborative ritual queue for on-duty Archakas. All daily and scheduled poojas are consolidated for direct sankalpa execution.
            </p>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap items-center gap-2">
            {/* View Mode Switcher */}
            <div className="flex items-center bg-[#FAF5EC] p-1 rounded-lg border border-[#E8DCCE]">
              <button
                type="button"
                onClick={() => setViewMode('board')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  viewMode === 'board'
                    ? 'bg-[#7A1C23] text-white shadow-xs'
                    : 'text-[#7A1C23] hover:bg-[#F3ECE0]'
                }`}
              >
                <LayoutGrid className="w-3.5 h-3.5" />
                Board View
              </button>
              <button
                type="button"
                onClick={() => setViewMode('list')}
                className={`flex items-center gap-1.5 px-3 py-1 rounded text-xs font-semibold transition-colors ${
                  viewMode === 'list'
                    ? 'bg-[#7A1C23] text-white shadow-xs'
                    : 'text-[#7A1C23] hover:bg-[#F3ECE0]'
                }`}
              >
                <ListFilter className="w-3.5 h-3.5" />
                List View
              </button>
            </div>

            <button
              onClick={handlePrint}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF5EC] border border-[#E8DCCE] text-[#7A1C23] rounded-md text-xs font-semibold hover:bg-[#F3ECE0]"
            >
              <Printer className="w-3.5 h-3.5 text-[#C86A1B]" />
              Print Sankalpa Sheet
            </button>

            <button
              onClick={loadRituals}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white border border-[#E8DCCE] text-gray-700 rounded-md text-xs font-medium hover:bg-gray-50"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              Refresh
            </button>
          </div>
        </div>

        {/* Filter Bar: Date, Search, Category Tabs */}
        <div className="grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
          {/* Date Selector */}
          <div className="md:col-span-4 flex items-center gap-2">
            <span className="text-xs font-semibold text-[#7A1C23] uppercase tracking-wider whitespace-nowrap">
              Date:
            </span>
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="w-full px-2.5 py-1.5 bg-[#FAF5EC]/50 border border-[#E8DCCE] rounded-md text-xs font-medium focus:outline-none focus:ring-2 focus:ring-[#C86A1B] text-[#2D2520]"
            />
            <button
              type="button"
              onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
              className="px-2.5 py-1.5 bg-[#FAF5EC] border border-[#E8DCCE] rounded text-xs font-semibold text-[#7A1C23] hover:bg-[#F3ECE0]"
            >
              Today
            </button>
          </div>

          {/* Devotee Search Filter */}
          <div className="md:col-span-5 relative">
            <input
              type="text"
              placeholder="Search devotee, gothra, or ticket # across board..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#FAF5EC]/40 border border-[#E8DCCE] rounded-lg text-xs text-[#2D2520] focus:outline-none focus:ring-2 focus:ring-[#C86A1B]"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2.5" />
          </div>

          {/* Category Tabs */}
          <div className="md:col-span-3 flex items-center justify-end gap-1 overflow-x-auto">
            {categories.map(cat => (
              <button
                key={cat}
                type="button"
                onClick={() => setSelectedCategory(cat)}
                className={`px-2.5 py-1 rounded text-xs font-medium whitespace-nowrap transition-colors ${
                  selectedCategory === cat
                    ? 'bg-[#7A1C23] text-white shadow-xs'
                    : 'bg-[#FAF5EC] text-gray-700 hover:bg-[#F3ECE0]'
                }`}
              >
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Live Status Summary Pill */}
        <div className="bg-[#FAF5EC] px-4 py-2.5 rounded-lg border border-[#E8DCCE] flex flex-wrap items-center justify-between gap-3 text-xs">
          <div className="flex items-center gap-3">
            <span className="font-semibold text-[#7A1C23]">
              📅 {new Date(selectedDate).toLocaleDateString('en-IN', {
                weekday: 'long',
                year: 'numeric',
                month: 'long',
                day: 'numeric'
              })}
            </span>
            <span className="text-gray-400">•</span>
            <span className="text-[#2D2520]">
              Active Sevas: <strong>{filteredRituals.length}</strong>
            </span>
          </div>

          <div className="flex items-center gap-4">
            <span className="text-[#2D2520]">
              Total Devotees in Queue: <strong className="text-[#7A1C23]">{totalDevotees}</strong>
            </span>
            <span className="text-emerald-700 font-semibold flex items-center gap-1">
              <CheckCircle2 className="w-3.5 h-3.5" />
              Chanted / Done: {totalCompleted} / {totalDevotees}
            </span>
          </div>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="p-4 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 mb-6">
          {error}
        </div>
      )}

      {/* Loading State */}
      {isLoading ? (
        <div className="p-12 text-center text-gray-500 bg-white rounded-xl border border-[#E8DCCE]">
          <div className="animate-pulse text-lg mb-2">🕉️</div>
          Loading ritual queues and devotee sankalpas...
        </div>
      ) : filteredRituals.length === 0 ? (
        <div className="p-12 text-center bg-white rounded-xl border border-[#E8DCCE] space-y-2">
          <div className="text-3xl">🪔</div>
          <h3 className="text-sm font-bold text-[#7A1C23]">No Rituals Scheduled for this Date</h3>
          <p className="text-xs text-gray-500 max-w-md mx-auto">
            Special scheduled sevas only appear on their specifically configured date (Requirement 9).
          </p>
        </div>
      ) : viewMode === 'board' ? (
        /* ========================================================================= */
        /* JIRA / KANBAN BOARD VIEW */
        /* ========================================================================= */
        <div className="overflow-x-auto pb-4">
          <div className="flex gap-4 items-start min-w-max">
            {filteredRituals.map((seva) => {
              const sevaCompletedCount = seva.registrations.filter(r => completedTickets[r.ticket_number]).length;

              return (
                <div
                  key={seva.seva_id}
                  className="w-80 flex-shrink-0 bg-[#FAF5EC]/70 rounded-xl border border-[#E8DCCE] shadow-xs flex flex-col max-h-[calc(100vh-220px)] overflow-hidden"
                >
                  {/* Column Header (Jira Column Style) */}
                  <div className="p-3.5 bg-white border-b border-[#E8DCCE] sticky top-0 z-10 space-y-1.5">
                    <div className="flex items-start justify-between gap-2">
                      <div className="font-bold text-[#7A1C23] text-sm leading-tight">
                        {seva.seva_name}
                        {seva.telugu_name && (
                          <span className="block text-xs font-serif text-[#C86A1B] font-normal">
                            {seva.telugu_name}
                          </span>
                        )}
                      </div>
                      <span className="px-2 py-0.5 rounded-full text-[11px] font-extrabold bg-[#7A1C23] text-white">
                        {seva.registrations.length}
                      </span>
                    </div>

                    <div className="flex items-center justify-between text-[11px] text-gray-500 pt-1">
                      <span className="bg-amber-50 text-[#C86A1B] font-semibold px-1.5 py-0.5 rounded border border-amber-200/60">
                        {seva.category}
                      </span>
                      {seva.timing && (
                        <span className="flex items-center gap-1 text-[10px] text-gray-500 truncate max-w-[140px]" title={seva.timing}>
                          <Clock className="w-3 h-3 text-gray-400" />
                          {seva.timing}
                        </span>
                      )}
                    </div>

                    {/* Column progress bar */}
                    {seva.registrations.length > 0 && (
                      <div className="pt-1">
                        <div className="flex justify-between text-[10px] text-gray-500 mb-0.5">
                          <span>Sankalpa Progress</span>
                          <span className="font-semibold text-[#7A1C23]">
                            {sevaCompletedCount} / {seva.registrations.length}
                          </span>
                        </div>
                        <div className="w-full bg-[#E8DCCE] h-1.5 rounded-full overflow-hidden">
                          <div
                            className="bg-emerald-600 h-1.5 transition-all duration-300 rounded-full"
                            style={{
                              width: `${(sevaCompletedCount / seva.registrations.length) * 100}%`
                            }}
                          />
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Devotee Cards Column Queue */}
                  <div className="p-2.5 overflow-y-auto space-y-2.5 flex-1 divide-y-0">
                    {seva.registrations.length === 0 ? (
                      <div className="p-6 text-center text-xs text-gray-400 italic bg-white/60 rounded-lg border border-dashed border-[#E8DCCE]">
                        No devotees queued for today
                      </div>
                    ) : (
                      seva.registrations.map((reg, idx) => {
                        const isDone = !!completedTickets[reg.ticket_number];

                        return (
                          <div
                            key={reg.ticket_number}
                            className={`p-3 rounded-lg border transition-all text-xs bg-white shadow-xs ${
                              isDone
                                ? 'border-emerald-200 bg-emerald-50/40 opacity-75'
                                : 'border-[#E8DCCE] hover:border-[#C86A1B] hover:shadow-sm'
                            }`}
                          >
                            {/* Card Top: Ticket Number & Interactive Checklist Checkbox */}
                            <div className="flex items-center justify-between gap-2 mb-2 pb-1.5 border-b border-gray-100">
                              <span className="font-mono font-bold text-[11px] text-[#7A1C23] bg-[#FAF5EC] px-1.5 py-0.5 rounded border border-[#E8DCCE]">
                                {reg.ticket_number}
                              </span>

                              <button
                                type="button"
                                onClick={() => toggleTicketCompletion(reg.ticket_number)}
                                title={isDone ? 'Mark as Pending' : 'Mark as Chanted / Completed'}
                                className={`flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-semibold transition-colors ${
                                  isDone
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-gray-100 text-gray-600 hover:bg-amber-100 hover:text-amber-900'
                                }`}
                              >
                                {isDone ? (
                                  <>
                                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                                    <span>Chanted</span>
                                  </>
                                ) : (
                                  <>
                                    <Circle className="w-3 h-3 text-gray-400" />
                                    <span>Mark Done</span>
                                  </>
                                )}
                              </button>
                            </div>

                            {/* Devotee Name (కర్త) */}
                            <div className="font-bold text-[#2D2520] text-sm leading-snug">
                              {reg.ritual_beneficiary_name}
                            </div>

                            {/* Gothra Tag */}
                            <div className="mt-1 flex items-center gap-1.5">
                              <span className="text-[10px] text-gray-500 font-semibold uppercase">గోత్రం:</span>
                              <span className="font-bold text-[#C86A1B] bg-amber-50 px-1.5 py-0.5 rounded text-[11px] border border-amber-200/60">
                                {reg.gothra}
                              </span>
                            </div>

                            {/* Family Details / Nakshatra */}
                            {reg.family_details && (
                              <div className="mt-2 text-[11px] text-gray-700 bg-[#FAF5EC]/70 p-1.5 rounded border border-[#E8DCCE]/70">
                                <span className="font-semibold text-gray-500 text-[10px] block">సంకల్ప వివరాలు / Family:</span>
                                <span className="leading-tight block mt-0.5">{reg.family_details}</span>
                              </div>
                            )}

                            {/* Card Footer: Queue Order & Time */}
                            <div className="mt-2.5 pt-1.5 border-t border-gray-100 flex items-center justify-between text-[10px] text-gray-400">
                              <span>Queue #{idx + 1}</span>
                              <span>
                                {new Date(reg.booking_date).toLocaleTimeString('en-IN', {
                                  hour: '2-digit',
                                  minute: '2-digit'
                                })}
                              </span>
                            </div>
                          </div>
                        );
                      })
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      ) : (
        /* ========================================================================= */
        /* PRINTABLE SANKALPA LIST VIEW */
        /* ========================================================================= */
        <div className="space-y-6">
          {filteredRituals.map((seva) => (
            <div
              key={seva.seva_id}
              className="bg-white rounded-xl border border-[#E8DCCE] shadow-xs overflow-hidden"
            >
              {/* Seva Banner */}
              <div className="bg-[#FAF5EC] px-5 py-3.5 border-b border-[#E8DCCE] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base font-bold text-[#7A1C23]">{seva.seva_name}</h2>
                    {seva.telugu_name && (
                      <span className="text-sm font-serif text-[#C86A1B]">({seva.telugu_name})</span>
                    )}
                  </div>
                  <div className="text-xs text-gray-600 flex items-center gap-2 mt-0.5">
                    <span>Category: <strong>{seva.category}</strong></span>
                    {seva.timing && <span>• ⏰ {seva.timing}</span>}
                    {seva.is_scheduled && (
                      <span className="bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded text-[10px] font-semibold">
                        Scheduled Date Seva
                      </span>
                    )}
                  </div>
                </div>

                <div className="bg-white px-3 py-1.5 rounded-lg border border-[#E8DCCE] text-xs font-bold text-[#7A1C23]">
                  {seva.registrations.length} Devotees
                </div>
              </div>

              {/* Devotees Table */}
              {seva.registrations.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-400 italic">
                  No devotees booked for this seva on {selectedDate}.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-[#F3ECE0]/50 text-gray-700 font-semibold border-b border-[#E8DCCE]">
                      <tr>
                        <th className="py-2.5 px-4 w-12">#</th>
                        <th className="py-2.5 px-4 w-32">Ticket Ref</th>
                        <th className="py-2.5 px-4">Ritual Beneficiary (కర్త)</th>
                        <th className="py-2.5 px-4">Gothra (గోత్రం)</th>
                        <th className="py-2.5 px-4">Family / Nakshatra Details</th>
                        <th className="py-2.5 px-4 w-28 text-center">Status</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#FAF5EC]">
                      {seva.registrations.map((reg, idx) => {
                        const isDone = !!completedTickets[reg.ticket_number];

                        return (
                          <tr
                            key={reg.ticket_number}
                            className={`hover:bg-[#FAF5EC]/40 ${isDone ? 'bg-emerald-50/30' : ''}`}
                          >
                            <td className="py-2.5 px-4 text-gray-400 font-mono">{idx + 1}</td>
                            <td className="py-2.5 px-4 font-mono font-medium text-[#7A1C23]">
                              {reg.ticket_number}
                            </td>
                            <td className="py-2.5 px-4 font-bold text-[#2D2520]">
                              {reg.ritual_beneficiary_name}
                            </td>
                            <td className="py-2.5 px-4 font-semibold text-[#C86A1B]">
                              {reg.gothra}
                            </td>
                            <td className="py-2.5 px-4 text-gray-600">
                              {reg.family_details || <span className="text-gray-300 italic">Self</span>}
                            </td>
                            <td className="py-2.5 px-4 text-center">
                              <button
                                type="button"
                                onClick={() => toggleTicketCompletion(reg.ticket_number)}
                                className={`px-2 py-1 rounded text-[10px] font-semibold transition-colors ${
                                  isDone
                                    ? 'bg-emerald-100 text-emerald-800'
                                    : 'bg-gray-100 text-gray-600 hover:bg-amber-100'
                                }`}
                              >
                                {isDone ? '✓ Chanted' : 'Mark Done'}
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
