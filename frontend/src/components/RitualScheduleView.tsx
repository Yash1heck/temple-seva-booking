import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { apiRequest } from '../api/client.js';
import { getTempleToday, getTempleTomorrow, formatTempleDate } from '../utils/date.js';
import { Calendar, Printer, RefreshCw, Sparkles, Users, BookOpen } from 'lucide-react';
import { PoojaFolderDeck } from './PoojaFolderDeck.js';

interface RitualRegistration {
  ticket_number: string;
  booking_number: string;
  ritual_beneficiary_name: string;
  gothra: string;
  family_details: string | null;
  booking_date: string;
  status: string;
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

  const handlePrint = () => {
    window.print();
  };

  const filteredRituals = data?.rituals.filter(r =>
    filterSeva === 'all' || r.seva_id === filterSeva
  ) || [];

  return (
    <div className="space-y-5">
      {/* Date Controls & Action Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-xl border border-[#E8DCCE] shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <label className="text-xs font-bold text-gray-700 flex items-center gap-1.5 mr-1 font-serif">
            <Calendar className="w-4 h-4 text-[#C86A1B]" />
            పూజా నిర్వహణ తేదీ:
          </label>
          <input
            type="date"
            value={selectedDate}
            onChange={(e) => onDateChange(e.target.value)}
            className="px-3 py-2 bg-white border border-[#E8DCCE] rounded-lg text-xs font-bold text-[#2D2520] focus:ring-2 focus:ring-[#C86A1B] focus:outline-none"
          />
          <button
            type="button"
            onClick={() => onDateChange(getTempleToday())}
            className="px-3 py-2 bg-[#FAF5EC] border border-[#E8DCCE] rounded-lg text-xs font-bold text-[#7A1C23] hover:bg-[#F3ECE0]"
          >
            నేడు
          </button>
          <button
            type="button"
            onClick={() => onDateChange(getTempleTomorrow())}
            className="px-3 py-2 bg-[#FAF5EC] border border-[#E8DCCE] rounded-lg text-xs font-bold text-[#7A1C23] hover:bg-[#F3ECE0]"
          >
            రేపు
          </button>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {data && data.rituals.length > 0 && (
            <select
              value={filterSeva}
              onChange={(e) => setFilterSeva(e.target.value)}
              className="px-3 py-2 bg-white border border-[#E8DCCE] rounded-lg text-xs font-semibold text-[#2D2520]"
            >
              <option value="all">అన్ని సేవలు ({data.rituals.length})</option>
              {data.rituals.map(r => (
                <option key={r.seva_id} value={r.seva_id}>
                  {r.telugu_name || r.seva_name} ({r.registration_count})
                </option>
              ))}
            </select>
          )}

          <button
            type="button"
            onClick={loadSchedule}
            className="flex items-center gap-1 px-3 py-2 bg-[#FAF5EC] border border-[#E8DCCE] text-[#7A1C23] rounded-lg text-xs font-bold hover:bg-[#F3ECE0]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            రిఫ్రెష్
          </button>

          <button
            type="button"
            onClick={handlePrint}
            disabled={!data || data.total_devotees === 0}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#7A1C23] hover:bg-[#5C1217] text-white rounded-lg text-xs font-bold shadow-xs transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Printer className="w-4 h-4 text-[#E0AE18]" />
            సంకల్ప పట్టిక ముద్రణ
          </button>
        </div>
      </div>

      {/* Summary Metrics */}
      {data && (
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
          <div className="bg-white p-3.5 rounded-xl border border-[#E8DCCE] shadow-xs">
            <div className="text-[11px] font-bold text-gray-500 uppercase">
              ఎంచుకున్న పూజా తేదీ
            </div>
            <div className="text-lg sm:text-xl font-bold text-[#7A1C23] mt-1 font-mono">
              {selectedDate}
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              ఈ రోజు మరియు ముందస్తు బుకింగ్‌ల సమాహారం
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-[#E8DCCE] shadow-xs">
            <div className="text-[11px] font-bold text-gray-500 uppercase">
              నిర్వహించే సేవల సంఖ్య
            </div>
            <div className="text-lg sm:text-xl font-bold text-[#C86A1B] mt-1 font-serif">
              {data.total_sevas} సేవలు అందుబాటులో ఉన్నాయి
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              నిత్య & విశేష పూజా కార్యక్రమాలు
            </div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-[#E8DCCE] shadow-xs">
            <div className="text-[11px] font-bold text-gray-500 uppercase">
              మొత్తం సంకల్ప భక్తులు
            </div>
            <div className="text-lg sm:text-xl font-bold text-[#7A1C23] mt-1 flex items-center gap-2">
              <Users className="w-5 h-5 text-[#C86A1B]" />
              {data.total_devotees} భక్తులు నమోదు
            </div>
            <div className="text-[10px] text-gray-500 mt-0.5">
              గర్భగుడిలో సంకల్పం చేయవలసిన పేర్లు
            </div>
          </div>
        </div>
      )}

      {/* Roster Display */}
      {isLoading ? (
        <div className="bg-white p-10 rounded-xl border border-[#E8DCCE] text-center text-xs text-gray-500">
          {selectedDate} తేదీకి పూజా సంకల్ప వివరాలు లోడ్ అవుతున్నాయి...
        </div>
      ) : error ? (
        <div className="bg-red-50 p-5 rounded-xl border border-red-200 text-center text-xs text-red-700">
          {error}
        </div>
      ) : !data || data.rituals.length === 0 ? (
        <div className="bg-white p-10 rounded-xl border border-[#E8DCCE] text-center text-xs text-gray-500 space-y-2">
          <BookOpen className="w-8 h-8 text-gray-300 mx-auto" />
          <div className="font-bold text-[#7A1C23] text-sm">ఈ తేదీకి ఎటువంటి సేవలు నమోదు కాలేదు</div>
          <div>{selectedDate} తేదీకి కొత్త బుకింగ్‌లు చేసిన వెంటనే ఇక్కడ కనిపిస్తాయి.</div>
        </div>
      ) : (
        <PoojaFolderDeck
          rituals={filteredRituals}
          selectedDate={selectedDate}
          showPrintOption={false}
        />
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
                        <td style={{ border: '1px solid #000', padding: '5px', fontWeight: 'bold' }}>{reg.ritual_beneficiary_name}</td>
                        <td style={{ border: '1px solid #000', padding: '5px' }}>{reg.gothra}</td>
                        <td style={{ border: '1px solid #000', padding: '5px' }}>{reg.family_details || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          ))}

          <div style={{ marginTop: '30px', borderTop: '1px solid #000', paddingTop: '10px', display: 'flex', justifyContent: 'space-between', fontSize: '11px' }}>
            <div>సమయం: {new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
            <div>అర్చక స్వామి సంతకం: _______________________</div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};
