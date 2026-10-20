import React, { useState, useEffect } from 'react';
import { Devotee } from '../types.js';
import { apiRequest } from '../api/client.js';
import { Search, UserCheck, UserPlus, Phone } from 'lucide-react';

interface DevoteeLookupProps {
  onSelectDevotee: (devotee: Devotee | null, suggestedDetails?: { name: string; gothra: string; family: string }) => void;
  payerMobile: string;
  setPayerMobile: (mobile: string) => void;
  payerName: string;
  setPayerName: (name: string) => void;
}

export const DevoteeLookup: React.FC<DevoteeLookupProps> = ({
  onSelectDevotee,
  payerMobile,
  setPayerMobile,
  payerName,
  setPayerName
}) => {
  const [query, setQuery] = useState(payerMobile || '');
  const [results, setResults] = useState<Devotee[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedDevotee, setSelectedDevotee] = useState<Devotee | null>(null);

  // Synchronize internal query state whenever payerMobile prop updates (e.g. approving devotee request)
  useEffect(() => {
    setQuery(payerMobile || '');
  }, [payerMobile]);

  useEffect(() => {
    if (!query || query.trim().length < 3) {
      setResults([]);
      return;
    }

    const timer = setTimeout(async () => {
      setIsSearching(true);
      try {
        const devotees = await apiRequest<Devotee[]>(`/devotees/search?q=${encodeURIComponent(query.trim())}`);
        setResults(devotees);
      } catch (err) {
        console.error('Failed to search devotees', err);
      } finally {
        setIsSearching(false);
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [query]);

  const handleSelect = (d: Devotee) => {
    setSelectedDevotee(d);
    setPayerMobile(d.mobile);
    setPayerName(d.name);
    setResults([]);
    onSelectDevotee(d, {
      name: d.name,
      gothra: d.gothra,
      family: d.family_details || ''
    });
  };

  const handleClear = () => {
    setSelectedDevotee(null);
    onSelectDevotee(null);
  };

  return (
    <div className="bg-[#FAF5EC] border border-[#E8DCCE] rounded-xl p-3.5 space-y-2.5">
      <div className="flex items-center justify-between">
        <label className="text-xs font-bold text-[#7A1C23] flex items-center gap-1.5 font-serif">
          <Phone className="w-3.5 h-3.5 text-[#C86A1B]" />
          భక్తుని మొబైల్ సంఖ్య (శోధన & రికార్డు)
        </label>
        {selectedDevotee && (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs text-[#A65311] underline hover:text-[#7A1C23] font-medium"
          >
            తొలగించు / నూతన వివరాలు
          </button>
        )}
      </div>

      <div className="relative">
        <div className="flex items-center">
          <input
            type="text"
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setPayerMobile(e.target.value);
            }}
            placeholder="10 అంకెల మొబైల్ సంఖ్య నమోదు చేయండి (Enter 10-digit mobile number)"
            className="w-full pl-8 pr-3 py-2 text-sm bg-white border border-[#E8DCCE] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C86A1B] text-[#2D2520] font-medium"
          />
          <Search className="w-4 h-4 text-gray-400 absolute left-2.5" />
        </div>

        {/* Search Results Dropdown */}
        {results.length > 0 && !selectedDevotee && (
          <div className="absolute z-20 mt-1 w-full bg-white border border-[#E8DCCE] rounded-xl shadow-lg max-h-48 overflow-y-auto divide-y divide-gray-100">
            {results.map((d) => (
              <button
                key={d.id}
                type="button"
                onClick={() => handleSelect(d)}
                className="w-full text-left px-3 py-2.5 text-xs hover:bg-[#FDF4EB] flex items-center justify-between transition-colors"
              >
                <div>
                  <div className="font-bold text-[#2D2520]">{d.name}</div>
                  <div className="text-gray-500">{d.mobile} • గోత్రం: <span className="font-semibold text-[#7A1C23]">{d.gothra}</span></div>
                </div>
                <span className="text-[10px] bg-[#7A1C23] text-white px-2 py-0.5 rounded font-bold">
                  ఎంచుకోండి
                </span>
              </button>
            ))}
          </div>
        )}
      </div>

      {selectedDevotee ? (
        <div className="bg-white border border-[#E8DCCE] rounded-lg p-2.5 text-xs flex items-center gap-2 text-[#2D2520]">
          <UserCheck className="w-4 h-4 text-emerald-600 shrink-0" />
          <div className="flex-1 leading-tight">
            <span className="font-bold text-emerald-800">గతంలో వచ్చిన భక్తుని ప్రొఫైల్</span>: {selectedDevotee.name}
            <div className="text-gray-500 text-[11px] mt-0.5">రిజిస్టర్ అయిన గోత్రం: <strong>{selectedDevotee.gothra}</strong></div>
          </div>
        </div>
      ) : query.length >= 10 && results.length === 0 && !isSearching ? (
        <div className="bg-amber-50 border border-amber-200 rounded-lg p-2 text-xs flex items-center gap-2 text-amber-900">
          <UserPlus className="w-4 h-4 text-amber-700 shrink-0" />
          <span>నూతన భక్తుడు. ఈ సమాచారం భవిష్యత్ బుకింగ్‌ల కొరకు ఆటోమేటిక్‌గా భద్రపరచబడుతుంది.</span>
        </div>
      ) : null}
    </div>
  );
};
