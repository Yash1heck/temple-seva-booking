import React, { useState, useEffect } from 'react';
import { Seva, CartItem, Ticket, Devotee } from '../types.js';
import { apiRequest } from '../api/client.js';
import { DevoteeLookup } from '../components/DevoteeLookup.js';
import { GothraSelector } from '../components/GothraSelector.js';
import { TicketPrintModal } from '../components/TicketPrintModal.js';
import { UpiQrCode } from '../components/UpiQrCode.js';
import {
  Search, Plus, Minus, Trash2, ShoppingBag, CheckCircle,
  QrCode, Banknote, AlertTriangle, Sparkles, RefreshCw, Calendar
} from 'lucide-react';

export const BookingCounterPage: React.FC = () => {
  const [sevas, setSevas] = useState<Seva[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingSevas, setIsLoadingSevas] = useState(true);

  // Cart & Ritual State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [devoteeId, setDevoteeId] = useState<string | null>(null);
  const [payerName, setPayerName] = useState('');
  const [payerMobile, setPayerMobile] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [gothra, setGothra] = useState('Kashyapa');
  const [familyDetails, setFamilyDetails] = useState('');

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');
  const [paymentStatus, setPaymentStatus] = useState<'confirmed' | 'pending'>('confirmed');
  const [upiRef, setUpiRef] = useState('');
  const [templeUpiConfig, setTempleUpiConfig] = useState<any>(null);

  // Submission & Print State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printedBookingNumber, setPrintedBookingNumber] = useState('');
  const [issuedTickets, setIssuedTickets] = useState<Ticket[]>([]);

  // Load Sevas Catalogue & UPI Configuration
  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoadingSevas(true);
    try {
      const [sevasData, settingsData] = await Promise.all([
        apiRequest<Seva[]>('/sevas'),
        apiRequest<any>('/settings')
      ]);
      setSevas(sevasData);
      if (settingsData?.upi_config) {
        setTempleUpiConfig(settingsData.upi_config);
      }
    } catch (err) {
      console.error('Failed to load sevas catalogue', err);
    } finally {
      setIsLoadingSevas(false);
    }
  };

  // Filter Sevas
  const categories = ['All', ...Array.from(new Set(sevas.map(s => s.category)))];

  const filteredSevas = sevas.filter(s => {
    const matchesCategory = selectedCategory === 'All' || s.category === selectedCategory;
    const matchesSearch = s.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          (s.telugu_name && s.telugu_name.includes(searchQuery));
    return matchesCategory && matchesSearch;
  });

  // Devotee Selection handler
  const handleSelectDevotee = (d: Devotee | null, suggested?: { name: string; gothra: string; family: string }) => {
    if (d && suggested) {
      setDevoteeId(d.id);
      setPayerName(d.name);
      setPayerMobile(d.mobile);
      if (!beneficiaryName) setBeneficiaryName(suggested.name);
      if (suggested.gothra) setGothra(suggested.gothra);
      if (suggested.family) setFamilyDetails(suggested.family);
    } else {
      setDevoteeId(null);
    }
  };

  // Add Seva to Cart
  const addToCart = (seva: Seva) => {
    setErrorBanner(null);
    const existingIndex = cart.findIndex(c => c.seva.id === seva.id);
    if (existingIndex >= 0) {
      const updated = [...cart];
      updated[existingIndex].quantity += 1;
      setCart(updated);
    } else {
      setCart([...cart, { seva, quantity: 1 }]);
    }
  };

  // Update Cart Quantity
  const updateQuantity = (sevaId: string, delta: number) => {
    const updated = cart.map(c => {
      if (c.seva.id === sevaId) {
        const newQty = c.quantity + delta;
        return newQty > 0 ? { ...c, quantity: newQty } : null;
      }
      return c;
    }).filter(Boolean) as CartItem[];
    setCart(updated);
  };

  const removeFromCart = (sevaId: string) => {
    setCart(cart.filter(c => c.seva.id !== sevaId));
  };

  const clearCart = () => {
    setCart([]);
    setErrorBanner(null);
  };

  // Calculate Total
  const cartTotal = cart.reduce((sum, item) => sum + (item.seva.price * item.quantity), 0);
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  // Submit Booking
  const handleConfirmBooking = async () => {
    setErrorBanner(null);

    if (!beneficiaryName.trim()) {
      setErrorBanner('Please enter the Ritual Beneficiary Name (the person for whom the pooja is performed).');
      return;
    }

    if (!gothra.trim()) {
      setErrorBanner('Please select or specify the Devotee Gothra.');
      return;
    }

    if (cart.length === 0) {
      setErrorBanner('Your cart is empty. Please select at least one seva item.');
      return;
    }

    setIsSubmitting(true);
    const idempotencyKey = `booking-${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;

    try {
      const payload = {
        devotee_id: devoteeId,
        payer_name: payerName.trim() || beneficiaryName.trim(),
        payer_mobile: payerMobile.trim() || null,
        ritual_beneficiary_name: beneficiaryName.trim(),
        gothra: gothra.trim(),
        family_details: familyDetails.trim() || null,
        items: cart.map(c => ({
          seva_id: c.seva.id,
          quantity: c.quantity,
          ritual_beneficiary_name: beneficiaryName.trim(),
          gothra: gothra.trim()
        })),
        payment: {
          method: paymentMethod,
          status: paymentMethod === 'cash' ? 'confirmed' : paymentStatus,
          transaction_reference: upiRef.trim() || null
        },
        client_submitted_total: cartTotal,
        idempotency_key: idempotencyKey
      };

      const res = await apiRequest<{
        booking: any;
        items: any[];
        tickets: Ticket[];
        payment: any;
      }>('/bookings', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      // Booking succeeded!
      setPrintedBookingNumber(res.booking.booking_number);
      setIssuedTickets(res.tickets);
      setPrintModalOpen(true);

      // Reset form for next booking
      clearCart();
      setBeneficiaryName('');
      setFamilyDetails('');
      setDevoteeId(null);
      setPayerName('');
      setPayerMobile('');
      setUpiRef('');
      setPaymentMethod('cash');
      setPaymentStatus('confirmed');
    } catch (err: any) {
      setErrorBanner(err.message || 'Failed to complete booking. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Top Welcome & Mode Indicator */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#E8DCCE]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#7A1C23] flex items-center gap-2">
            <span className="font-serif">🕉️</span> Seva Booking Counter
            <span className="text-sm font-normal text-[#C86A1B] font-serif">(పూజా బుకింగ్ కౌంటర్)</span>
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">
            Record pooja bookings, capture gothra & family sankalpa details, and print individual 80mm seva tickets.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/bookings"
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF5EC] border border-[#E8DCCE] text-[#7A1C23] rounded-md text-xs font-semibold hover:bg-[#F3ECE0]"
          >
            📋 View Booked Sevas
          </a>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF5EC] border border-[#E8DCCE] text-[#7A1C23] rounded-md text-xs font-semibold hover:bg-[#F3ECE0]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Refresh Sevas
          </button>
        </div>
      </div>

      {/* Main Counter Layout: 2-Column Responsive Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6">
        {/* LEFT COLUMN: Seva Catalogue & Search (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search & Category Tabs */}
          <div className="bg-white p-4 rounded-xl border border-[#E8DCCE] shadow-sm space-y-3">
            <div className="relative">
              <input
                type="text"
                placeholder="Search Seva (e.g., Archana, Abhishekam, అర్చన)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 bg-[#FAF5EC]/50 border border-[#E8DCCE] rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-[#C86A1B] text-[#2D2520]"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-3" />
            </div>

            {/* Category Pills */}
            <div className="flex flex-wrap gap-1.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-3 py-1 rounded-full text-xs font-medium transition-colors ${
                    selectedCategory === cat
                      ? 'bg-[#7A1C23] text-white shadow-sm'
                      : 'bg-[#FAF5EC] text-[#2D2520] hover:bg-[#F3ECE0] border border-[#E8DCCE]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Sevas Grid */}
          {isLoadingSevas ? (
            <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-[#E8DCCE]">
              Loading devotional sevas...
            </div>
          ) : filteredSevas.length === 0 ? (
            <div className="p-8 text-center text-gray-500 bg-white rounded-xl border border-[#E8DCCE]">
              No active sevas match your filter.
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              {filteredSevas.map((seva) => (
                <div
                  key={seva.id}
                  className="bg-white p-4 rounded-xl border border-[#E8DCCE] hover:border-[#C86A1B] transition-all hover:shadow-md flex flex-col justify-between"
                >
                  <div>
                    <div className="flex items-start justify-between gap-2">
                      <div>
                        <h3 className="font-bold text-sm text-[#7A1C23]">{seva.name}</h3>
                        {seva.telugu_name && (
                          <div className="text-xs text-[#C86A1B] font-serif">{seva.telugu_name}</div>
                        )}
                      </div>
                      <span className="text-base font-extrabold text-[#2D2520] bg-[#FAF5EC] px-2.5 py-1 rounded border border-[#E8DCCE]">
                        ₹{seva.price.toFixed(0)}
                      </span>
                    </div>

                    {seva.is_scheduled && seva.scheduled_date && (
                      <div className="mt-2 inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-50 border border-amber-200 text-amber-900">
                        <Calendar className="w-3 h-3 text-amber-700" />
                        Scheduled: {seva.scheduled_date}
                      </div>
                    )}

                    {seva.timing && (
                      <div className="text-[11px] text-gray-500 mt-1">
                        ⏰ {seva.timing}
                      </div>
                    )}

                    {seva.description && (
                      <p className="text-xs text-gray-600 mt-1.5 line-clamp-2">
                        {seva.description}
                      </p>
                    )}
                  </div>

                  <div className="mt-4 pt-3 border-t border-[#FAF5EC] flex justify-between items-center">
                    <span className="text-[10px] uppercase font-semibold text-gray-400">
                      {seva.category}
                    </span>
                    <button
                      type="button"
                      onClick={() => addToCart(seva)}
                      className="flex items-center gap-1.5 px-3 py-1.5 bg-[#C86A1B] hover:bg-[#A65311] text-white rounded-md text-xs font-semibold shadow-sm transition-colors"
                    >
                      <Plus className="w-3.5 h-3.5" />
                      Add to Cart
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Devotee & Cart Area (5 Cols) */}
        <div className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-[#E8DCCE] shadow-md p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DCCE]">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#7A1C23]" />
                <h2 className="text-base font-bold text-[#7A1C23]">
                  Current Booking Cart
                </h2>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-gray-500 hover:text-red-700 flex items-center gap-1"
                >
                  <Trash2 className="w-3.5 h-3.5" /> Clear Cart
                </button>
              )}
            </div>

            {/* Error Notification Banner */}
            {errorBanner && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 flex-shrink-0 mt-0.5" />
                <div className="leading-tight">{errorBanner}</div>
              </div>
            )}

            {/* Devotee Lookup / Mobile */}
            <DevoteeLookup
              onSelectDevotee={handleSelectDevotee}
              payerMobile={payerMobile}
              setPayerMobile={setPayerMobile}
              payerName={payerName}
              setPayerName={setPayerName}
            />

            {/* Ritual Beneficiary & Sankalpa Fields */}
            <div className="space-y-3 pt-1">
              <div className="p-3 bg-[#FAF5EC]/60 border border-[#E8DCCE] rounded-lg space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold uppercase tracking-wider text-[#7A1C23] flex items-center gap-1">
                    <Sparkles className="w-3.5 h-3.5 text-[#C86A1B]" />
                    Ritual Beneficiary (సంకల్ప కర్త)
                  </label>
                  <span className="text-[10px] text-gray-500">1 Beneficiary Per Cart</span>
                </div>

                <div>
                  <input
                    type="text"
                    required
                    placeholder="Beneficiary Name (e.g. Venkata Raman / సీతారాములు)"
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E8DCCE] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C86A1B] text-[#2D2520] font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Gothra (గోత్రం)
                  </label>
                  <GothraSelector value={gothra} onChange={setGothra} />
                </div>

                <div>
                  <label className="block text-[11px] font-semibold text-gray-600 mb-1">
                    Family Names / Nakshatras (కుటుంబ సభ్యులు / నక్షత్రం)
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Wife: Lakshmi, Son: Srivatsa (Anuradha Nakshatra)"
                    value={familyDetails}
                    onChange={(e) => setFamilyDetails(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E8DCCE] rounded-md focus:outline-none focus:ring-2 focus:ring-[#C86A1B] text-[#2D2520]"
                  />
                </div>
              </div>
            </div>

            {/* Selected Seva Items in Cart */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold uppercase text-gray-500">
                <span>Selected Sevas</span>
                <span>{totalItemCount} Ticket{totalItemCount === 1 ? '' : 's'} to Generate</span>
              </div>

              {cart.length === 0 ? (
                <div className="py-6 text-center text-gray-400 border border-dashed border-[#E8DCCE] rounded-lg text-xs">
                  No sevas selected. Click "+ Add to Cart" from the catalogue.
                </div>
              ) : (
                <div className="divide-y divide-[#FAF5EC] border border-[#E8DCCE] rounded-lg overflow-hidden max-h-56 overflow-y-auto">
                  {cart.map((item) => (
                    <div key={item.seva.id} className="p-2.5 bg-white flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-semibold text-[#2D2520] truncate">
                          {item.seva.name}
                        </div>
                        <div className="text-[11px] text-gray-500">
                          ₹{item.seva.price.toFixed(2)} each
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-2">
                        <div className="flex items-center border border-[#E8DCCE] rounded bg-[#FAF5EC]">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.seva.id, -1)}
                            className="p-1 text-gray-600 hover:text-red-700"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 text-xs font-bold text-[#2D2520]">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.seva.id, 1)}
                            className="p-1 text-gray-600 hover:text-emerald-700"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>

                        <span className="text-xs font-bold text-[#7A1C23] w-16 text-right">
                          ₹{(item.seva.price * item.quantity).toFixed(2)}
                        </span>

                        <button
                          type="button"
                          onClick={() => removeFromCart(item.seva.id)}
                          className="text-gray-400 hover:text-red-600 p-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Payment Section */}
            <div className="pt-2 border-t border-[#E8DCCE] space-y-3">
              <div className="flex justify-between items-center text-sm font-semibold text-gray-700">
                <span>Payment Method</span>
                <span className="text-base font-extrabold text-[#7A1C23]">
                  Total: ₹{cartTotal.toFixed(2)}
                </span>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    paymentMethod === 'cash'
                      ? 'border-[#7A1C23] bg-[#7A1C23] text-white shadow-sm'
                      : 'border-[#E8DCCE] bg-white text-[#2D2520] hover:bg-[#FAF5EC]'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  Cash Payment
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`p-2.5 rounded-lg border text-xs font-semibold flex items-center justify-center gap-2 transition-all ${
                    paymentMethod === 'upi'
                      ? 'border-[#7A1C23] bg-[#7A1C23] text-white shadow-sm'
                      : 'border-[#E8DCCE] bg-white text-[#2D2520] hover:bg-[#FAF5EC]'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  Temple UPI QR
                </button>
              </div>

              {/* UPI Verification Panel */}
              {paymentMethod === 'upi' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-3 text-xs text-[#2D2520]">
                  <div className="font-semibold text-amber-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-amber-700" />
                      Temple Counter Merchant UPI QR
                    </span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono font-bold">
                      {templeUpiConfig?.upi_id || 'sringeri.temple@sbi'}
                    </span>
                  </div>

                  {/* Dynamic Scannable QR Code */}
                  {cartTotal > 0 && (
                    <div className="flex justify-center py-1">
                      <UpiQrCode
                        upiId={templeUpiConfig?.upi_id || 'sringeri.temple@sbi'}
                        merchantName={templeUpiConfig?.merchant_name || 'Sri Sharada Peetham Temple'}
                        amount={cartTotal}
                        transactionNote={`Seva Cart - ${beneficiaryName || 'Devotee'}`}
                        size={175}
                      />
                    </div>
                  )}

                  {templeUpiConfig ? (
                    <div className="text-[11px] text-gray-700 bg-white/70 p-2 rounded border border-amber-200 space-y-0.5">
                      <div><strong>Merchant:</strong> {templeUpiConfig.merchant_name}</div>
                      <div><strong>UPI VPA:</strong> <span className="font-mono font-bold text-[#7A1C23]">{templeUpiConfig.upi_id}</span></div>
                      {templeUpiConfig.verification_instruction && (
                        <div className="text-[10px] text-gray-500 italic mt-0.5">{templeUpiConfig.verification_instruction}</div>
                      )}
                    </div>
                  ) : (
                    <div className="text-[11px] text-gray-500 italic">
                      Configured in Admin Settings
                    </div>
                  )}

                  <div className="pt-1 border-t border-amber-200/60">
                    <label className="block text-[11px] font-semibold text-gray-700 mb-1">
                      UPI Ref / UTR / Transaction No. (Optional)
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. 4289XXXXXXXX"
                      value={upiRef}
                      onChange={(e) => setUpiRef(e.target.value)}
                      className="w-full px-2 py-1.5 bg-white border border-amber-300 rounded text-xs"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="upiConfirmedCheck"
                      checked={paymentStatus === 'confirmed'}
                      onChange={(e) => setPaymentStatus(e.target.checked ? 'confirmed' : 'pending')}
                      className="rounded border-amber-400 text-[#7A1C23] focus:ring-[#7A1C23]"
                    />
                    <label htmlFor="upiConfirmedCheck" className="text-[11px] text-gray-800 font-medium cursor-pointer">
                      Payment confirmed on temple soundbox / merchant notification
                    </label>
                  </div>
                </div>
              )}

              {/* Confirm Booking Button */}
              <button
                type="button"
                onClick={handleConfirmBooking}
                disabled={isSubmitting || cart.length === 0}
                className="w-full py-3 bg-[#7A1C23] hover:bg-[#5C1217] text-white rounded-lg text-sm font-bold shadow-md flex items-center justify-center gap-2 disabled:opacity-50 transition-colors"
              >
                <CheckCircle className="w-5 h-5" />
                {isSubmitting ? 'Recording & Generating Tickets...' : `Confirm Booking & Print Tickets (₹${cartTotal.toFixed(2)})`}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Ticket Print Modal */}
      <TicketPrintModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        bookingNumber={printedBookingNumber}
        tickets={issuedTickets}
        onTicketsUpdated={(t) => setIssuedTickets(t)}
      />
    </div>
  );
};

