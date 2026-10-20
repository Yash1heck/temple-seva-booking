import React, { useState, useEffect, useMemo } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../api/client.js';
import { PoojaFolderDeck, PoojaFolderItem } from '../components/PoojaFolderDeck.js';
import { getTempleToday } from '../utils/date.js';
import { Search, Printer, RefreshCw } from 'lucide-react';
import { toTeluguText, formatTeluguGothram } from '../utils/teluguTransliterate.js';

export const PoojariDashboardPage: React.FC = () => {
  const [rituals, setRituals] = useState<PoojaFolderItem[]>([]);
  const [selectedDate, setSelectedDate] = useState<string>(getTempleToday());
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    loadRituals();
  }, [selectedDate]);

  const loadRituals = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await apiRequest<{ date: string; rituals: PoojaFolderItem[] }>(
        `/poojari/dashboard?date=${selectedDate}&board=true`
      );
      setRituals(data.rituals);
    } catch (err: any) {
      setError(err.message || 'Failed to load ritual queue.');
    } finally {
      setIsLoading(false);
    }
  };

  const categories = [
    { key: 'All', label: 'అన్నీ' },
    { key: 'Daily Pooja', label: 'నిత్య పూజలు' },
    { key: 'Homam', label: 'హోమాలు' },
    { key: 'Special Pooja', label: 'విశేష పూజలు' }
  ];

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

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="max-w-6xl mx-auto px-3 sm:px-6 py-3 space-y-3">
      {/* 1. Apple Glassmorphic Compact Header */}
      <header className="glass-surface p-3 rounded-2xl flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-gradient-to-br from-[#7A1C23] to-[#551015] flex items-center justify-center text-white text-base shadow-xs">
            🕉️
          </div>
          <div>
            <h1 className="text-xs sm:text-sm font-bold text-[#7A1C23] font-serif leading-tight">
              శ్రీ శారదా పీఠం • అర్చక సంకల్ప బోర్డు
            </h1>
            <p className="text-[10px] text-gray-500 font-medium">
              నిత్య & విశేష పూజా సంకల్పాలు
            </p>
          </div>
        </div>

        {/* Micro Icon Action Buttons */}
        <div className="flex items-center gap-1.5">
          <button
            onClick={handlePrint}
            title="సంకల్ప పట్టిక ముద్రణ"
            className="w-8 h-8 rounded-xl bg-[#FAF5EC] border border-[#E8DCCE] text-[#7A1C23] flex items-center justify-center hover:bg-[#F3ECE0] transition-transform active:scale-95 shadow-2xs"
          >
            <Printer className="w-4 h-4" />
          </button>
          <button
            onClick={loadRituals}
            title="రిఫ్రెష్"
            className="w-8 h-8 rounded-xl bg-[#FAF5EC] border border-[#E8DCCE] text-[#7A1C23] flex items-center justify-center hover:bg-[#F3ECE0] transition-transform active:scale-95 shadow-2xs"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </header>

      {/* 2. Unified Controls Bar (Zero Horizontal Scrollbar) */}
      <div className="glass-surface p-2.5 rounded-2xl space-y-2 shadow-xs">
        {/* Date & Search Row */}
        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2">
          {/* Compact Date Picker */}
          <div className="flex items-center gap-1.5 shrink-0">
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1.5 bg-[#FAF5EC] border border-[#E8DCCE] rounded-xl text-xs font-bold text-[#2D2520] focus:outline-none focus:ring-1 focus:ring-[#C86A1B]"
            />
            <button
              type="button"
              onClick={() => setSelectedDate(getTempleToday())}
              className="px-2.5 py-1.5 bg-[#FAF5EC] border border-[#E8DCCE] rounded-xl text-xs font-bold text-[#7A1C23] hover:bg-[#F3ECE0]"
            >
              నేడు
            </button>
          </div>

          {/* Search Devotees */}
          <div className="relative flex-1">
            <input
              type="text"
              placeholder="సంకల్ప కర్త, గోత్రం లేదా టికెట్ ద్వారా వెతకండి..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full pl-8 pr-3 py-1.5 bg-[#FAF5EC]/70 border border-[#E8DCCE] rounded-xl text-xs font-medium text-[#2D2520] focus:outline-none focus:ring-1 focus:ring-[#C86A1B]"
            />
            <Search className="w-3.5 h-3.5 text-gray-400 absolute left-2.5 top-2" />
          </div>
        </div>

        {/* Categories (Auto-wrapping Material Chips, ZERO horizontal scroll) */}
        <div className="flex flex-wrap items-center justify-between gap-1.5 pt-1 border-t border-[#E8DCCE]/60">
          <div className="flex flex-wrap items-center gap-1">
            {categories.map(cat => (
              <button
                key={cat.key}
                type="button"
                onClick={() => setSelectedCategory(cat.key)}
                className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-all ${
                  selectedCategory === cat.key
                    ? 'bg-[#7A1C23] text-white shadow-2xs'
                    : 'bg-[#FAF5EC] text-gray-600 hover:bg-[#F3ECE0] border border-[#E8DCCE]/80'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Single-Line Micro Metric */}
          <div className="text-[11px] font-semibold text-gray-600">
            పూజలు: <strong className="text-[#7A1C23]">{filteredRituals.length}</strong> • భక్తులు: <strong className="text-[#7A1C23]">{totalDevotees}</strong>
          </div>
        </div>
      </div>

      {/* 3. Error Banner */}
      {error && (
        <div className="p-3 bg-red-50 border border-red-200 rounded-xl text-xs text-red-700">
          {error}
        </div>
      )}

      {/* 4. Ritual Queues & Chanting Cards (Immediate Viewport Focus) */}
      {isLoading ? (
        <div className="glass-surface p-8 text-center text-gray-500 rounded-2xl">
          <div className="animate-pulse text-lg mb-1">🕉️</div>
          <div className="text-xs font-medium">సంకల్ప వివరాలు లోడ్ అవుతున్నాయి...</div>
        </div>
      ) : filteredRituals.length === 0 ? (
        <div className="glass-surface p-8 text-center rounded-2xl space-y-1.5">
          <div className="text-2xl">🪔</div>
          <h3 className="text-xs font-bold text-[#7A1C23]">ఈ తేదీన నిర్వహించాల్సిన పూజలు లేవు</h3>
          <p className="text-[11px] text-gray-500 max-w-sm mx-auto">
            తేదీ లేదా ఫిల్టర్లను మార్చి ప్రయత్నించండి.
          </p>
        </div>
      ) : (
        <PoojaFolderDeck
          rituals={filteredRituals}
          selectedDate={selectedDate}
          onRefresh={loadRituals}
          showPrintOption={true}
        />
      )}

      {/* A4 PRINT ROSTER FOR POOJARIS (Cross-device desktop & mobile print) */}
      {createPortal(
        <div id="sankalpa-print-container" className="hidden print:block">
          <div style={{ textAlign: 'center', marginBottom: '18px', borderBottom: '2px solid #000', paddingBottom: '12px' }}>
            <h1 style={{ fontSize: '20px', fontWeight: 'bold', margin: '0' }}>
              శ్రీ శారదా పీఠం దేవస్థానం
            </h1>
            <h2 style={{ fontSize: '15px', fontWeight: '600', margin: '4px 0 0 0' }}>
              అర్చక పూజా సంకల్ప పట్టిక (DAILY POOJA SANKALPA ROSTER)
            </h2>
            <div style={{ fontSize: '12.5px', marginTop: '6px' }}>
              <strong>పూజా నిర్వహణ తేదీ:</strong> {selectedDate} | <strong>మొత్తం సంకల్ప కర్తలు:</strong> {totalDevotees}
            </div>
          </div>

          {rituals.map((r, sIdx) => (
            <div key={r.seva_id} style={{ marginBottom: '22px', pageBreakInside: 'avoid' }}>
              <div style={{ background: '#f0f0f0', padding: '6px 10px', fontWeight: 'bold', fontSize: '13.5px', border: '1px solid #000' }}>
                {sIdx + 1}. {r.telugu_name || r.seva_name} ({r.seva_name}) - [{r.registrations.length} మంది భక్తులు]
                {r.timing && <span style={{ fontSize: '11px', fontWeight: 'normal', marginLeft: '10px' }}>({r.timing})</span>}
              </div>

              {r.registrations.length === 0 ? (
                <div style={{ padding: '8px', border: '1px solid #000', borderTop: 'none', fontSize: '11.5px', fontStyle: 'italic' }}>
                  ఈ సేవకు ఈ తేదీన ఎటువంటి నమోదులు లేవు.
                </div>
              ) : (
                <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '11.5px', border: '1px solid #000', borderTop: 'none' }}>
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
                        <td style={{ border: '1px solid #000', padding: '5px', fontWeight: 'bold' }}>
                          {toTeluguText(reg.ritual_beneficiary_name)}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '5px' }}>
                          {formatTeluguGothram(reg.gothra)}
                        </td>
                        <td style={{ border: '1px solid #000', padding: '5px' }}>
                          {reg.family_details ? toTeluguText(reg.family_details) : '—'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}

          <div style={{ textAlign: 'center', marginTop: '24px', borderTop: '1px dashed #000', paddingTop: '10px', fontSize: '11px' }}>
            ॥ శ్రీ శారదాంబికాయై నమః • సర్వే జనాః సుఖినో భవంతు • సమస్త సన్మంగళాని భవంతు ॥
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
