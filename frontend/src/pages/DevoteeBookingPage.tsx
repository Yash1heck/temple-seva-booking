import React, { useState, useEffect, useRef } from 'react';
import { Seva, CartItem, DevoteeBookingRequest } from '../types.js';
import { apiRequest } from '../api/client.js';
import { GothraSelector } from '../components/GothraSelector.js';
import { formatCurrency } from '../utils/format.js';
import { toTeluguText, formatTeluguGothram } from '../utils/teluguTransliterate.js';
import {
  Search, Plus, Minus, Trash2, ShoppingBag, CheckCircle,
  Sparkles, Calendar, ArrowDown, ArrowRight, Clock, ShieldCheck, Heart
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getTempleToday, getTempleTomorrow, formatTempleDate } from '../utils/date.js';

export const DevoteeBookingPage: React.FC = () => {
  const [sevas, setSevas] = useState<Seva[]>([]);
  const [selectedCategory, setSelectedCategory] = useState<string>('అన్ని పూజలు');
  const [searchQuery, setSearchQuery] = useState('');
  const [isLoadingSevas, setIsLoadingSevas] = useState(true);

  // Cart & Devotee Form State
  const [cart, setCart] = useState<CartItem[]>([]);
  const [poojaDate, setPoojaDate] = useState<string>(getTempleToday());
  const [beneficiaryName, setBeneficiaryName] = useState('');
  const [gothra, setGothra] = useState('');
  const [familyDetails, setFamilyDetails] = useState('');
  const [mobile, setMobile] = useState('');

  // Submission & Confirmation State
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorBanner, setErrorBanner] = useState<string | null>(null);
  const [submittedRequest, setSubmittedRequest] = useState<DevoteeBookingRequest | null>(null);

  const cartSectionRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    loadSevas();
  }, []);

  const loadSevas = async () => {
    setIsLoadingSevas(true);
    try {
      let list = await apiRequest<Seva[]>('/sevas/public').catch(() => null);
      if (!list || list.length === 0) {
        list = await apiRequest<Seva[]>('/sevas?onlyActive=true').catch(() => null);
      }
      setSevas(list || []);
    } catch (err) {
      console.error('Failed to load sevas for devotees', err);
    } finally {
      setIsLoadingSevas(false);
    }
  };

  const categories = [
    'అన్ని పూజలు',
    ...Array.from(new Set(sevas.map((s) => s.category).filter(Boolean)))
  ];

  const filteredSevas = sevas.filter((s) => {
    if (!s.is_active) return false;
    const matchesCat =
      selectedCategory === 'అన్ని పూజలు' || s.category === selectedCategory;
    const q = searchQuery.toLowerCase().trim();
    const matchesSearch =
      !q ||
      s.name.toLowerCase().includes(q) ||
      (s.telugu_name && s.telugu_name.toLowerCase().includes(q)) ||
      (s.description && s.description.toLowerCase().includes(q));
    return matchesCat && matchesSearch;
  });

  const addToCart = (seva: Seva) => {
    setCart((prev) => {
      const existing = prev.find((i) => i.seva.id === seva.id);
      if (existing) {
        return prev.map((i) =>
          i.seva.id === seva.id ? { ...i, quantity: i.quantity + 1 } : i
        );
      }
      return [...prev, { seva, quantity: 1 }];
    });
  };

  const updateQuantity = (sevaId: string, delta: number) => {
    setCart((prev) =>
      prev
        .map((i) => {
          if (i.seva.id === sevaId) {
            const newQty = i.quantity + delta;
            return newQty > 0 ? { ...i, quantity: newQty } : null;
          }
          return i;
        })
        .filter(Boolean) as CartItem[]
    );
  };

  const removeFromCart = (sevaId: string) => {
    setCart((prev) => prev.filter((i) => i.seva.id !== sevaId));
  };

  const cartTotal = cart.reduce((sum, i) => sum + i.seva.price * i.quantity, 0);
  const totalItemCount = cart.reduce((sum, i) => sum + i.quantity, 0);

  const scrollToCart = () => {
    cartSectionRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSubmitRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorBanner(null);

    if (cart.length === 0) {
      setErrorBanner('దయచేసి కనీసం ఒక పూజా సేవను ఎంచుకోండి.');
      return;
    }
    if (!beneficiaryName.trim()) {
      setErrorBanner('సంకల్ప కర్త పేరు తప్పనిసరిగా నమోదు చేయాలి.');
      return;
    }
    if (!gothra.trim()) {
      setErrorBanner('గోత్రము తప్పనిసరిగా ఎంచుకోవాలి.');
      return;
    }
    const cleanMobile = mobile.trim();
    if (!cleanMobile || cleanMobile.length < 10) {
      setErrorBanner('సరైన 10 అంకెల మొబైల్ సంఖ్యను నమోదు చేయండి.');
      return;
    }

    setIsSubmitting(true);
    try {
      const payload = {
        devotee_name: beneficiaryName.trim(),
        gothra: gothra.trim(),
        family_details: familyDetails.trim() || null,
        mobile: cleanMobile,
        items: cart.map((i) => ({
          seva_id: i.seva.id,
          seva_name: i.seva.telugu_name || i.seva.name,
          seva_price: i.seva.price,
          quantity: i.quantity,
          scheduled_date: i.seva.is_scheduled ? (i.seva.scheduled_date || poojaDate) : poojaDate
        }))
      };

      const res = await apiRequest<DevoteeBookingRequest>('/devotee-requests', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setSubmittedRequest(res);
      setCart([]);
      setBeneficiaryName('');
      setGothra('');
      setFamilyDetails('');
      setMobile('');
    } catch (err: any) {
      setErrorBanner(err.message || 'అభ్యర్థన సమర్పించడం విఫలమైంది. దయచేసి మళ్లీ ప్రయత్నించండి.');
    } finally {
      setIsSubmitting(false);
    }
  };

  // If request successfully submitted, show token confirmation screen
  if (submittedRequest) {
    return (
      <div className="min-h-screen bg-[#FAF5EC]/50 py-10 px-3 sm:px-6 flex items-center justify-center">
        <div className="max-w-xl w-full bg-white rounded-3xl border border-[#E8DCCE] p-6 sm:p-8 shadow-xl text-center space-y-6">
          <div className="w-16 h-16 bg-emerald-50 border-2 border-emerald-300 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-2xl shadow-sm">
            ✓
          </div>

          <div>
            <span className="text-xs font-bold text-amber-900 bg-amber-50 px-3 py-1 rounded-full border border-amber-200">
              శ్రీ శృంగేరి శారదా పీఠం సన్నిధానం
            </span>
            <h1 className="text-xl sm:text-2xl font-bold text-[#7A1C23] font-serif mt-2">
              పూజా సేవా అభ్యర్థన నమోదైంది!
            </h1>
            <p className="text-xs text-gray-600 mt-1">
              మీ వివరాలు ఆలయ కౌంటర్ రికార్డులలో విజయవంతంగా భద్రపరచబడ్డాయి.
            </p>
          </div>

          {/* Token Card */}
          <div className="bg-[#FAF5EC] p-5 rounded-2xl border-2 border-dashed border-[#C86A1B] text-center space-y-2">
            <span className="text-xs text-gray-500 font-bold uppercase tracking-wider">మీ పూజా టోకెన్ సంఖ్య</span>
            <div className="text-3xl sm:text-4xl font-mono font-black text-[#7A1C23] tracking-wider">
              {submittedRequest.request_number}
            </div>
            <div className="text-xs text-amber-950">
              నమోదైన మొబైల్: <strong className="font-mono">{submittedRequest.mobile}</strong>
            </div>
          </div>

          {/* Details */}
          <div className="text-left text-xs bg-gray-50 p-4 rounded-xl border border-gray-200 space-y-2">
            <div className="flex justify-between border-b border-gray-200 pb-1">
              <span className="text-gray-500">సంకల్ప కర్త:</span>
              <strong className="text-gray-800">{submittedRequest.devotee_name}</strong>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-1">
              <span className="text-gray-500">పూజా నిర్వహణ తేదీ:</span>
              <strong className="text-[#7A1C23] font-bold">
                📅 {formatTempleDate(submittedRequest.items[0]?.scheduled_date || poojaDate)}
              </strong>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-1">
              <span className="text-gray-500">గోత్రము:</span>
              <span className="font-bold text-amber-950">{submittedRequest.gothra}</span>
            </div>
            <div className="flex justify-between border-b border-gray-200 pb-1">
              <span className="text-gray-500">మొత్తం సేవా రుసుము:</span>
              <strong className="font-mono text-sm text-[#7A1C23]">₹{submittedRequest.total_amount.toFixed(2)}</strong>
            </div>
            <div className="pt-1">
              <span className="text-gray-500 font-semibold">ఎంచుకున్న పూజలు:</span>
              <div className="mt-1 space-y-1">
                {submittedRequest.items.map((it, idx) => (
                  <div key={idx} className="flex justify-between text-[11px] text-gray-700">
                    <span>{it.seva_name} (x{it.quantity})</span>
                    <span className="font-mono">₹{(it.seva_price * it.quantity).toFixed(0)}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Counter Instructions */}
          <div className="bg-amber-50 p-4 rounded-xl border border-amber-200 text-xs text-amber-950 text-left space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-900">
              <span>ℹ️</span> ఆలయ కౌంటర్ సూచన:
            </div>
            <p>
              ఆలయ కౌంటర్‌లో సిబ్బందికి మీ <strong>మొబైల్ సంఖ్య ({submittedRequest.mobile})</strong> లేదా <strong>టోకెన్ సంఖ్య ({submittedRequest.request_number})</strong> తెలియజేసి, నగదు లేదా యూపీఐ ద్వారా చెల్లింపు పూర్తి చేసి పూజా రశీదును పొందగలరు.
            </p>
          </div>

          <div className="pt-2 flex flex-col sm:flex-row gap-2.5">
            <button
              type="button"
              onClick={() => setSubmittedRequest(null)}
              className="flex-1 py-3 bg-white border border-[#E8DCCE] hover:bg-[#FAF5EC] text-[#7A1C23] active:scale-[0.98] text-xs sm:text-sm font-bold rounded-xl transition-all shadow-xs flex items-center justify-center gap-1.5"
            >
              <span>← హోమ్ / సేవల జాబితా</span>
            </button>
            <button
              type="button"
              onClick={() => setSubmittedRequest(null)}
              className="flex-1 py-3 bg-[#7A1C23] hover:bg-[#5C1217] active:scale-[0.98] text-white text-xs sm:text-sm font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5"
            >
              <span>+ మరో పూజా సేవ</span>
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FAF5EC]/30 pb-32">
      {/* Devotee Header */}
      <header className="bg-gradient-to-r from-[#7A1C23] via-[#5C1217] to-[#450C10] text-white py-4 px-4 sm:px-8 shadow-md">
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <span className="text-2xl">🕉️</span>
            <div>
              <h1 className="text-sm sm:text-base font-bold font-serif leading-tight">
                శ్రీ శృంగేరి శారదా పీఠం సన్నిధానం
              </h1>
              <p className="text-[10px] sm:text-xs text-amber-200">
                భక్తుల స్వయంసేవ పూజా నమోదు (Devotee Seva Self-Service)
              </p>
            </div>
          </div>
          <Link
            to="/login"
            className="text-[11px] font-bold text-amber-200 hover:text-white bg-white/10 hover:bg-white/20 px-3 py-1.5 rounded-lg border border-white/20 transition-colors"
          >
            సిబ్బంది లాగిన్ →
          </Link>
        </div>
      </header>

      <main className="max-w-7xl mx-auto px-3 sm:px-6 lg:px-8 py-5">
        {/* Banner Notice */}
        <div className="bg-[#FAF5EC] border border-[#E8DCCE] rounded-2xl p-3.5 mb-5 shadow-xs flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-amber-100/80 border border-amber-300 text-amber-900 flex items-center justify-center text-lg shrink-0">
            🙏
          </div>
          <div>
            <h2 className="text-xs sm:text-sm font-bold text-[#7A1C23] font-serif">
              ఆలయ సేవల కోసం మీ వివరాలను నమోదు చేయండి
            </h2>
            <p className="text-[11px] text-gray-600">
              పూజలను ఎంచుకుని మీ సంకల్ప గోత్ర వివరాలను సమర్పించండి. కౌంటర్ వద్ద మీ ఫోన్ నంబర్ తెలిపి రశీదును పొందవచ్చు.
            </p>
          </div>
        </div>

        {errorBanner && (
          <div className="mb-5 p-3.5 bg-red-50 border border-red-300 rounded-xl text-red-800 text-xs font-semibold flex items-center justify-between">
            <span>{errorBanner}</span>
            <button onClick={() => setErrorBanner(null)} className="text-red-500 hover:text-red-700 font-bold ml-2">✕</button>
          </div>
        )}

        {/* 2-Column Responsive Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-5">
          {/* LEFT: Catalogue (7 cols) */}
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

              {/* Category Pills */}
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

            {/* Sevas 3-Column Grid */}
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
                  const inCartItem = cart.find((i) => i.seva.id === seva.id);
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
                      {inCartQty > 0 && (
                        <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-4.5 px-1 bg-[#7A1C23] text-white text-[9px] font-bold rounded-full flex items-center justify-center shadow-xs border border-white font-mono">
                          {inCartQty}
                        </span>
                      )}

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

                        <h3 className="font-bold text-[11px] sm:text-xs text-[#7A1C23] font-serif line-clamp-2 leading-tight group-hover:text-[#5C1217]">
                          {seva.telugu_name || seva.name}
                        </h3>

                        {seva.telugu_name && seva.name !== seva.telugu_name && (
                          <p className="text-[9px] text-gray-500 truncate mt-0.5 leading-tight">
                            {seva.name}
                          </p>
                        )}
                      </div>

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

          {/* RIGHT: Devotee Details & Cart Form (5 cols) */}
          <div ref={cartSectionRef} className="lg:col-span-5 space-y-4">
            <div className="bg-white rounded-2xl border border-[#E8DCCE] shadow-sm p-4 sm:p-5 space-y-4">
              <div className="flex items-center justify-between pb-3 border-b border-[#E8DCCE]">
                <div className="flex items-center gap-2">
                  <ShoppingBag className="w-5 h-5 text-[#7A1C23]" />
                  <h2 className="text-sm sm:text-base font-bold text-[#7A1C23] font-serif">
                    మీ పూజా అభ్యర్థన & సంకల్పం
                  </h2>
                </div>
                {cart.length > 0 && (
                  <button
                    type="button"
                    onClick={() => setCart([])}
                    className="text-xs text-gray-500 hover:text-red-700 font-semibold"
                  >
                    ఖాళీ చేయండి
                  </button>
                )}
              </div>

              {/* Cart Items List */}
              {cart.length === 0 ? (
                <div className="p-6 text-center bg-[#FAF5EC]/50 rounded-xl border border-dashed border-[#E8DCCE] text-xs text-gray-500 space-y-1.5">
                  <span className="text-2xl block">🛒</span>
                  <div className="font-bold text-[#7A1C23]">మీ పూజా బుట్ట ఖాళీగా ఉంది</div>
                  <div>ఎడమవైపు సేవల పట్టిక నుండి పూజలను ఎంచుకోండి.</div>
                </div>
              ) : (
                <div className="space-y-2 max-h-56 overflow-y-auto">
                  {cart.map((item) => (
                    <div
                      key={item.seva.id}
                      className="flex items-center justify-between p-2.5 bg-[#FAF5EC]/60 rounded-xl border border-[#E8DCCE] text-xs"
                    >
                      <div className="flex-1 min-w-0 pr-2">
                        <div className="font-bold text-[#7A1C23] truncate">
                          {item.seva.telugu_name || item.seva.name}
                        </div>
                        <div className="text-[10px] text-gray-500 font-mono">
                          ₹{item.seva.price.toFixed(0)} × {item.quantity} = ₹{(item.seva.price * item.quantity).toFixed(0)}
                        </div>
                      </div>

                      <div className="flex items-center gap-1.5 shrink-0">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.seva.id, -1)}
                          className="w-6 h-6 rounded bg-white border border-[#E8DCCE] text-gray-700 flex items-center justify-center font-bold hover:bg-gray-100 active:scale-95"
                        >
                          -
                        </button>
                        <span className="w-5 text-center font-bold font-mono text-xs">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.seva.id, 1)}
                          className="w-6 h-6 rounded bg-white border border-[#E8DCCE] text-gray-700 flex items-center justify-center font-bold hover:bg-gray-100 active:scale-95"
                        >
                          +
                        </button>
                        <button
                          type="button"
                          onClick={() => removeFromCart(item.seva.id)}
                          className="w-6 h-6 rounded text-red-600 hover:bg-red-50 flex items-center justify-center ml-1"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* Devotee Input Fields Form */}
              <form onSubmit={handleSubmitRequest} className="space-y-3 pt-2 border-t border-[#E8DCCE]">
                {/* Dedicated Devotee Pooja Date Selector */}
                <div className="bg-[#FAF5EC] p-3 rounded-xl border border-[#E8DCCE] space-y-2">
                  <div className="flex items-center justify-between">
                    <label className="text-xs font-bold text-[#7A1C23] flex items-center gap-1.5">
                      <Calendar className="w-4 h-4 text-[#C86A1B]" />
                      <span>📅 పూజా నిర్వహణ తేదీ (Pooja Date) *</span>
                    </label>
                    <span className="text-[10px] text-gray-600 font-medium font-serif">
                      {formatTempleDate(poojaDate)}
                    </span>
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => setPoojaDate(getTempleToday())}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        poojaDate === getTempleToday()
                          ? 'bg-[#7A1C23] text-white shadow-xs'
                          : 'bg-white text-gray-700 border border-[#E8DCCE] hover:bg-[#F3ECE0]'
                      }`}
                    >
                      నేడు
                    </button>
                    <button
                      type="button"
                      onClick={() => setPoojaDate(getTempleTomorrow())}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-all ${
                        poojaDate === getTempleTomorrow()
                          ? 'bg-[#7A1C23] text-white shadow-xs'
                          : 'bg-white text-gray-700 border border-[#E8DCCE] hover:bg-[#F3ECE0]'
                      }`}
                    >
                      రేపు
                    </button>
                    <input
                      type="date"
                      min={getTempleToday()}
                      value={poojaDate}
                      onChange={(e) => setPoojaDate(e.target.value)}
                      className="flex-1 px-2.5 py-1.5 bg-white border border-[#E8DCCE] rounded-lg text-xs font-bold text-[#2D2520] focus:outline-none focus:ring-2 focus:ring-[#C86A1B]"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    సంకల్ప కర్త పేరు (Ritual Beneficiary) *
                  </label>
                  <input
                    type="text"
                    required
                    placeholder="ఉదా: సురేష్ కుమార్"
                    value={beneficiaryName}
                    onChange={(e) => setBeneficiaryName(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF5EC]/40 border border-[#E8DCCE] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C86A1B] text-[#2D2520] font-medium"
                  />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    గోత్రము (Gothram) *
                  </label>
                  <GothraSelector value={gothra} onChange={setGothra} />
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    భక్తుని మొబైల్ సంఖ్య (Phone Number) *
                  </label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="10 అంకెల మొబైల్ సంఖ్య (ఉదా: 9848012345)"
                    value={mobile}
                    onChange={(e) => setMobile(e.target.value.replace(/\D/g, ''))}
                    className="w-full px-3 py-2 bg-[#FAF5EC]/40 border border-[#E8DCCE] rounded-xl text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-[#C86A1B] text-[#2D2520] font-mono font-bold"
                  />
                  <span className="text-[10px] text-gray-500 mt-0.5 block">
                    ఈ నంబర్ ఆధారంగా ఆలయ కౌంటర్‌లో మీ పూజా వివరాలు గుర్తించబడతాయి.
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-bold text-gray-700 mb-1">
                    కుటుంబ సభ్యుల పేర్లు (Family Members - ఐచ్ఛికం)
                  </label>
                  <textarea
                    rows={2}
                    placeholder="కుటుంబ సభ్యుల పేర్లు (సంకల్పం కొరకు)..."
                    value={familyDetails}
                    onChange={(e) => setFamilyDetails(e.target.value)}
                    className="w-full px-3 py-2 bg-[#FAF5EC]/40 border border-[#E8DCCE] rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#C86A1B] text-[#2D2520]"
                  />
                </div>

                {/* Total & Submit Button */}
                <div className="pt-3 border-t border-[#E8DCCE] space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs text-gray-600 font-bold">మొత్తం సేవా రుసుము:</span>
                    <span className="text-base sm:text-lg font-black font-mono text-[#7A1C23]">
                      ₹{formatCurrency(cartTotal)}
                    </span>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting || cart.length === 0}
                    className="w-full py-3 bg-[#7A1C23] hover:bg-[#5C1217] active:scale-[0.98] disabled:bg-gray-300 disabled:cursor-not-allowed text-white font-bold rounded-xl text-xs sm:text-sm shadow-md transition-all flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <span>అభ్యర్థన నమోదు అవుతోంది...</span>
                    ) : (
                      <>
                        <span>పూజా అభ్యర్థనను సమర్పించండి</span>
                        <ArrowRight className="w-4 h-4 text-amber-300" />
                      </>
                    )}
                  </button>
                  <p className="text-[10px] text-center text-gray-500">
                    సమర్పించిన తర్వాత ఆలయ కౌంటర్‌లో నగదు లేదా యూపీఐ చెల్లింపు చేయవచ్చు.
                  </p>
                </div>
              </form>
            </div>
          </div>
        </div>
      </main>

      {/* Devotee Mobile Floating Bar */}
      {cart.length > 0 && (
        <div className="lg:hidden fixed bottom-4 left-3 right-3 z-40 bg-[#7A1C23]/95 backdrop-blur-md text-white py-2.5 px-4 rounded-2xl border border-amber-300/40 shadow-xl flex items-center justify-between">
          <div>
            <div className="text-[11px] font-bold text-amber-200">
              {totalItemCount} పూజలు ఎంచుకున్నారు
            </div>
            <div className="text-xs font-mono font-extrabold text-white">
              మొత్తం: ₹{cartTotal.toFixed(2)}
            </div>
          </div>
          <button
            type="button"
            onClick={scrollToCart}
            className="px-3.5 py-1.5 bg-gradient-to-r from-amber-400 to-amber-500 hover:brightness-110 active:scale-95 text-[#7A1C23] rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition-transform"
          >
            <span>వివరాలు నమోదు చేయండి</span>
            <ArrowDown className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
    </div>
  );
};

