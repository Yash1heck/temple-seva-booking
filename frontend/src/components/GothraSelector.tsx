import React, { useState, useRef, useEffect } from 'react';
import { Search, X, Check, Plus } from 'lucide-react';

export interface GothraItem {
  en: string;
  te: string;
}

export const ALL_FAMOUS_GOTHRAS: GothraItem[] = [
  { en: 'Kashyapa', te: 'కశ్యప' },
  { en: 'Bharadwaja', te: 'భరద్వాజ' },
  { en: 'Kaundinya', te: 'కౌండిన్య' },
  { en: 'Vasishta', te: 'వసిష్ఠ' },
  { en: 'Viswamitra', te: 'విశ్వామిత్ర' },
  { en: 'Haritha', te: 'హరితస / హరిత' },
  { en: 'Gautama', te: 'గౌతమ' },
  { en: 'Sandilya', te: 'శాండిల్య' },
  { en: 'Jamadagni', te: 'జమదగ్ని' },
  { en: 'Atreya', te: 'ఆత్రేయ / అత్రి' },
  { en: 'Agasthya', te: 'అగస్త్య' },
  { en: 'Kausika', te: 'కౌశిక' },
  { en: 'Angirasa', te: 'ఆంగిరస' },
  { en: 'Srivatsa', te: 'శ్రీవత్స' },
  { en: 'Gargya', te: 'గార్గ్య' },
  { en: 'Mudgala', te: 'ముద్గల' },
  { en: 'Parasara', te: 'పరాశర' },
  { en: 'Dhananjaya', te: 'ధనంజయ' },
  { en: 'Badarayana', te: 'బాదరాయణ' },
  { en: 'Upamanyu', te: 'ఉపమన్యు' },
  { en: 'Shatamarshana', te: 'శతమర్షణ' },
  { en: 'Kapila', te: 'కపిల' },
  { en: 'Shaunaka', te: 'శౌనక' },
  { en: 'Kutsa', te: 'కుత్స' },
  { en: 'Kanva', te: 'కణ్వ' },
  { en: 'Maudgalya', te: 'మౌద్గల్య' },
  { en: 'Maitreya', te: 'మైత్రేయ' },
  { en: 'Vishnuvardhana', te: 'విష్ణువర్ధన' },
  { en: 'Naidhruva', te: 'నైధ్రువ' },
  { en: 'Vadula', te: 'వాదుల' },
  { en: 'Bhrigu', te: 'భృగు' },
  { en: 'Sankriti', te: 'సాంకృతి' },
  { en: 'Rathithara', te: 'రథీతర' },
  { en: 'Pulastya', te: 'పులస్త్య' },
  { en: 'Pulaha', te: 'పులహ' },
  { en: 'Kratu', te: 'క్రతు' },
  { en: 'Marichi', te: 'మరీచి' },
  { en: 'Chyavana', te: 'చ్యవన' },
  { en: 'Lohita', te: 'లోహిత' },
  { en: 'Gowthama', te: 'గౌతమస' },
  { en: 'Aangirasa', te: 'ఆంగీరస' }
];

interface GothraSelectorProps {
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
}

export const GothraSelector: React.FC<GothraSelectorProps> = ({
  value,
  onChange,
  required = true
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const query = value.trim().toLowerCase();
  const matches = ALL_FAMOUS_GOTHRAS.filter(
    g => g.en.toLowerCase().includes(query) || g.te.includes(value.trim())
  );

  const exactMatch = ALL_FAMOUS_GOTHRAS.some(
    g => g.en.toLowerCase() === query || g.te === value.trim()
  );

  const handleSelect = (gothraName: string) => {
    onChange(gothraName);
    setIsOpen(false);
  };

  const handleClear = () => {
    onChange('');
    setIsOpen(true);
  };

  return (
    <div ref={containerRef} className="relative w-full">
      <div className="relative flex items-center">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            if (!isOpen) setIsOpen(true);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="గోత్రం నమోదు చేయండి లేదా ఎంచుకోండి (ఉదా: Kashyapa / కశ్యప)"
          className="w-full pl-3 pr-16 py-2.5 text-sm bg-white border border-[#E8DCCE] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C86A1B] text-[#2D2520] font-medium"
          required={required}
        />

        <div className="absolute right-2 flex items-center gap-1">
          {value ? (
            <button
              type="button"
              onClick={handleClear}
              className="p-1 rounded-full text-gray-400 hover:text-red-600 hover:bg-gray-100 transition-colors"
              title="గోత్రం తొలగించండి"
            >
              <X className="w-4 h-4" />
            </button>
          ) : (
            <Search className="w-4 h-4 text-gray-400 mr-1" />
          )}
        </div>
      </div>

      {/* Autocomplete / Recommendations Dropdown */}
      {isOpen && (
        <div className="absolute z-40 left-0 right-0 mt-1.5 bg-white border border-[#E8DCCE] rounded-xl shadow-xl max-h-64 overflow-y-auto divide-y divide-[#FAF5EC]">
          {/* Custom entry button if typed and not an exact match */}
          {value.trim().length > 0 && !exactMatch && (
            <button
              type="button"
              onClick={() => handleSelect(value.trim())}
              className="w-full px-3.5 py-2.5 text-left text-xs bg-amber-50 hover:bg-amber-100/80 text-[#7A1C23] font-bold flex items-center justify-between transition-colors border-b border-amber-200"
            >
              <span className="flex items-center gap-1.5">
                <Plus className="w-4 h-4 text-[#C86A1B]" />
                ఈ గోత్రం నమోదు చేయండి: <span className="underline font-mono">"{value.trim()}"</span>
              </span>
              <span className="text-[10px] bg-[#7A1C23] text-white px-2 py-0.5 rounded">నమోదు</span>
            </button>
          )}

          {/* Matching Famous Gothras */}
          {matches.length > 0 ? (
            matches.map((g) => {
              const isSelected = value.toLowerCase() === g.en.toLowerCase() || value === g.te;
              return (
                <button
                  key={g.en}
                  type="button"
                  onClick={() => handleSelect(g.en)}
                  className={`w-full px-3.5 py-2.5 text-left text-xs flex items-center justify-between hover:bg-[#FAF5EC] transition-colors ${
                    isSelected ? 'bg-[#FAF5EC] font-bold text-[#7A1C23]' : 'text-gray-800'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    {isSelected && <Check className="w-3.5 h-3.5 text-[#7A1C23]" />}
                    <span className="font-semibold text-sm">{g.te}</span>
                    <span className="text-gray-500 text-xs">({g.en})</span>
                  </div>
                  <span className="text-[11px] text-[#C86A1B] font-serif">గోత్రం</span>
                </button>
              );
            })
          ) : (
            <div className="px-3.5 py-3 text-xs text-gray-500 text-center">
              ఏ ప్రామాణిక గోత్రం సరిపోలలేదు. పైన ఉన్న బటన్ క్లిక్ చేసి <strong className="text-[#7A1C23]">"{value}"</strong> గా నమోదు చేయవచ్చు.
            </div>
          )}
        </div>
      )}
    </div>
  );
};
