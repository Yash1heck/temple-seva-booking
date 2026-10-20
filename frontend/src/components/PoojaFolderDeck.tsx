import React, { useState, useEffect, useMemo, useRef } from 'react';
import { apiRequest } from '../api/client.js';
import { Sparkles, CheckCircle2, ArrowLeft, RotateCcw, List, Layers, Users, Calendar, Printer } from 'lucide-react';
import { formatCurrency } from '../utils/format.js';
import { toTeluguText, formatTeluguGothram } from '../utils/teluguTransliterate.js';
import { playTempleBell } from '../utils/templeAudio.js';

export interface RitualRegistrationItem {
  ticket_number: string;
  booking_number: string;
  ritual_beneficiary_name: string;
  gothra: string;
  family_details: string | null;
  booking_date: string;
  status: string;
  amount?: number;
  payment_method?: string;
}

export interface PoojaFolderItem {
  seva_id: string;
  seva_name: string;
  telugu_name: string | null;
  category: string;
  timing: string | null;
  is_scheduled: boolean;
  scheduled_date: string | null;
  registration_count: number;
  registrations: RitualRegistrationItem[];
}

interface PoojaFolderDeckProps {
  rituals: PoojaFolderItem[];
  selectedDate: string;
  templeTitle?: string;
  onRefresh?: () => void;
  showPrintOption?: boolean;
}

