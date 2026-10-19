import React, { useState } from 'react';

export const STANDARD_GOTHRAS = [
  { en: 'Kashyapa', te: 'కశ్యప' },
  { en: 'Bharadwaja', te: 'భరద్వాజ' },
  { en: 'Harithasa', te: 'హరితస' },
  { en: 'Vasishta', te: 'వసిష్ఠ' },
  { en: 'Viswamitra', te: 'విశ్వామిత్ర' },
  { en: 'Gautama', te: 'గౌతమ' },
  { en: 'Jamadagni', te: 'జమదగ్ని' },
  { en: 'Atreya', te: 'ఆత్రేయ' },
  { en: 'Agasthya', te: 'అగస్త్య' },
  { en: 'Kaundinya', te: 'కౌండిన్య' },
  { en: 'Gargya', te: 'గార్గ్య' },
  { en: 'Angirasa', te: 'ఆంగిరస' },
  { en: 'Sandilya', te: 'శాండిల్య' },
  { en: 'Mudgala', te: 'ముద్గల' },
  { en: 'Kausika', te: 'కౌశిక' },
  { en: 'Srivatsa', te: 'శ్రీవత్స' },
  { en: 'Dhananjaya', te: 'ధనంజయ' },
  { en: 'Parasara', te: 'పరాశర' },
  { en: 'Maudgalya', te: 'మౌద్గల్య' },
  { en: 'Kanva', te: 'కణ్వ' },
  { en: 'Kutsa', te: 'కుత్స' }
];

interface GothraSelectorProps {
  value: string;
  onChange: (val: string) => void;
  required?: boolean;
}

export const GothraSelector: React.FC<GothraSelectorProps> = ({ value, onChange, required = true }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');

  const filtered = STANDARD_GOTHRAS.filter(
    g => g.en.toLowerCase().includes(searchTerm.toLowerCase()) || g.te.includes(searchTerm)
  );

  return (
    <div className="relative">
      <div className="flex gap-2">
        <input
          type="text"
          value={value}
          onChange={(e) => {
            onChange(e.target.value);
            setSearchTerm(e.target.value);
          }}
          onFocus={() => setIsOpen(true)}
          placeholder="e.g. Kashyapa / కశ్యప"
          className="w-full px-3 py-2 text-sm bg-white border border-[#E8DCCE] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C86A1B] text-[#2D2520]"
          required={required}
        />
        <button
          type="button"
          onClick={() => setIsOpen(!isOpen)}
          className="px-3 py-2 bg-[#FAF5EC] border border-[#E8DCCE] rounded-md text-xs font-medium text-[#7A1C23] hover:bg-[#F3ECE0]"
        >
          {isOpen ? 'Close' : 'Select'}
        </button>
      </div>

      {isOpen && (
        <div className="absolute z-30 mt-1 w-full bg-white border border-[#E8DCCE] rounded-md shadow-lg max-h-56 overflow-y-auto">
          <div className="p-2 border-b border-[#E8DCCE] bg-[#FAF5EC]">
            <input
              type="text"
              placeholder="Search Gothra..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full px-2 py-1 text-xs bg-white border border-[#E8DCCE] rounded"
              autoFocus
            />
          </div>
          <div className="divide-y divide-[#FAF5EC]">
            {filtered.map((g) => (
              <button
                key={g.en}
                type="button"
                onClick={() => {
                  onChange(g.en);
                  setIsOpen(false);
                  setSearchTerm('');
                }}
                className="w-full text-left px-3 py-2 text-xs hover:bg-[#FAF5EC] flex justify-between items-center"
              >
                <span className="font-medium text-[#2D2520]">{g.en}</span>
                <span className="text-[#7A1C23] font-serif">{g.te}</span>
              </button>
            ))}
            {filtered.length === 0 && (
              <div className="px-3 py-2 text-xs text-gray-500">
                Custom Gothra: "{searchTerm}". Click input to save directly.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

