import React from 'react';
import { createPortal } from 'react-dom';
import { Ticket } from '../types.js';
import { Printer, X, RotateCcw, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../api/client.js';
import { formatTempleDateTime } from '../utils/date.js';
import { formatCurrency } from '../utils/format.js';
import { toTeluguText, formatTeluguGothram } from '../utils/teluguTransliterate.js';

interface TicketPrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  bookingNumber: string;
  tickets: Ticket[];
  onTicketsUpdated?: (tickets: Ticket[]) => void;
  templeInfo?: {
    name: string;
    telugu_name?: string;
    address?: string;
    contact_phone?: string;
    tagline?: string;
  };
}

export const TicketPrintModal: React.FC<TicketPrintModalProps> = ({
  isOpen,
  onClose,
  bookingNumber,
  tickets: initialTickets,
  onTicketsUpdated,
  templeInfo = {
    name: 'Sri Sharada Peetham Temple',
    telugu_name: 'శ్రీ శారదా పీఠం సన్నిధానం',
    address: 'Temple Road, Sacred Kshetram',
    contact_phone: '+91 8265 250123',
    tagline: 'శృంగేరి జగద్గురు శంకరాచార్య మహాసంస్థానం'
  }
}) => {
  const [tickets, setTickets] = React.useState<Ticket[]>(initialTickets);
  const [reprintingId, setReprintingId] = React.useState<string | null>(null);

  React.useEffect(() => {
    setTickets(initialTickets);
  }, [initialTickets]);

  if (!isOpen) return null;

  const handleBrowserPrint = () => {
    window.print();
  };

  const handleReprintSingle = async (ticketId: string) => {
    setReprintingId(ticketId);
    try {
      const updated = await apiRequest<Ticket>(`/tickets/${ticketId}/reprint`, { method: 'POST' });
      const newTickets = tickets.map(t => t.id === ticketId ? updated : t);
      setTickets(newTickets);
      if (onTicketsUpdated) onTicketsUpdated(newTickets);
      setTimeout(() => {
        window.print();
      }, 100);
    } catch (err: any) {
      alert(err.message || 'టికెట్ పునఃముద్రణ విఫలమైంది');
    } finally {
      setReprintingId(null);
    }
  };

  return (
    <>
      <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-3 sm:p-4 print:hidden">
        <div className="relative w-full max-w-2xl bg-[#FDFBF7] rounded-xl shadow-2xl border border-[#E8DCCE] overflow-hidden flex flex-col max-h-[92vh]">
        {/* Header */}
        <div className="bg-[#FAF5EC] px-4 sm:px-6 py-3.5 border-b border-[#E8DCCE] flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-full bg-[#FDF4EB] border border-[#C86A1B]/30 flex items-center justify-center text-[#7A1C23] font-serif text-lg shrink-0">
              🕉️
            </div>
            <div>
              <h2 className="text-sm sm:text-base font-bold text-[#7A1C23] font-serif">
                పూజా సేవా రసీదులు ({tickets.length} టికెట్లు జారీ అయ్యాయి)
              </h2>
              <p className="text-[11px] text-gray-500">
                బుకింగ్ సంఖ్య: <span className="font-mono font-bold text-[#2D2520]">{bookingNumber}</span>
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 p-1 rounded-md"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Action Bar */}
        <div className="bg-white px-4 sm:px-6 py-2.5 border-b border-[#E8DCCE] flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div className="flex items-center gap-1.5 text-emerald-800 text-xs font-semibold">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            బుకింగ్ విజయవంతంగా నమోదైంది.
          </div>
          <button
            onClick={handleBrowserPrint}
            className="flex items-center justify-center gap-2 px-4 py-2 bg-[#7A1C23] hover:bg-[#5C1217] text-white rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            <Printer className="w-4 h-4 text-[#E0AE18]" />
            అన్ని టికెట్లను ముద్రించండి ({tickets.length})
          </button>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-6 space-y-3 bg-[#F3ECE0]/30">
          {tickets.map((t, idx) => (
            <div
              key={t.id}
              className="bg-white rounded-xl border border-[#E8DCCE] p-3.5 sm:p-4 shadow-xs relative space-y-2 text-xs text-[#2D2520]"
            >
              <div className="flex justify-between items-start border-b border-dashed border-gray-300 pb-2">
                <div>
                  <div className="font-bold text-sm text-[#7A1C23] font-serif">
                    {templeInfo.telugu_name || templeInfo.name}
                  </div>
                  <div className="text-[11px] text-gray-500">{templeInfo.tagline}</div>
                </div>
                <div className="text-right">
                  <span className="font-mono font-bold px-2 py-0.5 bg-[#FAF5EC] border border-[#E8DCCE] rounded text-[#7A1C23]">
                    {t.ticket_number}
                  </span>
                  {t.reprint_count > 0 && (
                    <div className="mt-1 text-[10px] text-amber-800 font-bold bg-amber-50 border border-amber-300 px-1 rounded">
                      పునఃముద్రణ (#{t.reprint_count})
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs py-1">
                <div>
                  <span className="text-gray-500">పూజా సేవ:</span> <span className="font-bold text-[#7A1C23]">{t.seva_name}</span>
                </div>
                <div>
                  <span className="text-gray-500">సేవా రుసుము:</span> <span className="font-bold">రూ. {formatCurrency(t.amount)}</span>
                </div>
                <div>
                  <span className="text-gray-500">సంకల్ప కర్త:</span>{' '}
                  <span className="font-bold text-[#7A1C23]">
                    {toTeluguText(t.ritual_beneficiary_name)}
                    {toTeluguText(t.ritual_beneficiary_name) !== t.ritual_beneficiary_name && (
                      <span className="text-[11px] font-normal text-gray-500 ml-1">({t.ritual_beneficiary_name})</span>
                    )}
                  </span>
                </div>
                <div>
                  <span className="text-gray-500">గోత్రం:</span>{' '}
                  <span className="font-bold text-amber-950">
                    {formatTeluguGothram(t.gothra)}
                    {formatTeluguGothram(t.gothra) !== t.gothra && (
                      <span className="text-[11px] font-normal text-gray-500 ml-1">({t.gothra})</span>
                    )}
                  </span>
                </div>
                {t.family_details && (
                  <div className="sm:col-span-2">
                    <span className="text-gray-500">కుటుంబ సభ్యులు:</span>{' '}
                    <span className="font-medium text-gray-800">
                      {toTeluguText(t.family_details)}
                      {toTeluguText(t.family_details) !== t.family_details && (
                        <span className="text-[11px] font-normal text-gray-500 ml-1">({t.family_details})</span>
                      )}
                    </span>
                  </div>
                )}
                <div>
                  <span className="text-gray-500">బుకింగ్ సమయం:</span> {formatTempleDateTime(t.created_at)}
                </div>
                <div>
                  <span className="text-gray-500">చెల్లింపు:</span> <span className="text-emerald-700 font-bold">{t.payment_method === 'cash' ? 'నగదు చెల్లింపు' : 'యూపీఐ డిజిటల్ చెల్లింపు'}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-300 pt-2 flex justify-between items-center text-[11px] text-gray-500">
                <span>టికెట్ {idx + 1} / {tickets.length}</span>
                <button
                  onClick={() => handleReprintSingle(t.id)}
                  disabled={reprintingId === t.id}
                  className="flex items-center gap-1 text-[#7A1C23] hover:underline font-bold"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  ఈ టికెట్ మళ్లీ ముద్రించండి
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-[#FAF5EC] px-4 sm:px-6 py-3 border-t border-[#E8DCCE] flex justify-end">
          <button
            onClick={onClose}
            className="w-full sm:w-auto px-5 py-2.5 bg-[#7A1C23] text-white hover:bg-[#5C1217] rounded-lg text-xs font-bold shadow-xs transition-colors"
          >
            పూర్తయింది / తదుపరి బుకింగ్ చేయండి
          </button>
        </div>
      </div>
    </div>

    {createPortal(
      /* BROWSER THERMAL PRINTING (80mm) PORTALED DIRECTLY TO BODY */
      <div id="thermal-print-container" className="hidden print:block">
        {tickets.map((t, idx) => (
          <div key={`print-${t.id}`} className="ticket-thermal-page">
            <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold' }}>॥ శ్రీ శారదా పరమేశ్వరీ ప్రసన్నం ॥</div>
              <div style={{ fontSize: '14px', fontWeight: 'bold', color: '#000', margin: '1mm 0' }}>{templeInfo.telugu_name || 'శ్రీ శృంగేరి శారదా పీఠం సన్నిధానం'}</div>
              <div style={{ fontSize: '10px' }}>{templeInfo.tagline || 'శ్రీ జగద్గురు శంకరాచార్య మహాసంస్థానం'}</div>
              {templeInfo.address && <div style={{ fontSize: '9px' }}>{templeInfo.address}</div>}
              {templeInfo.contact_phone && <div style={{ fontSize: '9px' }}>ఫోన్: {templeInfo.contact_phone}</div>}
              <div style={{ margin: '2mm 0', borderBottom: '1px dashed #000' }} />
              <div style={{ fontSize: '13px', fontWeight: 'bold' }}>పవిత్ర పూజా సేవా రశీదు</div>
            </div>

            <div style={{ fontSize: '10.5px', lineHeight: '1.5' }}>
              <div><strong>టికెట్ సంఖ్య:</strong> <span style={{ fontFamily: 'monospace', fontWeight: 'bold' }}>{t.ticket_number}</span></div>
              <div><strong>బుకింగ్ సంఖ్య:</strong> <span style={{ fontFamily: 'monospace' }}>{bookingNumber}</span></div>
              <div><strong>జారీ తేదీ & సమయం:</strong> {formatTempleDateTime(t.created_at)}</div>
              <div style={{ margin: '1.5mm 0', borderBottom: '1px dashed #000' }} />

              <div style={{ fontSize: '11.5px', margin: '1mm 0' }}><strong>పూజా సేవ:</strong> <strong>{t.seva_name}</strong></div>
              <div><strong>సంకల్ప కర్త:</strong> <strong>{toTeluguText(t.ritual_beneficiary_name)}</strong></div>
              <div><strong>గోత్రము:</strong> <strong>{formatTeluguGothram(t.gothra)}</strong></div>
              {t.family_details && (
                <div><strong>కుటుంబ సభ్యుల పేర్లు:</strong> {toTeluguText(t.family_details)}</div>
              )}

              <div style={{ margin: '1.5mm 0', borderBottom: '1px dashed #000' }} />
              <div style={{ fontSize: '12px' }}><strong>సేవా రుసుము:</strong> <strong>రూ. {formatCurrency(t.amount)}/-</strong></div>
              <div><strong>చెల్లింపు విధానం:</strong> {t.payment_method === 'cash' ? 'నగదు చెల్లింపు (స్వీకరించబడింది)' : 'యూపీఐ డిజిటల్ చెల్లింపు (స్వీకరించబడింది)'}</div>
              {t.reprint_count > 0 && (
                <div style={{ fontWeight: 'bold', marginTop: '1.5mm', fontSize: '10px', textAlign: 'center' }}>
                  *** పునఃముద్రిత రశీదు (ద్వితీయ ప్రతి - #{t.reprint_count}) ***
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center', marginTop: '3mm', fontSize: '9.5px', borderTop: '1px dashed #000', paddingTop: '2mm', lineHeight: '1.4' }}>
              <div style={{ fontWeight: 'bold' }}>॥ శ్రీ శారదాంబికాయై నమః ॥</div>
              <div>సర్వే జనాః సుఖినో భవంతు • సమస్త సన్మంగళాని భవంతు</div>
              <div style={{ marginTop: '1mm', fontSize: '8.5px' }}>సంకల్ప సమయమున ఈ రశీదును ఆలయ పూజారి వారికి అందజేయగలరు.</div>
              <div style={{ marginTop: '1mm', fontSize: '8px' }}>రశీదు సంఖ్య {idx + 1} / మొత్తం {tickets.length}</div>
            </div>
          </div>
        ))}
      </div>,
      document.body
    )}
  </>
  );
};
