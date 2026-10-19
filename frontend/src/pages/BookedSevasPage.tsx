import React, { useState, useEffect } from 'react';
import { Booking, Ticket } from '../types.js';
import { apiRequest } from '../api/client.js';
import { TicketPrintModal } from '../components/TicketPrintModal.js';
import { Search, Calendar, RefreshCw, Printer, BookOpen, Layers } from 'lucide-react';
import { Link } from 'react-router-dom';

export const BookedSevasPage: React.FC = () => {
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [search, setSearch] = useState('');
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split('T')[0]
  );
  const [filterAllDates, setFilterAllDates] = useState(false);
  const [isLoading, setIsLoading] = useState(true);

  // Ticket Modal State
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedBookingNumber, setSelectedBookingNumber] = useState('');
  const [selectedBookingTickets, setSelectedBookingTickets] = useState<Ticket[]>([]);

  useEffect(() => {
    loadBookings();
  }, [selectedDate, filterAllDates]);

  const loadBookings = async () => {
    setIsLoading(true);
    try {
      let url = `/bookings?search=${encodeURIComponent(search.trim())}&limit=100`;
      if (!filterAllDates && selectedDate) {
        url += `&startDate=${selectedDate}&endDate=${selectedDate}`;
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
      alert(err.message || 'Failed to retrieve tickets');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#E8DCCE]">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xl">🕉️</span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#7A1C23]">
              Booked Sevas Registry
              <span className="text-sm font-normal text-[#C86A1B] font-serif ml-2">(బుక్ చేసిన పూజలు)</span>
            </h1>
          </div>
          <p className="text-xs text-gray-600 mt-1">
            Search all bookings, inspect devotee ritual details, and reprint tickets for devotees.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Link
            to="/counter"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#7A1C23] hover:bg-[#5C1217] text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
          >
            <Layers className="w-3.5 h-3.5" />
            + New Booking
          </Link>
          <button
            onClick={loadBookings}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF5EC] border border-[#E8DCCE] text-[#7A1C23] rounded-md text-xs font-semibold hover:bg-[#F3ECE0]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh
          </button>
        </div>
      </div>

      {/* Search & Filters */}
      <div className="bg-white p-4 rounded-xl border border-[#E8DCCE] shadow-sm mb-6 space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-12 gap-3 items-center">
          <div className="sm:col-span-6 relative">
            <input
              type="text"
              placeholder="Search by Booking #, Beneficiary, Mobile, Gothra..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && loadBookings()}
              className="w-full pl-9 pr-4 py-2 bg-[#FAF5EC]/40 border border-[#E8DCCE] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#C86A1B] text-[#2D2520]"
            />
            <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
          </div>

          <div className="sm:col-span-4 flex items-center gap-2">
            <input
              type="date"
              disabled={filterAllDates}
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="px-2.5 py-1.5 bg-white border border-[#E8DCCE] rounded-md text-xs text-[#2D2520] disabled:bg-gray-100 disabled:text-gray-400"
            />
            <label className="flex items-center gap-1.5 text-xs text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={filterAllDates}
                onChange={(e) => setFilterAllDates(e.target.checked)}
                className="rounded border-[#E8DCCE] text-[#7A1C23] focus:ring-[#7A1C23]"
              />
              <span>All Dates</span>
            </label>
          </div>

          <div className="sm:col-span-2">
            <button
              onClick={loadBookings}
              className="w-full py-2 bg-[#FAF5EC] hover:bg-[#F3ECE0] border border-[#E8DCCE] text-[#7A1C23] font-bold rounded-lg text-xs transition-colors"
            >
              Search
            </button>
          </div>
        </div>
      </div>

      {/* Bookings Table */}
      <div className="bg-white rounded-xl border border-[#E8DCCE] shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="p-8 text-center text-xs text-gray-500">
            Loading booked sevas...
          </div>
        ) : bookings.length === 0 ? (
          <div className="p-8 text-center text-xs text-gray-500 space-y-2">
            <BookOpen className="w-8 h-8 text-gray-300 mx-auto" />
            <div className="font-semibold text-[#7A1C23]">No Bookings Found</div>
            <div>Try adjusting your date filter or search query.</div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF5EC] text-gray-700 font-semibold border-b border-[#E8DCCE]">
                <tr>
                  <th className="py-3 px-4">Booking Ref</th>
                  <th className="py-3 px-4">Booking Date / Time</th>
                  <th className="py-3 px-4">Ritual Beneficiary (కర్త)</th>
                  <th className="py-3 px-4">Gothra (గోత్రం)</th>
                  <th className="py-3 px-4">Family / Sankalpa</th>
                  <th className="py-3 px-4">Total Amount</th>
                  <th className="py-3 px-4">Payment</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FAF5EC]">
                {bookings.map((b) => (
                  <tr key={b.id} className="hover:bg-[#FAF5EC]/30">
                    <td className="py-3 px-4 font-mono font-bold text-[#7A1C23]">
                      {b.booking_number}
                      <div className="text-[10px] text-gray-400 font-sans">
                        {b.ticket_count || 1} {b.ticket_count === 1 ? 'ticket' : 'tickets'}
                      </div>
                    </td>
                    <td className="py-3 px-4 text-gray-600">
                      {new Date(b.created_at).toLocaleString('en-IN', {
                        timeZone: 'Asia/Kolkata',
                        dateStyle: 'medium',
                        timeStyle: 'short'
                      })}
                    </td>
                    <td className="py-3 px-4">
                      <div className="font-bold text-[#2D2520]">{b.ritual_beneficiary_name}</div>
                      {b.payer_mobile && (
                        <div className="text-[10px] text-gray-400">📱 {b.payer_mobile}</div>
                      )}
                    </td>
                    <td className="py-3 px-4 font-semibold text-[#C86A1B]">
                      {b.gothra}
                    </td>
                    <td className="py-3 px-4 text-gray-600 max-w-xs truncate">
                      {b.family_details || <span className="text-gray-300 italic">Self</span>}
                    </td>
                    <td className="py-3 px-4 font-extrabold text-[#2D2520]">
                      ₹{parseFloat(b.total_amount as any).toFixed(2)}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold uppercase ${
                        b.payment_status === 'confirmed'
                          ? 'bg-emerald-100 text-emerald-800'
                          : b.payment_status === 'pending'
                          ? 'bg-amber-100 text-amber-800'
                          : 'bg-rose-100 text-rose-800'
                      }`}>
                        {b.payment_method} • {b.payment_status}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleInspectTickets(b.id)}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-[#FAF5EC] hover:bg-[#F3ECE0] border border-[#E8DCCE] text-[#7A1C23] font-bold rounded text-xs transition-colors"
                      >
                        <Printer className="w-3.5 h-3.5 text-[#C86A1B]" />
                        Tickets / Reprint
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

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
