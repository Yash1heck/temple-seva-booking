import React, { useState, useEffect, useMemo } from 'react';
import { apiRequest } from '../api/client.js';
import { Sparkles, CheckCircle2, ArrowLeft, ArrowRight, RotateCcw, List, Layers, Users, Calendar, Printer, Zap } from 'lucide-react';
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
  const [folderViewMode, setFolderViewMode] = useState<'cards' | 'list'>('list');

  // Sacred Sanctum Consecration Stamp Animation State
  const [isStamping, setIsStamping] = useState(false);
  const [stampingTicket, setStampingTicket] = useState<string | null>(null);
  const [isBatchCompleting, setIsBatchCompleting] = useState(false);

  // Fast memory state synced with database ticket status
  const [completedMap, setCompletedMap] = useState<Record<string, boolean>>(() => {
    const map: Record<string, boolean> = {};
    rituals.forEach(r => {
      r.registrations.forEach(reg => {
        if (reg.status === 'completed' || !!(reg as any).completed_at) {
          map[reg.ticket_number] = true;
        }
      });
    });
    return map;
  });

  // Keep completedMap synchronized with rituals whenever rituals update from backend
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
    // Reset folder view when date switches
    setActiveFolderId(null);
    setCurrentCardIndex(0);
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
      if (onRefresh) onRefresh();
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

  const handlePrevCard = () => {
    if (currentCardIndex > 0) {
      setCurrentCardIndex(prev => prev - 1);
    }
  };

  const handleNextCard = () => {
    if (currentCardIndex < activeCards.length - 1) {
      setCurrentCardIndex(prev => prev + 1);
    }
  };

  // Sacred Sanctum Consecration Stamp Action (ఆలయ ముద్ర - Seal & Complete)
  const handleStampConsecrate = async () => {
    const currentCard = activeCards[currentCardIndex];
    if (!currentCard || isStamping) return;

    setIsStamping(true);
    setStampingTicket(currentCard.ticket_number);
    playTempleBell(0.4);

    // Give 450ms for stamp impact animation and sacred bell chime
    setTimeout(async () => {
      await markTicketCompleted(currentCard.ticket_number);

      // Brief delay so priest observes the circular completed red seal before advancing
      setTimeout(() => {
        setIsStamping(false);
        setStampingTicket(null);
        if (cardFilter !== 'pending') {
          if (currentCardIndex < activeCards.length - 1) {
            setCurrentCardIndex(prev => prev + 1);
          }
        }
      }, 400);
    }, 450);
  };

  // Batch Complete All Pending Tickets in Current Seva Folder
  const handleBatchCompleteFolder = async () => {
    if (!activeFolder) return;
    const pendingList = activeFolder.registrations.filter(t => !completedMap[t.ticket_number]);
    if (pendingList.length === 0) return;

    const confirmMsg = `శ్రీ శృంగేరి శారదా పీఠం సన్నిధానం:\n"${activeFolder.telugu_name || activeFolder.seva_name}" సేవలోని మొత్తం ${pendingList.length} పెండింగ్ పూజలను ఒకేసారి పూర్తి చేయాలనుకుంటున్నారా?`;
    if (!window.confirm(confirmMsg)) return;

    setIsBatchCompleting(true);
    playTempleBell(0.5);

    try {
      await apiRequest('/poojari/batch-complete', {
        method: 'POST',
        body: JSON.stringify({
          target_date: selectedDate,
          seva_id: activeFolder.seva_id
        })
      });

      // Update local completedMap
      setCompletedMap(prev => {
        const next = { ...prev };
        activeFolder.registrations.forEach(t => {
          next[t.ticket_number] = true;
        });
        return next;
      });

      if (onRefresh) onRefresh();
    } catch (err: any) {
      alert(err.message || 'పూజల నమోదు విఫలమైంది');
    } finally {
      setIsBatchCompleting(false);
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
                  if (stats.total > 0) {
                    setActiveFolderId(seva.seva_id);
                    if (stats.pending === 0 && stats.completed > 0) {
                      setCardFilter('completed');
                    } else {
                      setCardFilter('pending');
                    }
                  }
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
  // VIEW 2: INSIDE OPENED FOLDER (STABLE SANCTUM SLIP)
  // Dedicated Physical Slip with Integrated Consecration Stamp (Zero Swipe Ambiguity)
  // -------------------------------------------------------------
  const currentCard = activeCards[currentCardIndex];
  const isCurrentCompleted = currentCard ? !!completedMap[currentCard.ticket_number] : false;

  return (
    <div className="space-y-3 w-full max-w-full sm:max-w-md mx-auto select-none px-1 overflow-hidden">
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

        <div className="text-center flex-1 px-1 min-w-0">
          <h2 className="text-xs sm:text-sm font-bold text-[#7A1C23] font-serif truncate">
            {activeFolder.telugu_name || activeFolder.seva_name}
          </h2>
          <div className="text-[10px] text-gray-500 truncate">
            {activeFolder.timing ? `⏰ ${activeFolder.timing} • ` : ''}మొత్తం: {activeFolder.registrations.length}
          </div>
        </div>

        {/* View Toggle */}
        <button
          type="button"
          onClick={() => setFolderViewMode(m => (m === 'cards' ? 'list' : 'cards'))}
          className={`flex items-center gap-1 px-2.5 py-1.5 rounded-xl text-xs font-bold border transition-colors shrink-0 ${
            folderViewMode === 'list'
              ? 'bg-[#7A1C23] text-white border-[#7A1C23]'
              : 'bg-white text-gray-700 border-[#E8DCCE] hover:bg-[#F3ECE0]'
          }`}
        >
          <List className="w-3.5 h-3.5" />
          <span>{folderViewMode === 'cards' ? 'జాబితా' : 'కార్డులు'}</span>
        </button>
      </div>

      {/* 1-Click Seva Batch Complete Action (Available when pending tickets exist) */}
      {activeFolder.registrations.filter(t => !completedMap[t.ticket_number]).length > 0 && (
        <button
          type="button"
          disabled={isBatchCompleting}
          onClick={handleBatchCompleteFolder}
          className="w-full py-2.5 px-3 bg-gradient-to-r from-[#7A1C23] to-[#5C1217] hover:brightness-110 active:scale-[0.98] text-white rounded-xl text-xs font-bold shadow-xs transition-all flex items-center justify-center gap-2 border border-amber-300/40"
        >
          <Zap className="w-4 h-4 text-amber-300" />
          <span className="truncate">
            {isBatchCompleting
              ? 'పూజలు పూర్తవుతున్నాయి...'
              : `ఈ సేవలోని అన్ని పెండింగ్ పూజలను ఒకేసారి పూర్తి చేయండి (${activeFolder.registrations.filter(t => !completedMap[t.ticket_number]).length})`}
          </span>
        </button>
      )}

      {/* Filter Tabs */}
      <div className="flex flex-wrap items-center justify-between gap-1.5 px-0.5">
        <div className="flex flex-wrap items-center gap-1 bg-[#FAF5EC] p-1 rounded-xl border border-[#E8DCCE]">
          <button
            type="button"
            onClick={() => { setCardFilter('pending'); setCurrentCardIndex(0); }}
            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${
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
            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${
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
            className={`px-2 py-1 rounded-lg text-[11px] font-bold transition-colors ${
              cardFilter === 'all'
                ? 'bg-[#7A1C23] text-white shadow-2xs'
                : 'text-gray-600 hover:text-[#7A1C23]'
            }`}
          >
            అన్నీ ({activeFolder.registrations.length})
          </button>
        </div>

        <span className="text-[11px] font-bold text-gray-500 font-mono px-1">
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
        /* SINGLE SACRED SANCTUM SLIP VIEW (ZERO SWIPE AMBIGUITY) */
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
                తదుపరి పూజా ఫోల్డర్‌ను ఎంచుకోండి లేదా పూర్తయిన సంకల్పాలను చూడండి.
              </p>
              {activeFolder.registrations.filter(t => !!completedMap[t.ticket_number]).length > 0 && (
                <button
                  type="button"
                  onClick={() => setCardFilter('completed')}
                  className="mt-2 inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-50 text-emerald-800 border border-emerald-300 rounded-lg text-xs font-bold hover:bg-emerald-100 transition-colors shadow-2xs"
                >
                  <span>పూర్తయిన సంకల్పాలు ({activeFolder.registrations.filter(t => !!completedMap[t.ticket_number]).length}) చూడండి</span>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-3">
              {/* Senior-Friendly Micro Progress Counter */}
              <div className="bg-[#FAF5EC] px-3.5 py-2 rounded-xl border border-[#E8DCCE] flex items-center justify-between text-xs">
                <div className="flex items-center gap-1.5 font-bold text-[#7A1C23]">
                  <span>📜</span>
                  <span>సంకల్ప పత్రం:</span>
                  <span className="font-mono text-amber-950 font-black">
                    {currentCardIndex + 1} / {activeCards.length}
                  </span>
                  <span className="text-[10px] text-gray-500 font-medium hidden sm:inline">
                    (ఒకేసారి ఒక పత్రం)
                  </span>
                </div>

                <div className="w-24 sm:w-32 bg-gray-200 h-2 rounded-full overflow-hidden">
                  <div
                    className="bg-gradient-to-r from-[#C86A1B] to-[#7A1C23] h-full transition-all duration-300 rounded-full"
                    style={{ width: `${Math.round(((currentCardIndex + 1) / activeCards.length) * 100)}%` }}
                  />
                </div>
              </div>

              {/* Consecrated Devotee Slip Card with Integrated Consecration Seal */}
              {currentCard && (
                <div className="relative bg-[#FDFBF7] rounded-2xl border-2 border-[#E8DCCE] shadow-lg p-4 space-y-3.5 overflow-hidden">
                  {/* Sacred Consecration Circular Seal Watermark on Card */}
                  {(isCurrentCompleted || stampingTicket === currentCard.ticket_number) && (
                    <div className={`absolute top-3 right-3 sm:top-4 sm:right-4 pointer-events-none select-none z-30 ${stampingTicket === currentCard.ticket_number ? 'animate-stamp-recoil' : '-rotate-12'}`}>
                      <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-full border-2 border-dashed border-red-600/90 p-1 flex items-center justify-center shadow-lg bg-red-50/95">
                        <div className="w-full h-full rounded-full border border-red-600 flex flex-col items-center justify-center text-center p-1 text-red-700">
                          <span className="text-[7.5px] font-bold text-red-800 tracking-tight leading-none">
                            ★ శ్రీ శృంగేరి శారదా పీఠం ★
                          </span>
                          <span className="text-xs font-serif font-bold text-red-800 leading-none my-0.5">
                            ॐ
                          </span>
                          <span className="text-[9.5px] font-black uppercase tracking-wider leading-tight text-red-700">
                            నిర్వహించబడింది
                          </span>
                          <span className="text-[7.5px] font-extrabold tracking-widest text-red-600 leading-none mt-0.5">
                            COMPLETED
                          </span>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Card Header */}
                  <div className="flex items-center justify-between border-b border-[#E8DCCE] pb-2">
                    <div className="flex items-center gap-1.5 text-[#7A1C23]">
                      <span>🕉️</span>
                      <span className="text-xs font-bold font-serif">
                        {templeTitle}
                      </span>
                    </div>
                    <span className="font-mono text-[11px] font-bold px-2 py-0.5 bg-[#FAF5EC] border border-[#E8DCCE] text-[#7A1C23] rounded">
                      {currentCard.ticket_number}
                    </span>
                  </div>

                  {/* Sacred Chanting Name, Gothram & Family Details */}
                  <div className="py-1 space-y-2 text-center">
                    <div className="text-[10px] text-gray-500 font-serif">
                      సంకల్ప కర్త నామం (Ritual Beneficiary)
                    </div>
                    <div className="text-xl sm:text-2xl font-black text-[#7A1C23] font-serif tracking-wide">
                      {toTeluguText(currentCard.ritual_beneficiary_name)}
                    </div>

                    <div className="inline-block px-3.5 py-1 bg-amber-100/70 border border-amber-300 rounded-full">
                      <span className="text-xs sm:text-sm font-bold text-amber-950 font-serif">
                        గోత్రము: {formatTeluguGothram(currentCard.gothra)}
                      </span>
                    </div>

                    {currentCard.family_details && (
                      <div className="pt-1 text-xs text-gray-700">
                        <span className="text-gray-500 font-serif">కుటుంబ సభ్యులు: </span>
                        <span className="font-medium">
                          {toTeluguText(currentCard.family_details)}
                        </span>
                      </div>
                    )}
                  </div>

                  {/* INTEGRATED SEAL AREA: Embedded directly inside the card footer */}
                  <div className="pt-2.5 border-t border-dashed border-[#E8DCCE]">
                    {!isCurrentCompleted && stampingTicket !== currentCard.ticket_number ? (
                      <button
                        type="button"
                        disabled={isStamping}
                        onClick={handleStampConsecrate}
                        className="w-full relative group overflow-hidden py-3 px-3.5 rounded-xl text-xs sm:text-sm font-bold shadow-md transition-all active:scale-[0.98] flex items-center justify-center gap-2 border bg-gradient-to-r from-amber-600 via-amber-500 to-amber-700 hover:from-amber-500 hover:to-amber-600 text-white border-amber-300/80 shadow-amber-900/15"
                      >
                        <span className="absolute inset-0 w-full h-full bg-gradient-to-r from-transparent via-white/20 to-transparent -translate-x-full group-hover:translate-x-full transition-transform duration-700 pointer-events-none" />
                        <span className="text-lg">🪔</span>
                        <div className="text-center leading-tight">
                          <div className="font-serif font-black tracking-wide text-white drop-shadow-xs">
                            సంకల్ప ముద్ర వేయండి (Seal & Consecrate)
                          </div>
                          <div className="text-[9.5px] text-amber-100 font-medium">
                            స్పర్శతో ఆలయ ముద్ర & ఘంటానాదం 🔔
                          </div>
                        </div>
                        <span className="text-lg">💮</span>
                      </button>
                    ) : (
                      <div className="bg-red-50/90 border border-red-200 rounded-xl p-2.5 flex items-center justify-between">
                        <div className="flex items-center gap-2.5">
                          <div className={`w-10 h-10 rounded-full border-2 border-dashed border-red-600 bg-red-100/90 flex flex-col items-center justify-center text-center p-0.5 ${stampingTicket === currentCard.ticket_number ? 'animate-stamp-recoil' : ''}`}>
                            <span className="text-[6px] font-bold text-red-800 leading-none">★ శారదా ★</span>
                            <span className="text-[8px] font-serif font-bold text-red-800 leading-none my-0.5">ॐ</span>
                            <span className="text-[6px] font-black uppercase text-red-700 leading-none">DONE</span>
                          </div>
                          <div>
                            <div className="text-xs font-bold text-red-800 font-serif flex items-center gap-1">
                              <span>✓</span> సంకల్పం నిర్వహించబడింది
                            </div>
                            <div className="text-[10px] text-gray-500">
                              ఆలయ ముద్రతో పూర్తయింది
                            </div>
                          </div>
                        </div>
                        <button
                          type="button"
                          onClick={() => toggleTicketCompletion(currentCard.ticket_number)}
                          className="text-[11px] text-gray-500 hover:text-red-700 underline font-medium px-2 py-1"
                        >
                          Undo
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              )}

              {/* Clean Deterministic Navigation Controls (Prev / Next) */}
              <div className="flex items-center justify-between gap-2 pt-1">
                <button
                  type="button"
                  onClick={handlePrevCard}
                  disabled={currentCardIndex === 0}
                  className="flex-1 py-2.5 px-3 bg-white border border-[#E8DCCE] text-gray-700 rounded-xl text-xs font-bold disabled:opacity-40 hover:bg-[#FAF5EC] active:scale-95 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                  <span>మునుపటి పత్రం</span>
                </button>

                <button
                  type="button"
                  onClick={handleNextCard}
                  disabled={currentCardIndex >= activeCards.length - 1}
                  className="flex-1 py-2.5 px-3 bg-white border border-[#E8DCCE] text-gray-700 rounded-xl text-xs font-bold disabled:opacity-40 hover:bg-[#FAF5EC] active:scale-95 flex items-center justify-center gap-1.5 transition-colors shadow-2xs"
                >
                  <span>తదుపరి పత్రం</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
