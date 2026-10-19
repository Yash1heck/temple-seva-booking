import React from 'react';
import { Ticket } from '../types.js';
import { Printer, X, RotateCcw, CheckCircle2 } from 'lucide-react';
import { apiRequest } from '../api/client.js';

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
      // Automatically trigger browser print after incrementing reprint count
      setTimeout(() => {
        window.print();
      }, 100);
    } catch (err: any) {
      alert(err.message || 'Failed to reprint ticket');
    } finally {
      setReprintingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-y-auto bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl bg-[#FDFBF7] rounded-xl shadow-2xl border border-[#E8DCCE] overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="bg-[#FAF5EC] px-6 py-4 border-b border-[#E8DCCE] flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#FDF4EB] border border-[#C86A1B]/30 flex items-center justify-center text-[#7A1C23] font-serif text-lg">
              🕉️
            </div>
            <div>
              <h2 className="text-base font-bold text-[#7A1C23]">
                Seva Tickets Issued ({tickets.length} {tickets.length === 1 ? 'Ticket' : 'Tickets'})
              </h2>
              <p className="text-xs text-gray-500">Booking Ref: <span className="font-semibold text-[#2D2520]">{bookingNumber}</span></p>
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
        <div className="bg-white px-6 py-3 border-b border-[#E8DCCE] flex items-center justify-between">
          <div className="flex items-center gap-2 text-emerald-800 text-xs font-medium">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            Booking persisted to PostgreSQL successfully.
          </div>
          <button
            onClick={handleBrowserPrint}
            className="flex items-center gap-2 px-4 py-2 bg-[#7A1C23] hover:bg-[#5C1217] text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
          >
            <Printer className="w-4 h-4" />
            Print All ({tickets.length}) Tickets
          </button>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4 bg-[#F3ECE0]/30">
          {tickets.map((t, idx) => (
            <div
              key={t.id}
              className="bg-white rounded-lg border border-[#E8DCCE] p-4 shadow-sm relative space-y-2 font-mono text-xs text-[#2D2520]"
            >
              <div className="flex justify-between items-start border-b border-dashed border-gray-300 pb-2">
                <div>
                  <div className="font-bold text-sm text-[#7A1C23]">{templeInfo.name}</div>
                  <div className="text-[11px] text-gray-500 font-sans">{templeInfo.tagline}</div>
                </div>
                <div className="text-right">
                  <span className="font-bold px-2 py-0.5 bg-[#FAF5EC] border border-[#E8DCCE] rounded text-[#7A1C23]">
                    {t.ticket_number}
                  </span>
                  {t.reprint_count > 0 && (
                    <div className="mt-1 text-[10px] text-amber-700 font-bold bg-amber-50 border border-amber-200 px-1 rounded">
                      REPRINT (#{t.reprint_count})
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2 text-[11px] py-1">
                <div>
                  <span className="text-gray-500">Seva:</span> <span className="font-bold text-[#7A1C23]">{t.seva_name}</span>
                </div>
                <div>
                  <span className="text-gray-500">Amount:</span> <span className="font-bold">₹{parseFloat(t.amount as any).toFixed(2)}</span>
                </div>
                <div>
                  <span className="text-gray-500">Beneficiary:</span> <span className="font-bold">{t.ritual_beneficiary_name}</span>
                </div>
                <div>
                  <span className="text-gray-500">Gothra:</span> <span className="font-bold">{t.gothra}</span>
                </div>
                {t.family_details && (
                  <div className="col-span-2">
                    <span className="text-gray-500">Family:</span> {t.family_details}
                  </div>
                )}
                <div>
                  <span className="text-gray-500">Booked:</span> {new Date(t.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                </div>
                <div>
                  <span className="text-gray-500">Status:</span> <span className="text-emerald-700 font-semibold uppercase">{t.status}</span>
                </div>
              </div>

              <div className="border-t border-dashed border-gray-300 pt-2 flex justify-between items-center text-[10px] text-gray-500 font-sans">
                <span>Item {idx + 1} of {tickets.length}</span>
                <button
                  onClick={() => handleReprintSingle(t.id)}
                  disabled={reprintingId === t.id}
                  className="flex items-center gap-1 text-[#7A1C23] hover:underline font-semibold"
                >
                  <RotateCcw className="w-3 h-3" />
                  Reprint this ticket
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Footer */}
        <div className="bg-[#FAF5EC] px-6 py-3 border-t border-[#E8DCCE] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 border border-[#E8DCCE] bg-white text-[#2D2520] hover:bg-gray-50 rounded-md text-xs font-semibold"
          >
            Done / Next Booking
          </button>
        </div>
      </div>

      {/* HIDDEN CONTAINER FOR BROWSER THERMAL PRINTING (80mm) */}
      <div id="thermal-print-container" className="hidden print:block">
        {tickets.map((t, idx) => (
          <div key={`print-${t.id}`} className="ticket-thermal-page">
            <div style={{ textAlign: 'center', marginBottom: '3mm' }}>
              <div style={{ fontSize: '13px', fontWeight: 'bold' }}>{templeInfo.name}</div>
              {templeInfo.telugu_name && (
                <div style={{ fontSize: '11px' }}>{templeInfo.telugu_name}</div>
              )}
              <div style={{ fontSize: '9px' }}>{templeInfo.tagline}</div>
              <div style={{ fontSize: '9px' }}>{templeInfo.contact_phone}</div>
              <div style={{ margin: '2mm 0', borderBottom: '1px dashed #000' }} />
              <div style={{ fontSize: '11px', fontWeight: 'bold' }}>SEVA PRASADA RECEIPT</div>
            </div>

            <div style={{ fontSize: '10px', lineHeight: '1.4' }}>
              <div><strong>Ticket No:</strong> {t.ticket_number}</div>
              <div><strong>Booking Ref:</strong> {bookingNumber}</div>
              <div><strong>Date:</strong> {new Date(t.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}</div>
              <div style={{ margin: '1mm 0', borderBottom: '1px dashed #000' }} />

              <div><strong>Seva:</strong> {t.seva_name}</div>
              <div><strong>Ritual Beneficiary:</strong> {t.ritual_beneficiary_name}</div>
              <div><strong>Gothra:</strong> {t.gothra}</div>
              {t.family_details && (
                <div><strong>Family Details:</strong> {t.family_details}</div>
              )}

              <div style={{ margin: '1mm 0', borderBottom: '1px dashed #000' }} />
              <div><strong>Amount:</strong> Rs. {parseFloat(t.amount as any).toFixed(2)}</div>
              <div><strong>Payment:</strong> Confirmed ({t.payment_method?.toUpperCase() || 'CASH'})</div>
              {t.reprint_count > 0 && (
                <div style={{ fontWeight: 'bold', marginTop: '1mm' }}>
                  *** DUPLICATE / REPRINT (#{t.reprint_count}) ***
                </div>
              )}
            </div>

            <div style={{ textAlign: 'center', marginTop: '3mm', fontSize: '9px', borderTop: '1px dashed #000', paddingTop: '2mm' }}>
              <div>॥ శ్రీ శారదాంబికాయై నమః ॥</div>
              <div>Sarve Janah Sukhino Bhavantu</div>
              <div>Item {idx + 1} of {tickets.length}</div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