export const PoojaFolderDeck: React.FC<PoojaFolderDeckProps> = ({
  rituals,
  selectedDate,
  templeTitle = 'శ్రీ శృంగేరి శారదా పీఠం సన్నిధానం',
  onRefresh,
  showPrintOption = true
}) => {
  const [activeFolderId, setActiveFolderId] = useState<string | null>(null);
  const [cardFilter, setCardFilter] = useState<'pending' | 'completed' | 'all'>('pending');
  const [currentCardIndex, setCurrentCardIndex] = useState<number>(0);
  const [folderViewMode, setFolderViewMode] = useState<'cards' | 'list'>('cards');

  // Swipe Physics State
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });
  const [isDragging, setIsDragging] = useState(false);
  const [flyDirection, setFlyDirection] = useState<'right' | 'left' | null>(null);
  const dragStartRef = useRef<{ x: number; y: number }>({ x: 0, y: 0 });

  // Persistent completed tickets
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>(() => {
    try {
      const saved = localStorage.getItem(`temple_completed_tickets_${selectedDate}`);
      return saved ? JSON.parse(saved) : {};
    } catch {
      return {};
    }
  });

  // Sync server completion status into completedMap whenever rituals change
  useEffect(() => {
    setCompletedMap(prev => {
      const next = { ...prev };
      rituals.forEach(r => {
        r.registrations.forEach(reg => {
          if (reg.status === 'completed' || !!(reg as any).completed_at) {
            next[reg.ticket_number] = true;
          }
        });
      });
      return next;
    });
  }, [rituals]);

  useEffect(() => {
    try {
      localStorage.setItem(`temple_completed_tickets_${selectedDate}`, JSON.stringify(completedMap));
    } catch (e) {
      console.error('Failed to save completed tickets map', e);
    }
  }, [completedMap, selectedDate]);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(`temple_completed_tickets_${selectedDate}`);
      const map = saved ? JSON.parse(saved) : {};
      rituals.forEach(r => {
        r.registrations.forEach(reg => {
          if (reg.status === 'completed' || !!(reg as any).completed_at) {
            map[reg.ticket_number] = true;
          }
        });
      });
      setCompletedMap(map);
      setActiveFolderId(null);
      setCurrentCardIndex(0);
      setDragOffset({ x: 0, y: 0 });
      setFlyDirection(null);
    } catch {
      setCompletedMap({});
    }
  }, [selectedDate]);

  const toggleTicketCompletion = (ticketNumber: string) => {
    setCompletedMap(prev => ({
      ...prev,
      [ticketNumber]: !prev[ticketNumber]
    }));
  };

  const markTicketCompleted = async (ticketNumber: string) => {
    setCompletedMap(prev => ({ ...prev, [ticketNumber]: true }));
    playTempleBell(0.3);

    // Persist completion to PostgreSQL database immediately
    try {
      await apiRequest('/poojari/complete-ticket', {
        method: 'POST',
        body: JSON.stringify({ ticket_number: ticketNumber })
      });
    } catch (err) {
      console.error('Failed to mark ticket completed on server:', err);
    }
  };

  const activeFolder = useMemo(() => {
    if (!activeFolderId) return null;
    return rituals.find(r => r.seva_id === activeFolderId) || null;
  }, [activeFolderId, rituals]);

  const activeCards = useMemo(() => {
    if (!activeFolder) return [];
    const all = activeFolder.registrations;
    if (cardFilter === 'pending') {
      return all.filter(t => !completedMap[t.ticket_number]);
    }
    if (cardFilter === 'completed') {
      return all.filter(t => !!completedMap[t.ticket_number]);
    }
    return all;
  }, [activeFolder, cardFilter, completedMap]);

  const folderStats = useMemo(() => {
    const stats: Record<string, { total: number; completed: number; pending: number }> = {};
    rituals.forEach(r => {
      let completed = 0;
      r.registrations.forEach(t => {
        if (completedMap[t.ticket_number]) completed++;
      });
      stats[r.seva_id] = {
        total: r.registrations.length,
        completed,
        pending: r.registrations.length - completed
      };
    });
    return stats;
  }, [rituals, completedMap]);

  const overallTotals = useMemo(() => {
    let total = 0;
    let completed = 0;
    rituals.forEach(r => {
      total += r.registrations.length;
      r.registrations.forEach(t => {
        if (completedMap[t.ticket_number]) completed++;
      });
    });
    return { total, completed, pending: total - completed };
  }, [rituals, completedMap]);

  // Adjust card index safely when stack changes
  useEffect(() => {
    if (currentCardIndex >= activeCards.length && activeCards.length > 0) {
      setCurrentCardIndex(activeCards.length - 1);
    }
  }, [activeCards.length, currentCardIndex]);

  // SWIPE COMPLETION HANDLER: Any direction (left or right) = COMPLETE (No skip!)
  const handleExecuteSwipeComplete = (direction: 'left' | 'right') => {
    const currentCard = activeCards[currentCardIndex];
    if (!currentCard || flyDirection) return;

    setFlyDirection(direction);
    playTempleBell(0.4);

    setTimeout(() => {
      markTicketCompleted(currentCard.ticket_number);
      setFlyDirection(null);
      setDragOffset({ x: 0, y: 0 });

      // If viewing completed or all, explicitly advance index
      if (cardFilter !== 'pending') {
        if (currentCardIndex < activeCards.length - 1) {
          setCurrentCardIndex(prev => prev + 1);
        }
      }
      // If viewing pending, the completed card is removed from activeCards automatically,
      // so the next card drops right into currentCardIndex smoothly without skipping!
    }, 360);
  };

  const handlePrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
    }
  };

  // Drag Handlers
  const handleStart = (clientX: number, clientY: number) => {
    if (flyDirection) return;
    setIsDragging(true);
    dragStartRef.current = { x: clientX, y: clientY };
  };

  const handleMove = (clientX: number, clientY: number) => {
    if (!isDragging || flyDirection) return;
    const dx = clientX - dragStartRef.current.x;
    const dy = (clientY - dragStartRef.current.y) * 0.25;
    setDragOffset({ x: dx, y: dy });
  };

  const handleEnd = () => {
    if (!isDragging || flyDirection) return;
    setIsDragging(false);

    if (dragOffset.x > 50) {
      handleExecuteSwipeComplete('right');
    } else if (dragOffset.x < -50) {
      handleExecuteSwipeComplete('left');
    } else {
      setDragOffset({ x: 0, y: 0 });
    }
  };

  // -------------------------------------------------------------
  // VIEW 1: COMPACT DEVOTIONAL FOLDER DOCKET GRID
  // Replicating the physical folder shape with slips popping out of the top pocket,
  // styled in warm temple colors (cream, maroon, gold) and perfectly sized for mobile.
  // -------------------------------------------------------------
  if (!activeFolder) {
    return (
      <div className="space-y-3.5">
        {/* Compact Header Summary */}
        <div className="bg-[#FAF5EC] p-3 rounded-2xl border border-[#E8DCCE] flex items-center justify-between shadow-2xs">
          <div className="flex items-center gap-2">
            <span className="text-lg">📁</span>
            <div>
              <h2 className="text-xs sm:text-sm font-bold text-[#7A1C23] font-serif">
                పూజా సంకల్ప ఫోల్డర్లు ({rituals.length})
              </h2>
              <div className="text-[10px] text-gray-500">
                తేదీ: <strong className="text-[#2D2520]">{selectedDate}</strong> • మొత్తం భక్తులు: <strong className="text-[#7A1C23]">{overallTotals.total}</strong>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="px-2 py-0.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg font-bold text-[11px]">
              ✓ {overallTotals.completed}
            </span>
            <span className="px-2 py-0.5 bg-amber-50 border border-amber-200 text-amber-800 rounded-lg font-bold text-[11px]">
              ⏳ {overallTotals.pending}
            </span>
          </div>
        </div>

        {/* Compact Folders Grid (2 Columns on mobile, 3 on tablet/desktop) */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-2.5 sm:gap-3.5">
          {rituals.map(seva => {
            const stats = folderStats[seva.seva_id] || { total: 0, completed: 0, pending: 0 };
            const isDone = stats.total > 0 && stats.pending === 0;
            const isZero = stats.total === 0;

            // Status-coded spiritual theme
            let folderBg = 'bg-[#FAF5EC] hover:bg-[#F5EDE0] border-[#E8DCCE] text-[#2D2520]';
            let categoryBg = 'bg-[#EFE5D5] text-[#7A1C23]';
            let titleColor = 'text-[#7A1C23]';
            let countColor = 'text-[#7A1C23]';
            let emblemBg = 'bg-[#EFE5D5] text-[#7A1C23]';

            if (isDone) {
              // Completed: Sacred Tulasi Green
              folderBg = 'bg-emerald-50/90 hover:bg-emerald-100/95 border-emerald-300/90 shadow-emerald-900/5 text-emerald-950';
              categoryBg = 'bg-emerald-200/60 text-emerald-900';
              titleColor = 'text-emerald-950';
              countColor = 'text-emerald-800';
              emblemBg = 'bg-emerald-200/70 text-emerald-800';
            } else if (isZero) {
              // 0 Bookings: Muted Marble Ash
              folderBg = 'bg-stone-50/70 hover:bg-stone-100/80 border-stone-200 text-stone-400 opacity-60';
              categoryBg = 'bg-stone-200/60 text-stone-600';
              titleColor = 'text-stone-600';
              countColor = 'text-stone-500';
              emblemBg = 'bg-stone-200/60 text-stone-500';
            } else {
              // Active Pending: Consecrated Haldi / Sandalwood Gold
              folderBg = 'bg-amber-50/90 hover:bg-amber-100/95 border-amber-300/90 shadow-amber-900/5 text-amber-950';
              categoryBg = 'bg-amber-200/60 text-amber-900';
              titleColor = 'text-amber-950';
              countColor = 'text-amber-900';
              emblemBg = 'bg-amber-200/70 text-amber-900';
            }

            if (seva.is_scheduled && stats.total > 0) {
              folderBg += ' ring-1.5 ring-[#D4AF37]/60';
            }

            return (
              <div
                key={seva.seva_id}
                onClick={() => {
                  if (stats.total > 0) setActiveFolderId(seva.seva_id);
                }}
                className={`group relative pt-3 transition-transform duration-150 ${
                  isZero ? 'cursor-not-allowed' : 'cursor-pointer active:scale-95'
                }`}
              >
                {/* 1. Miniature Sacred Slips Popping Out of Top Pocket (Shown ONLY if bookings exist) */}
                {!isZero && (
                  <div className="absolute top-0 left-0 right-0 flex justify-center -space-x-2.5 pointer-events-none z-0">
                    <div className={`w-10 h-5 rounded-t-sm shadow-2xs transform -rotate-6 border opacity-80 group-hover:-translate-y-1 transition-transform ${
                      isDone ? 'bg-emerald-100/80 border-emerald-300' : 'bg-[#FDFBF7] border-amber-200'
                    }`} />
                    <div className={`w-12 h-6 rounded-t-sm shadow-2xs border opacity-95 group-hover:-translate-y-1.5 transition-transform ${
                      isDone ? 'bg-emerald-50 border-emerald-300' : 'bg-white border-[#D4AF37]/40'
                    }`} />
                    <div className={`w-10 h-5 rounded-t-sm shadow-2xs transform rotate-6 border opacity-80 group-hover:-translate-y-1 transition-transform ${
                      isDone ? 'bg-emerald-100/80 border-emerald-300' : 'bg-[#FAF5EC] border-amber-200'
                    }`} />
                  </div>
                )}

                {/* 2. Physical File Folder Body with Top Tab Notch */}
                <div className={`relative z-10 border rounded-2xl p-3 shadow-xs transition-colors flex flex-col justify-between h-[125px] ${folderBg}`}>
                  {/* Top Tab Lip */}
                  <div className="flex items-start justify-between gap-1">
                    <span className={`px-1.5 py-0.2 text-[9px] font-bold rounded uppercase tracking-wider truncate max-w-[75%] ${categoryBg}`}>
                      {seva.category}
                    </span>
                    {isDone ? (
                      <span className="text-[10px] font-extrabold text-emerald-800 flex items-center gap-0.5">
                        ✓ పూర్తయింది
                      </span>
                    ) : isZero ? (
                      <span className="text-[10px] font-medium text-stone-400">
                        సేవలు లేవు
                      </span>
                    ) : (
                      <span className="text-[10px] font-bold text-amber-800">
                        {stats.pending} మిగిలింది
                      </span>
                    )}
                  </div>

                  {/* Pooja Name & Timing */}
                  <div className="my-1">
                    <h3 className={`text-xs sm:text-sm font-bold font-serif line-clamp-1 leading-snug ${titleColor}`}>
                      {seva.telugu_name || seva.seva_name}
                    </h3>
                    {seva.timing && (
                      <div className="text-[10px] text-gray-500 truncate mt-0.5">
                        ⏰ {seva.timing}
                      </div>
                    )}
                  </div>

                  {/* Bottom: Big Count Badge & Sacred Emblem */}
                  <div className="pt-1.5 border-t border-black/5 flex items-end justify-between">
                    <div>
                      <div className="flex items-baseline gap-1">
                        <span className={`text-xl font-bold font-mono leading-none ${countColor}`}>
                          {stats.pending}
                        </span>
                        <span className="text-[10px] text-gray-500 font-medium">
                          {stats.total > 0 && stats.completed > 0
                            ? `మిగిలినవి (${stats.total}లో)`
                            : 'భక్తులు'}
                        </span>
                      </div>
                    </div>

                    {/* Small Sacred Emblem */}
                    <div className={`w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-serif font-bold shadow-2xs ${emblemBg}`}>
                      ॐ
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    );
  }

  // -------------------------------------------------------------
  // VIEW 2: INSIDE OPENED FOLDER (TINDER SWIPE SLIP DECK)
  // Any swipe (left or right) completes the slip with zero skipping!
  // -------------------------------------------------------------
  const currentCard = activeCards[currentCardIndex];
  const isCurrentCompleted = currentCard ? !!completedMap[currentCard.ticket_number] : false;

  const rotateDeg = dragOffset.x * 0.09;
  const isSwipeIntent = Math.abs(dragOffset.x) > 20;
  const intentOpacity = Math.min(1, Math.abs(dragOffset.x) / 50);

  let cardTransformStyle: React.CSSProperties = {};
  if (flyDirection === 'right') {
    cardTransformStyle = {
      transform: 'translate3d(145%, 15px, 0) rotate(22deg)',
      opacity: 0,
      transition: 'transform 0.36s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.32s ease-out',
      pointerEvents: 'none'
    };
  } else if (flyDirection === 'left') {
    cardTransformStyle = {
      transform: 'translate3d(-145%, 15px, 0) rotate(-22deg)',
      opacity: 0,
      transition: 'transform 0.36s cubic-bezier(0.22, 1, 0.36, 1), opacity 0.32s ease-out',
      pointerEvents: 'none'
    };
  } else if (isDragging) {
    cardTransformStyle = {
      transform: `translate3d(${dragOffset.x}px, ${dragOffset.y}px, 0) rotate(${rotateDeg}deg)`,
      transition: 'none',
      cursor: 'grabbing'
    };
  } else {
    cardTransformStyle = {
      transform: 'translate3d(0px, 0px, 0) rotate(0deg)',
      transition: 'transform 0.38s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
    };
  }

  return (
    <div className="space-y-3 max-w-md mx-auto select-none">
      {/* Folder Header */}
      <div className="bg-[#FAF5EC] p-3 rounded-2xl border border-[#E8DCCE] flex items-center justify-between gap-2 shadow-xs">
        <button
          type="button"
          onClick={() => setActiveFolderId(null)}
          className="flex items-center gap-1 px-2.5 py-1.5 bg-white border border-[#E8DCCE] text-[#7A1C23] hover:bg-[#F3ECE0] rounded-xl text-xs font-bold transition-colors active:scale-95"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>ఫోల్డర్లు</span>
        </button>

        <div className="text-center flex-1 px-1">
          <h2 className="text-xs sm:text-sm font-bold text-[#7A1C23] font-serif truncate">
            {activeFolder.telugu_name || activeFolder.seva_name}
          </h2>
          <div className="text-[10px] text-gray-500">
            {activeFolder.timing ? `⏰ ${activeFolder.timing} • ` : ''}మొత్తం: {activeFolder.registrations.length}
          </div>
        </div>

        {/* View Toggle */}
        <button
          type="button"
          onClick={() => setFolderViewMode(m => (m === 'cards' ? 'list' : 'cards'))}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors ${
            folderViewMode === 'list'
              ? 'bg-[#7A1C23] text-white border-[#7A1C23]'
              : 'bg-white text-gray-700 border-[#E8DCCE] hover:bg-[#F3ECE0]'
          }`}
        >
          <List className="w-3.5 h-3.5" />
          <span>{folderViewMode === 'cards' ? 'జాబితా' : 'కార్డులు'}</span>
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center justify-between gap-1 px-1">
        <div className="flex items-center gap-1 bg-[#FAF5EC] p-1 rounded-xl border border-[#E8DCCE]">
          <button
            type="button"
            onClick={() => { setCardFilter('pending'); setCurrentCardIndex(0); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
              cardFilter === 'pending'
                ? 'bg-[#7A1C23] text-white shadow-2xs'
                : 'text-gray-600 hover:text-[#7A1C23]'
            }`}
          >
            మిగిలినవి ({activeFolder.registrations.filter(t => !completedMap[t.ticket_number]).length})
          </button>
          <button
            type="button"
            onClick={() => { setCardFilter('completed'); setCurrentCardIndex(0); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
              cardFilter === 'completed'
                ? 'bg-[#7A1C23] text-white shadow-2xs'
                : 'text-gray-600 hover:text-[#7A1C23]'
            }`}
          >
            పూర్తయినవి ({activeFolder.registrations.filter(t => !!completedMap[t.ticket_number]).length})
          </button>
          <button
            type="button"
            onClick={() => { setCardFilter('all'); setCurrentCardIndex(0); }}
            className={`px-2.5 py-1 rounded-lg text-xs font-bold transition-colors ${
              cardFilter === 'all'
                ? 'bg-[#7A1C23] text-white shadow-2xs'
                : 'text-gray-600 hover:text-[#7A1C23]'
            }`}
          >
            అన్నీ ({activeFolder.registrations.length})
          </button>
        </div>

        <span className="text-[11px] font-bold text-gray-500 font-mono">
          {activeCards.length > 0 ? `${currentCardIndex + 1} / ${activeCards.length}` : '0 / 0'}
        </span>
      </div>

      {/* FULL LIST VIEW */}
      {folderViewMode === 'list' ? (
        <div className="bg-white rounded-2xl border border-[#E8DCCE] p-3 shadow-xs space-y-2 max-h-[460px] overflow-y-auto">
          {activeCards.length === 0 ? (
            <div className="text-center py-8 text-xs text-gray-500">
              ఈ వర్గంలో టికెట్లు లేవు.
            </div>
          ) : (
            activeCards.map((t, idx) => {
              const isDone = !!completedMap[t.ticket_number];
              return (
                <div
                  key={t.ticket_number}
                  onClick={() => toggleTicketCompletion(t.ticket_number)}
                  className={`p-2.5 rounded-xl border flex items-center justify-between gap-2.5 cursor-pointer transition-colors ${
                    isDone ? 'bg-emerald-50/70 border-emerald-200' : 'bg-[#FAF5EC]/40 border-[#E8DCCE] hover:bg-[#FAF5EC]'
                  }`}
                >
                  <div className="flex items-center gap-2">
                    <span className="font-mono text-xs font-bold text-gray-400 w-5">
                      {idx + 1}.
                    </span>
                    <div>
                      <div className="text-xs font-bold text-[#7A1C23] font-serif">
                        {toTeluguText(t.ritual_beneficiary_name)}
                      </div>
                      <div className="text-[11px] text-amber-950 font-bold">
                        గోత్రం: {formatTeluguGothram(t.gothra)}
                      </div>
                      {t.family_details && (
                        <div className="text-[10px] text-gray-600 truncate max-w-[200px]">
                          కుటుంబం: {toTeluguText(t.family_details)}
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="font-mono text-[10px] text-gray-400">
                      #{t.ticket_number}
                    </span>
                    <button
                      type="button"
                      className={`w-6 h-6 rounded-full flex items-center justify-center font-bold text-xs ${
                        isDone ? 'bg-emerald-600 text-white' : 'bg-gray-200 text-gray-600'
                      }`}
                    >
                      {isDone ? '✓' : '○'}
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>
      ) : (
        /* CARD SLIP DECK */
        <div>
          {activeCards.length === 0 ? (
            <div className="bg-white rounded-2xl border border-[#E8DCCE] p-8 text-center space-y-2.5 shadow-xs">
              <div className="w-12 h-12 mx-auto rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center text-xl font-bold">
                ✓
              </div>
              <h3 className="text-xs font-bold text-[#7A1C23] font-serif">
                అన్ని సంకల్పాలు పూర్తయ్యాయి!
              </h3>
              <p className="text-[11px] text-gray-500">
                తదుపరి పూజా ఫోల్డర్‌ను ఎంచుకోండి.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {/* Card Container */}
              <div className="relative h-[310px] w-full flex items-center justify-center">
                {/* Visual Stack Cards Behind (Depth 3) */}
                {activeCards[currentCardIndex + 2] && (
                  <div className="absolute w-[88%] h-[270px] bg-[#FAF5EC]/70 rounded-2xl border border-[#E8DCCE] shadow-2xs transform translate-y-3.5 scale-90 z-0 pointer-events-none transition-all duration-300" />
                )}

                {/* Visual Stack Card 2 (Next Devotee Slip elevates dynamically as you swipe) */}
                {activeCards[currentCardIndex + 1] && (
                  <div
                    style={{
                      transform: isDragging || flyDirection
                        ? `translate3d(0, ${Math.max(0, 8 - (Math.abs(dragOffset.x) / 80) * 8)}px, 0) scale(${Math.min(1, 0.95 + (Math.abs(dragOffset.x) / 80) * 0.05)})`
                        : 'translate3d(0, 8px, 0) scale(0.95)',
                      transition: isDragging ? 'none' : 'transform 0.36s cubic-bezier(0.22, 1, 0.36, 1)'
                    }}
                    className="absolute w-full h-[290px] bg-white rounded-2xl border-2 border-[#E8DCCE] shadow-md p-4 flex flex-col justify-between z-10 pointer-events-none select-none overflow-hidden"
                  >
                    <div>
                      <div className="flex items-center justify-between border-b border-[#E8DCCE]/70 pb-2">
                        <div className="flex items-center gap-1.5 text-gray-500">
                          <span>🕉️</span>
                          <span className="text-xs font-bold font-serif">సంకల్ప పత్రం (తదుపరిది)</span>
                        </div>
                        <span className="font-mono text-[10px] font-bold px-2 py-0.5 bg-[#FAF5EC] border border-[#E8DCCE] text-gray-600 rounded">
                          {activeCards[currentCardIndex + 1].ticket_number}
                        </span>
                      </div>
                      <div className="mt-4 space-y-1.5 text-center">
                        <div className="text-[10px] text-gray-400 font-serif">సంకల్ప కర్త నామం</div>
                        <div className="text-lg font-bold text-[#7A1C23]/90 font-serif tracking-wide truncate">
                          {toTeluguText(activeCards[currentCardIndex + 1].ritual_beneficiary_name)}
                        </div>
                        <div className="inline-block mt-1 px-3 py-0.5 bg-amber-50 border border-amber-200 rounded-full">
                          <span className="text-xs font-bold text-amber-900/80 font-serif">
                            గోత్రము: {formatTeluguGothram(activeCards[currentCardIndex + 1].gothra)}
                          </span>
                        </div>
                        {activeCards[currentCardIndex + 1].family_details && (
                          <div className="pt-2 text-xs text-gray-500 line-clamp-1">
                            కుటుంబం: {toTeluguText(activeCards[currentCardIndex + 1].family_details)}
                          </div>
                        )}
                      </div>
                    </div>
                    <div className="pt-2 border-t border-dashed border-[#E8DCCE]/70 text-center text-[10px] text-gray-400">
                      తదుపరి సంకల్ప పత్రం
                    </div>
                  </div>
                )}

                {/* Top Active Card with Silky Drag Physics */}
                {currentCard && (
                  <div
                    style={{ ...cardTransformStyle, touchAction: 'none' }}
                    onMouseDown={(e) => handleStart(e.clientX, e.clientY)}
                    onMouseMove={(e) => handleMove(e.clientX, e.clientY)}
                    onMouseUp={handleEnd}
                    onMouseLeave={handleEnd}
                    onTouchStart={(e) => handleStart(e.touches[0].clientX, e.touches[0].clientY)}
                    onTouchMove={(e) => handleMove(e.touches[0].clientX, e.touches[0].clientY)}
                    onTouchEnd={handleEnd}
                    className="absolute w-full h-[290px] bg-white rounded-2xl border-2 border-[#E8DCCE] shadow-xl p-4 flex flex-col justify-between z-20 cursor-grab active:cursor-grabbing select-none"
                  >
                    {/* Visual Stamp during drag: Any direction marks as Complete! */}
                    {isSwipeIntent && (
                      <div
                        style={{ opacity: intentOpacity }}
                        className={`absolute top-4 ${dragOffset.x > 0 ? 'right-4 rotate-12' : 'left-4 -rotate-12'} z-30 px-3 py-1 bg-emerald-600 text-white font-bold rounded-xl text-xs shadow-md border border-emerald-400`}
                      >
                        ✓ సంకల్పం పూర్తయింది
                      </div>
                    )}

                    {/* Card Top */}
                    <div>
                      <div className="flex items-center justify-between border-b border-[#E8DCCE] pb-2">
                        <div className="flex items-center gap-1.5 text-[#7A1C23]">
                          <span>🕉️</span>
                          <span className="text-xs font-bold font-serif">
                            సంకల్ప పత్రం (Chanting Slip)
                          </span>
                        </div>
                        <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-[#FAF5EC] border border-[#E8DCCE] text-[#7A1C23] rounded">
                          {currentCard.ticket_number}
                        </span>
                      </div>

                      {/* Sacred Chanting Name & Gothram */}
                      <div className="mt-4 space-y-1.5 text-center">
                        <div className="text-[10px] text-gray-500 font-serif">
                          సంకల్ప కర్త నామం
                        </div>
                        <div className="text-xl font-bold text-[#7A1C23] font-serif tracking-wide line-clamp-1">
                          {toTeluguText(currentCard.ritual_beneficiary_name)}
                        </div>

                        <div className="inline-block mt-1 px-3 py-0.5 bg-amber-100/70 border border-amber-300 rounded-full">
                          <span className="text-xs font-bold text-amber-950 font-serif">
                            గోత్రము: {formatTeluguGothram(currentCard.gothra)}
                          </span>
                        </div>

                        {currentCard.family_details && (
                          <div className="pt-2 text-xs text-gray-700 line-clamp-2">
                            <span className="text-gray-500 font-serif">కుటుంబం: </span>
                            <span className="font-medium">
                              {toTeluguText(currentCard.family_details)}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>

                    {/* Card Bottom */}
                    <div className="pt-2 border-t border-dashed border-[#E8DCCE] flex items-center justify-between">
                      <div className="text-[10px] text-gray-500">
                        👉 ఏ వైపుకైనా స్వైప్ చేసి పూర్తి చేయండి
                      </div>

                      {isCurrentCompleted ? (
                        <span className="px-2 py-0.5 bg-emerald-100 border border-emerald-300 text-emerald-800 rounded-full text-[11px] font-bold">
                          ✓ పూర్తయింది
                        </span>
                      ) : (
                        <span className="px-2 py-0.5 bg-amber-100 border border-amber-300 text-amber-800 rounded-full text-[11px] font-bold">
                          ⏳ పూజించవలెను
                        </span>
                      )}
                    </div>
                  </div>
                )}
              </div>

              {/* Action Buttons: Clean & Direct */}
              <div className="grid grid-cols-3 gap-2 pt-1">
                <button
                  type="button"
                  onClick={handlePrevCard}
                  disabled={currentCardIndex === 0}
                  className="py-2.5 px-2 bg-white border border-[#E8DCCE] text-gray-700 rounded-xl text-xs font-bold disabled:opacity-40 transition-colors flex items-center justify-center gap-1 active:scale-95"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>మునుపటిది</span>
                </button>

                <button
                  type="button"
                  onClick={() => handleExecuteSwipeComplete('right')}
                  className="col-span-2 py-2.5 px-3 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-md transition-all active:scale-95 flex items-center justify-center gap-1.5"
                >
                  <CheckCircle2 className="w-4 h-4 text-emerald-200" />
                  <span>సంకల్పం పూర్తయింది ✓</span>
                </button>
              </div>

              {/* Undo Button */}
              {currentCard && isCurrentCompleted && (
                <div className="text-center pt-0.5">
                  <button
                    type="button"
                    onClick={() => toggleTicketCompletion(currentCard.ticket_number)}
                    className="text-[11px] text-gray-500 hover:text-red-700 underline font-medium"
                  >
                    ఈ సంకల్పాన్ని అసంపూర్తిగా మార్చండి (Undo)
                  </button>
                </div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  );
};
