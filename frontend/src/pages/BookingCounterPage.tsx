import React, { useState, useEffect, useRef } from 'react';
import { Seva, CartItem, Ticket, Devotee } from '../types.js';
import { apiRequest } from '../api/client.js';
import { DevoteeLookup } from '../components/DevoteeLookup.js';
import { GothraSelector } from '../components/GothraSelector.js';
import { TicketPrintModal } from '../components/TicketPrintModal.js';
import { UpiQrCode } from '../components/UpiQrCode.js';
import { getTempleToday, getTempleTomorrow } from '../utils/date.js';
import {
  Search, Plus, Minus, Trash2, ShoppingBag, CheckCircle,
  QrCode, Banknote, AlertTriangle, Sparkles, RefreshCw, Calendar, ArrowDown
} from 'lucide-react';

export const BookingCounterPage: React.FC = () => {
  const [sevas, setSevas] = useState<Seva[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('అన్ని పూజలు');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingSevas, setIsLoadingSevas] = useState(true);

  // Cart & Ritual State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [devoteeId, setDevoteeId] = useState<string | null>(null);
  const [payerName, setPayerName] = useState('');
  const [payerMobile, setPayerMobile] = useState('');
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [gothra, setGothra] = useState('');
  const [familyDetails, setFamilyDetails] = useState('');
  const [ritualDate, setRitualDate] = useState<string>(getTempleToday());

  // Payment State
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'upi'>('cash');
  const [paymentStatus, setPaymentStatus] = useState<'confirmed' | 'pending'>('confirmed');
  const [upiRef, setUpiRef] = useState('');
  const [templeUpiConfig, setTempleUpiConfig] = useState<any>(null);

  // Submitting & Ticket Modal State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [printedBookingNumber, setPrintedBookingNumber] = useState('');
  const [issuedTickets, setIssuedTickets] = useState<Ticket[]>([]);

  const cartSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoadingSevas(true);
    try {
      let [sevasList, settings] = await Promise.all([
        apiRequest<Seva[]>('/sevas'),
        apiRequest<any>('/settings').catch(() => null)
      ]);

      // If database has 1 or fewer sevas, automatically trigger seed-defaults
      if (!sevasList || sevasList.length <= 1) {
        try {
          const seeded = await apiRequest<{ success: boolean; sevas: Seva[] }>('/sevas/seed-defaults', { method: 'POST' });
          if (seeded?.sevas && seeded.sevas.length > (sevasList?.length || 0)) {
            sevasList = seeded.sevas;
          }
        } catch {
          // Continue with existing sevasList
        }
      }

      setSevas(sevasList);
      if (settings?.upi_config) {
        setTempleUpiConfig(settings.upi_config);
      }
    } catch (err) {
      console.error('Failed to load catalogue', err);
    } finally {
      setIsLoadingSevas(false);
    }
  };

  // Categories
  const categories = ['అన్ని పూజలు', ...Array.from(new Set(sevas.map(s => s.category)))];

  const filteredSevas = sevas.filter(seva => {
    const matchesCat = selectedCategory === 'అన్ని పూజలు' || seva.category === selectedCategory;
    const matchesQuery = !searchQuery.trim() ||
      seva.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (seva.telugu_name && seva.telugu_name.includes(searchQuery)) ||
      seva.category.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesCat && matchesQuery;
  });

  const addToCart = (seva: Seva) => {
    setCart(prev => {
      const existing = prev.find(item => item.seva.id === seva.id);
      if (existing) {
        return prev.map(item =>
          item.seva.id === seva.id
            ? { ...item, quantity: item.quantity + 1 }
            : item
        );
      }
      return [...prev, { seva, quantity: 1 }];
    });
  };

  const updateQuantity = (sevaId: string, delta: number) => {
    setCart(prev => {
      return prev.map(item => {
        if (item.seva.id === sevaId) {
          const newQty = item.quantity + delta;
          return newQty > 0 ? { ...item, quantity: newQty } : null;
        }
        return item;
      }).filter(Boolean) as CartItem[];
    });
  };

  const removeFromCart = (sevaId: string) => {
    setCart(prev => prev.filter(item => item.seva.id !== sevaId));
  };

  const handleSelectDevotee = (devotee: Devotee | null, suggested?: { name: string; gothra: string; family: string }) => {
    if (devotee) {
      setDevoteeId(devotee.id);
      setPayerName(devotee.name);
      setPayerMobile(devotee.mobile);
      if (suggested) {
        if (!beneficiaryName) setBeneficiaryName(suggested.name);
        if (!gothra) setGothra(suggested.gothra);
        if (!familyDetails) setFamilyDetails(suggested.family);
      }
    } else {
      setDevoteeId(null);
    }
  };

  const clearCart = () => {
    setCart([]);
    setErrorBanner(null);
  };

  const cartTotal = cart.reduce((sum, item) => sum + (item.seva.price * item.quantity), 0);
  const totalItemCount = cart.reduce((sum, item) => sum + item.quantity, 0);

  const scrollToCart = () => {
    cartSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleConfirmBooking = async () => {
    setErrorBanner(null);

    if (!beneficiaryName.trim() || beneficiaryName.trim().length < 2) {
      setErrorBanner('దయచేసి సంకల్ప కర్త పేరును నమోదు చేయండి (కనీసం 2 అక్షరాలు).');
      return;
    }

    if (!gothra.trim() || gothra.trim().length < 2) {
      setErrorBanner('దయచేసి భక్తుని గోత్రం నమోదు చేయండి లేదా ఎంచుకోండి (కనీసం 2 అక్షరాలు).');
      return;
    }

    if (payerMobile.trim() && !/^[6-9]\d{9}$/.test(payerMobile.trim())) {
      setErrorBanner('దయచేసి సరైన 10 అంకెల మొబైల్ నంబర్ నమోదు చేయండి (6-9 తో ప్రారంభమయ్యే 10 అంకెలు).');
      return;
    }

    if (cart.length === 0) {
      setErrorBanner('మీ కార్ట్‌లో ఎటువంటి సేవలు లేవు. దయచేసి ఎడమవైపు జాబితా నుండి కనీసం ఒక పూజను ఎంచుకోండి.');
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
          gothra: gothra.trim(),
          scheduled_date: c.seva.is_scheduled ? c.seva.scheduled_date : (ritualDate || null)
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

      // Succeeded!
      setPrintedBookingNumber(res.booking.booking_number);
      setIssuedTickets(res.tickets);
      setPrintModalOpen(true);

      // Reset
      clearCart();
      setBeneficiaryName('');
      setGothra('');
      setFamilyDetails('');
      setDevoteeId(null);
      setPayerName('');
      setPayerMobile('');
      setUpiRef('');
      setPaymentMethod('cash');
      setPaymentStatus('confirmed');
    } catch (err: any) {
      setErrorBanner(err.message || 'బుకింగ్ పూర్తి చేయడం విఫలమైంది. దయచేసి మళ్లీ ప్రయత్నించండి.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5 pb-40 lg:pb-12">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-[#E8DCCE]">
        <div>
          <h1 className="text-lg sm:text-2xl font-bold text-[#7A1C23] flex items-center gap-2 font-serif">
            <span>🕉️</span> పూజా సేవా బుకింగ్ కౌంటర్
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">
            సేవలను ఎంచుకోండి, సంకల్ప కర్త గోత్ర వివరాలు నమోదు చేయండి మరియు 80mm థర్మల్ రశీదులను జారీ చేయండి.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <a
            href="/bookings"
            className="flex items-center gap-1.5 px-3 py-2 bg-[#FAF5EC] border border-[#E8DCCE] text-[#7A1C23] rounded-lg text-xs font-bold hover:bg-[#F3ECE0]"
          >
            📋 నమోదైన సేవలు
          </a>
          <button
            onClick={loadData}
            className="flex items-center gap-1.5 px-3 py-2 bg-[#FAF5EC] border border-[#E8DCCE] text-[#7A1C23] rounded-lg text-xs font-bold hover:bg-[#F3ECE0]"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            రిఫ్రెష్
          </button>
        </div>
      </div>

      {/* Main 2-Column Responsive Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
        {/* LEFT COLUMN: Seva Catalogue & Search (7 Cols) */}
        <div className="lg:col-span-7 space-y-4">
          {/* Search & Category Pills */}
          <div className="bg-white p-2.5 sm:p-3.5 rounded-xl border border-[#E8DCCE] shadow-xs space-y-2 sm:space-y-2.5">
            <div className="relative">
              <input
                type="text"
                placeholder="పూజలను వెతకండి (ఉదా: అర్చన, అభిషేకం, కుంకుమార్చన, Archana)..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-9 pr-4 py-2 sm:py-2.5 bg-[#FAF5EC]/50 border border-[#E8DCCE] rounded-lg text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C86A1B] text-[#2D2520] font-medium"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5 sm:top-3" />
            </div>

            {/* Category Pills (Horizontal Single-Row Track) */}
            <div className="flex items-center gap-1.5 overflow-x-auto no-scrollbar py-0.5 -mx-0.5 px-0.5">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`px-2.5 py-1 sm:px-3 sm:py-1.5 rounded-lg text-[11px] sm:text-xs font-bold whitespace-nowrap shrink-0 transition-colors ${
                    selectedCategory === cat
                      ? 'bg-[#7A1C23] text-white shadow-xs'
                      : 'bg-[#FAF5EC] text-[#2D2520] hover:bg-[#F3ECE0] border border-[#E8DCCE]'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Sevas Dense 3-Column / 4-Column Grid */}
          {isLoadingSevas ? (
            <div className="p-8 text-center text-xs text-gray-500 bg-white rounded-xl border border-[#E8DCCE]">
              పూజా సేవల వివరాలు లోడ్ అవుతున్నాయి...
            </div>
          ) : filteredSevas.length === 0 ? (
            <div className="p-8 text-center text-xs text-gray-500 bg-white rounded-xl border border-[#E8DCCE]">
              మీ శోధనకు తగిన సేవలు లభించలేదు.
            </div>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-3 xl:grid-cols-4 gap-1.5 sm:gap-2.5">
              {filteredSevas.map((seva) => {
                const inCartItem = cart.find(item => item.seva.id === seva.id);
                const inCartQty = inCartItem?.quantity || 0;

                return (
                  <div
                    key={seva.id}
                    onClick={() => addToCart(seva)}
                    className={`group bg-white p-2 sm:p-2.5 rounded-xl border transition-all duration-150 flex flex-col justify-between shadow-2xs hover:shadow-xs active:scale-[0.97] cursor-pointer relative select-none ${
                      inCartQty > 0
                        ? 'border-[#C86A1B] bg-amber-50/30 ring-1 ring-[#C86A1B]/40'
                        : 'border-[#E8DCCE] hover:border-[#C86A1B]/60'
                    }`}
                  >
                    {/* In-cart count badge */}
                    {inCartQty > 0 && (
                      <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-4.5 px-1 bg-[#7A1C23] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs border border-white font-mono">
                        {inCartQty}
                      </span>
                    )}

                    {/* Top Section */}
                    <div>
                      <div className="flex items-center justify-between gap-0.5 mb-1">
                        <span className="text-[8px] sm:text-[9px] font-bold text-[#7A1C23] bg-[#FAF5EC] px-1 py-0.5 rounded border border-[#E8DCCE] truncate max-w-[65px] sm:max-w-[85px]">
                          {seva.category}
                        </span>
                        {seva.is_scheduled && (
                          <span className="text-[8px] sm:text-[9px] font-extrabold text-amber-900 bg-amber-100/90 px-1 py-0.2 rounded border border-amber-300 shrink-0">
                            విశేషం
                          </span>
                        )}
                      </div>

                      {/* Seva Name in Telugu */}
                      <h3 className="font-bold text-[11px] sm:text-xs text-[#7A1C23] font-serif line-clamp-2 leading-tight group-hover:text-[#5C1217]">
                        {seva.telugu_name || seva.name}
                      </h3>

                      {/* English Subtitle (if Telugu is different) */}
                      {seva.telugu_name && seva.name !== seva.telugu_name && (
                        <p className="text-[9px] text-gray-500 truncate mt-0.5 leading-tight">
                          {seva.name}
                        </p>
                      )}

                      {/* Timing / Scheduled Date */}
                      {(seva.timing || (seva.is_scheduled && seva.scheduled_date)) && (
                        <div className="mt-1 space-y-0.5">
                          {seva.timing && (
                            <div className="text-[8px] sm:text-[9px] text-gray-500 flex items-center gap-0.5 line-clamp-1">
                              <span>⏰</span>
                              <span className="truncate">{seva.timing}</span>
                            </div>
                          )}
                          {seva.is_scheduled && seva.scheduled_date && (
                            <div className="text-[8px] sm:text-[9px] text-amber-900 font-bold flex items-center gap-0.5 line-clamp-1">
                              <span>📅</span>
                              <span className="truncate">{seva.scheduled_date}</span>
                            </div>
                          )}
                        </div>
                      )}
                    </div>

                    {/* Bottom: Price & Quick Action */}
                    <div className="flex items-center justify-between pt-1.5 mt-1.5 border-t border-[#E8DCCE]/60">
                      <span className="text-[11px] sm:text-xs font-black text-[#7A1C23] font-mono">
                        ₹{seva.price.toFixed(0)}
                      </span>
                      <button
                        type="button"
                        onClick={(e) => {
                          e.stopPropagation();
                          addToCart(seva);
                        }}
                        className="flex items-center justify-center gap-0.5 px-1.5 py-0.5 sm:px-2 sm:py-1 bg-[#C86A1B] hover:bg-[#A65311] active:scale-90 text-white rounded-md sm:rounded-lg text-[10px] font-bold shadow-2xs transition-transform shrink-0"
                        title="కార్ట్‌కు చేర్చు"
                      >
                        <Plus className="w-2.5 h-2.5 sm:w-3 sm:h-3" />
                        <span className="hidden sm:inline">చేర్చు</span>
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Devotee Details & Cart (5 Cols) */}
        <div ref={cartSectionRef} className="lg:col-span-5 space-y-4">
          <div className="bg-white rounded-xl border border-[#E8DCCE] shadow-sm p-4 sm:p-5 space-y-4">
            <div className="flex items-center justify-between pb-3 border-b border-[#E8DCCE]">
              <div className="flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-[#7A1C23]" />
                <h2 className="text-sm sm:text-base font-bold text-[#7A1C23] font-serif">
                  బుకింగ్ వివరాలు & సంకల్పం
                </h2>
              </div>
              {cart.length > 0 && (
                <button
                  type="button"
                  onClick={clearCart}
                  className="text-xs text-gray-500 hover:text-red-700 flex items-center gap-1 font-semibold"
                >
                  <Trash2 className="w-3.5 h-3.5" /> ఖాళీ చేయు
                </button>
              )}
            </div>

            {/* Error Notification Banner */}
            {errorBanner && (
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 text-red-600 shrink-0 mt-0.5" />
                <div className="leading-tight font-medium">{errorBanner}</div>
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
              <div className="p-3.5 bg-[#FAF5EC]/70 border border-[#E8DCCE] rounded-xl space-y-3">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-[#7A1C23] flex items-center gap-1 font-serif">
                    <Sparkles className="w-3.5 h-3.5 text-[#C86A1B]" />
                    సంకల్ప కర్త వివరాలు (పూజ చేయించుకునే వారు)
                  </label>
                  <span className="text-[10px] text-gray-500">ఒక కార్ట్‌కు ఒకరే కర్త</span>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    సంకల్ప కర్త పేరు *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="పేరు నమోదు చేయండి (English లేదా తెలుగు)"
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                    className="w-full px-3 py-2 text-sm bg-white border border-[#E8DCCE] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C86A1B] text-[#2D2520] font-medium"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    గోత్రం *
                  </label>
                  <GothraSelector value={gothra} onChange={setGothra} />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-gray-700 mb-1">
                    కుటుంబ సభ్యుల పేర్లు / నక్షత్రం (ఐచ్ఛికం)
                  </label>
                  <input
                    type="text"
                    placeholder="ఉదా: భార్య: లక్ష్మి, కుమారుడు: శ్రీవత్స (అనూరాధ నక్షత్రం)"
                    value={familyDetails}
                    onChange={(e) => setFamilyDetails(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E8DCCE] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C86A1B] text-[#2D2520]"
                  />
                </div>

                {/* Ritual Date Picker */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-[11px] font-bold text-gray-700 flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5 text-[#C86A1B]" />
                      పూజా నిర్వహణ తేదీ (సంకల్ప దినం)
                    </label>
                    {ritualDate > getTempleToday() ? (
                      <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                        ముందస్తు బుకింగ్
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        నేటి పూజ
                      </span>
                    )}
                  </div>
                  <input
                    type="date"
                    min={getTempleToday()}
                    value={ritualDate}
                    onChange={(e) => setRitualDate(e.target.value)}
                    className="w-full px-3 py-2 text-xs bg-white border border-[#E8DCCE] rounded-lg focus:outline-none focus:ring-2 focus:ring-[#C86A1B] text-[#2D2520] font-bold"
                  />
                  <p className="text-[10px] text-gray-500 mt-1">
                    గర్భగుడిలో అర్చక స్వాములు పూజ నిర్వహించే తేదీ.
                  </p>
                </div>
              </div>
            </div>

            {/* Selected Seva Items in Cart */}
            <div className="space-y-2">
              <div className="flex items-center justify-between text-xs font-bold text-gray-600">
                <span>ఎంచుకున్న పూజా సేవలు</span>
                <span className="text-[#7A1C23] font-mono">{totalItemCount} టికెట్లు జారీ కానున్నాయి</span>
              </div>

              {cart.length === 0 ? (
                <div className="py-6 text-center text-gray-400 border border-dashed border-[#E8DCCE] rounded-xl text-xs">
                  ఎటువంటి సేవలు ఎంచుకోలేదు. ఎడమవైపు జాబితా నుండి "+ చేర్చు" క్లిక్ చేయండి.
                </div>
              ) : (
                <div className="divide-y divide-[#FAF5EC] border border-[#E8DCCE] rounded-xl overflow-hidden max-h-56 overflow-y-auto bg-white">
                  {cart.map((item) => (
                    <div key={item.seva.id} className="p-2.5 flex items-center justify-between gap-2">
                      <div className="flex-1 min-w-0">
                        <div className="text-xs font-bold text-[#2D2520] truncate">
                          {item.seva.telugu_name || item.seva.name}
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-gray-500">
                          <span>₹{item.seva.price.toFixed(0)} ఒక్కొక్కటికి</span>
                          <span className="text-amber-800 bg-amber-50 px-1.5 py-0.2 rounded font-mono text-[10px] border border-amber-200">
                            📅 {item.seva.is_scheduled ? item.seva.scheduled_date : ritualDate}
                          </span>
                        </div>
                      </div>

                      {/* Quantity Controls */}
                      <div className="flex items-center gap-1.5">
                        <div className="flex items-center border border-[#E8DCCE] rounded-lg bg-[#FAF5EC]">
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.seva.id, -1)}
                            className="p-1.5 hover:bg-[#F3ECE0] text-[#7A1C23]"
                          >
                            <Minus className="w-3 h-3" />
                          </button>
                          <span className="px-2 font-mono font-bold text-xs">
                            {item.quantity}
                          </span>
                          <button
                            type="button"
                            onClick={() => updateQuantity(item.seva.id, 1)}
                            className="p-1.5 hover:bg-[#F3ECE0] text-[#7A1C23]"
                          >
                            <Plus className="w-3 h-3" />
                          </button>
                        </div>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.seva.id)}
                          className="p-1.5 text-gray-400 hover:text-red-700"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Total Amount Summary */}
            <div className="p-3.5 bg-[#FAF5EC] rounded-xl border border-[#E8DCCE] space-y-1 text-xs">
              <div className="flex justify-between items-center text-gray-600">
                <span>మొత్తం సేవా రుసుము ({totalItemCount} టికెట్లు):</span>
                <span className="font-bold text-base text-[#7A1C23]">₹{cartTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* Payment Method Selector */}
            <div className="space-y-3 pt-1">
              <label className="text-xs font-bold text-[#7A1C23] flex items-center gap-1.5 font-serif">
                <Banknote className="w-4 h-4 text-[#C86A1B]" />
                చెల్లింపు విధానం
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setPaymentMethod('cash')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    paymentMethod === 'cash'
                      ? 'border-[#7A1C23] bg-[#7A1C23] text-white shadow-xs'
                      : 'border-[#E8DCCE] bg-white text-[#2D2520] hover:bg-[#FAF5EC]'
                  }`}
                >
                  <Banknote className="w-4 h-4" />
                  నగదు చెల్లింపు (Cash)
                </button>

                <button
                  type="button"
                  onClick={() => setPaymentMethod('upi')}
                  className={`p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                    paymentMethod === 'upi'
                      ? 'border-[#7A1C23] bg-[#7A1C23] text-white shadow-xs'
                      : 'border-[#E8DCCE] bg-white text-[#2D2520] hover:bg-[#FAF5EC]'
                  }`}
                >
                  <QrCode className="w-4 h-4" />
                  ఆలయ యూపీఐ (UPI QR)
                </button>
              </div>

              {/* UPI Standee Panel */}
              {paymentMethod === 'upi' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl space-y-3 text-xs text-[#2D2520]">
                  <div className="font-bold text-amber-900 flex items-center justify-between">
                    <span className="flex items-center gap-1.5">
                      <QrCode className="w-4 h-4 text-amber-700" />
                      ఆలయ కౌంటర్ మర్చంట్ యూపీఐ క్యూఆర్
                    </span>
                    <span className="text-[10px] bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded font-mono font-bold">
                      {templeUpiConfig?.upi_id || 'sringeri.temple@sbi'}
                    </span>
                  </div>

                  {cartTotal > 0 && (
                    <div className="flex flex-col items-center py-2 bg-white rounded-xl border border-amber-200">
                      {templeUpiConfig?.qr_image_url ? (
                        <div className="flex flex-col items-center">
                          <img
                            src={templeUpiConfig.qr_image_url}
                            alt="ఆలయ అధికారిక యూపీఐ స్టాండీ"
                            className="max-h-56 max-w-full object-contain rounded-lg border border-amber-100 shadow-sm"
                          />
                          <p className="text-[11px] font-bold text-amber-900 mt-2 text-center">
                            GPay / PhonePe / Paytm / BHIM ద్వారా స్కాన్ చేయండి
                          </p>
                          <div className="text-sm font-extrabold text-[#7A1C23]">
                            మొత్తం చెల్లించవలసినది: ₹{cartTotal.toFixed(2)}
                          </div>
                        </div>
                      ) : (
                        <div className="flex flex-col items-center">
                          <UpiQrCode
                            upiId={templeUpiConfig?.upi_id || 'sringeri.temple@sbi'}
                            merchantName={templeUpiConfig?.merchant_name || 'Sri Sharada Peetham Temple'}
                            amount={cartTotal}
                            transactionNote={`Seva Cart - ${beneficiaryName || 'Devotee'}`}
                            size={175}
                          />
                        </div>
                      )}
                    </div>
                  )}

                  <div>
                    <label className="block text-[11px] font-bold text-gray-700 mb-1">
                      యూపీఐ రసీదు / UTR సంఖ్య (ఐచ్ఛికం)
                    </label>
                    <input
                      type="text"
                      placeholder="ఉదా: 4289XXXXXXXX"
                      value={upiRef}
                      onChange={(e) => setUpiRef(e.target.value)}
                      className="w-full px-2.5 py-2 bg-white border border-amber-300 rounded-lg text-xs font-mono"
                    />
                  </div>

                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="upiConfirmedCheck"
                      checked={paymentStatus === 'confirmed'}
                      onChange={(e) => setPaymentStatus(e.target.checked ? 'confirmed' : 'pending')}
                      className="rounded border-amber-300 text-[#7A1C23]"
                    />
                    <label htmlFor="upiConfirmedCheck" className="text-[11px] text-gray-800 font-semibold cursor-pointer">
                      భక్తుని యూపీఐ చెల్లింపు విజయవంతంగా నిర్ధారించబడింది
                    </label>
                  </div>
                </div>
              )}
            </div>

            {/* Confirm & Print Action Button */}
            <div className="pt-2">
              <button
                type="button"
                onClick={handleConfirmBooking}
                disabled={isSubmitting || cart.length === 0}
                className="w-full py-3.5 px-4 bg-[#7A1C23] hover:bg-[#5C1217] text-white rounded-xl font-bold text-sm shadow-md transition-all flex items-center justify-center gap-2 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSubmitting ? (
                  <span>టికెట్లు జారీ అవుతున్నాయి...</span>
                ) : (
                  <>
                    <CheckCircle className="w-5 h-5 text-[#E0AE18]" />
                    <span>పూజా టికెట్లు జారీ చేయండి (₹{cartTotal.toFixed(2)})</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile Floating Bottom Bar for Quick Action */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-16 left-3 right-3 z-40 bg-[#7A1C23]/95 backdrop-blur-md text-white py-2 px-3.5 rounded-2xl border border-amber-300/40 shadow-xl flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-base">🛒</span>
            <div>
              <div className="text-[11px] font-bold text-amber-200">
                {totalItemCount} సేవలు ఎంచుకున్నారు
              </div>
              <div className="text-xs font-mono font-extrabold text-white">
                మొత్తం: ₹{cartTotal.toFixed(2)}
              </div>
            </div>
          </div>
          <button
            type="button"
            onClick={scrollToCart}
            className="px-3 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 active:scale-95 text-[#7A1C23] rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-transform"
          >
            <span>సంకల్పం & చెల్లింపు</span>
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}

      {/* Ticket Modal */}
      <TicketPrintModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        bookingNumber={printedBookingNumber}
        tickets={issuedTickets}
      />
    </div>
  );
};
