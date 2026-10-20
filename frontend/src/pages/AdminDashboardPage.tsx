import { getTempleToday, getTempleTomorrow } from '../utils/date.js';
import { formatCurrency } from '../utils/format.js';
import { toTeluguText, formatTeluguGothram } from '../utils/teluguTransliterate.js';
import React, { useState, useEffect, useMemo } from 'react';
import { Seva, Booking, User, Ticket } from '../types.js';
import { apiRequest } from '../api/client.js';
import { TicketPrintModal } from '../components/TicketPrintModal.js';
import { RitualScheduleView } from '../components/RitualScheduleView.js';
import { UpiQrCode } from '../components/UpiQrCode.js';
import {
  Shield, Calendar, DollarSign, Users, BookOpen, Layers,
  Download, CheckCircle, AlertTriangle, Search, Plus, Trash2,
  Lock, RefreshCw, FileText, Settings, History, CheckSquare,
  Edit, X, QrCode, Upload, Image as ImageIcon, Sparkles, Eye, EyeOff
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'schedule' | 'sevas' | 'staff' | 'reports' | 'closure' | 'retention' | 'audit' | 'settings'>('overview');

  // Overview Data
  const [reportDate, setReportDate] = useState(getTempleToday());
  const [bookingFilterType, setBookingFilterType] = useState<'booking_date' | 'scheduled_date' | 'future_only' | 'all'>('booking_date');
  const [todaySummary, setTodaySummary] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchBooking, setSearchBooking] = useState('');
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);

  // Settings State
  const [isEditingUpi, setIsEditingUpi] = useState(false);
  const [upiForm, setUpiForm] = useState({
    merchant_name: '',
    upi_id: '',
    verification_instruction: '',
    qr_image_url: ''
  });
  const [isEditingTempleInfo, setIsEditingTempleInfo] = useState(false);
  const [templeInfoForm, setTempleInfoForm] = useState({
    name: '',
    telugu_name: '',
    address: '',
    contact_phone: '',
    tagline: ''
  });

  // Sevas Management
  const [sevas, setSevas] = useState<Seva[]>([]);
  const [poojaris, setPoojaris] = useState<User[]>([]);
  const [isCreatingSeva, setIsCreatingSeva] = useState(false);
  const [isCreatingSevaLoading, setIsCreatingSevaLoading] = useState(false);
  const [editingSeva, setEditingSeva] = useState<Seva | null>(null);
  const [editingSevaForm, setEditingSevaForm] = useState({
    name: '',
    telugu_name: '',
    description: '',
    category: 'Daily Pooja',
    price: 100,
    is_scheduled: false,
    scheduled_date: '',
    timing: '',
    assigned_poojari_ids: [] as string[],
    is_active: true
  });
  const [newSeva, setNewSeva] = useState({
    name: '',
    telugu_name: '',
    description: '',
    category: 'Daily Pooja',
    price: 100,
    is_scheduled: false,
    scheduled_date: '',
    timing: '',
    assigned_poojari_ids: [] as string[]
  });

  // Users Management
  const [staffUsers, setStaffUsers] = useState<User[]>([]);
  const [isCreatingUser, setIsCreatingUser] = useState(false);
  const [isCreatingUserLoading, setIsCreatingUserLoading] = useState(false);
  const [newUser, setNewUser] = useState({
    username: '',
    name: '',
    role: 'poojari' as 'admin' | 'booking_staff' | 'poojari',
    password: ''
  });

  // Password Reset Modal
  const [resettingUser, setResettingUser] = useState<User | null>(null);
  const [newPasswordValue, setNewPasswordValue] = useState('');
  const [passwordStatusMsg, setPasswordStatusMsg] = useState<string | null>(null);
  const [isSavingPassword, setIsSavingPassword] = useState(false);
  const [showNewUserPass, setShowNewUserPass] = useState(false);
  const [showResetPass, setShowResetPass] = useState(false);

  // Reports
  const [reportStart, setReportStart] = useState(getTempleToday());
  const [reportEnd, setReportEnd] = useState(getTempleToday());
  const [reportData, setReportData] = useState<any>(null);

  // Daily Closure
  const [closureStatus, setClosureStatus] = useState<any>(null);
  const [closureNotes, setClosureNotes] = useState('');

  // Retention
  const [retentionPreview, setRetentionPreview] = useState<any>(null);
  const [retentionConfirmed, setRetentionConfirmed] = useState(false);
  const [retentionNotes, setRetentionNotes] = useState('');
  const [retentionRuns, setRetentionRuns] = useState<any[]>([]);

  // Audit Logs
  const [auditLogs, setAuditLogs] = useState<any[]>([]);

  // Settings
  const [templeSettings, setTempleSettings] = useState<any>(null);

  // Ticket Modal
  const [printModalOpen, setPrintModalOpen] = useState(false);
  const [selectedBookingNumber, setSelectedBookingNumber] = useState('');
  const [selectedBookingTickets, setSelectedBookingTickets] = useState<Ticket[]>([]);

  // రద్దుlation Modal
  const [cancellationBookingId, setరద్దుlationBookingId] = useState<string | null>(null);
  const [cancellationReason, setరద్దుlationReason] = useState('');

  useEffect(() => {
    loadOverview();
  }, [reportDate, bookingFilterType]);

  useEffect(() => {
    loadSevas();
    loadUsers();
    loadSettings();
  }, []);

  const loadOverview = async () => {
    try {
      const summary = await apiRequest(`/reports/summary?startDate=${reportDate}&endDate=${reportDate}`);
      setTodaySummary(summary);
      loadBookings(bookingFilterType, reportDate);
    } catch (err) {
      console.error(err);
    }
  };

  const loadBookings = async (
    filterType: 'booking_date' | 'scheduled_date' | 'future_only' | 'all' = bookingFilterType,
    targetDate: string = reportDate
  ) => {
    setIsLoadingBookings(true);
    try {
      let url = `/bookings?search=${encodeURIComponent(searchBooking)}&limit=100`;
      if (filterType === 'booking_date') {
        url += `&bookingDate=${targetDate}`;
      } else if (filterType === 'scheduled_date') {
        url += `&scheduledDate=${targetDate}`;
      } else if (filterType === 'future_only') {
        url += `&futureOnly=true`;
      }
      const list = await apiRequest<Booking[]>(url);
      setBookings(list);
    } catch (err) {
      console.error(err);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  const loadSevas = async () => {
    try {
      const list = await apiRequest<Seva[]>('/sevas?activeOnly=false');
      setSevas(list);
    } catch (err) {
      console.error(err);
    }
  };

  const loadUsers = async () => {
    try {
      const users = await apiRequest<User[]>('/auth/users');
      setStaffUsers(users);
      setPoojaris(users.filter(u => u.role === 'poojari'));
    } catch (err) {
      console.error(err);
    }
  };

  const loadSettings = async () => {
    try {
      const s = await apiRequest('/settings');
      setTempleSettings(s);
      if (s?.upi_config) {
        setUpiForm({
          merchant_name: s.upi_config.merchant_name || '',
          upi_id: s.upi_config.upi_id || '',
          verification_instruction: s.upi_config.verification_instruction || '',
          qr_image_url: s.upi_config.qr_image_url || ''
        });
      }
      if (s?.temple_info) {
        setTempleInfoForm({
          name: s.temple_info.name || '',
          telugu_name: s.temple_info.telugu_name || '',
          address: s.temple_info.address || '',
          contact_phone: s.temple_info.contact_phone || '',
          tagline: s.temple_info.tagline || ''
        });
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleQrUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      alert('Selected image exceeds 5MB limit. Please choose a smaller file.');
      return;
    }
    const reader = new FileReader();
    reader.onload = (event) => {
      const result = event.target?.result as string;
      setUpiForm(prev => ({ ...prev, qr_image_url: result }));
    };
    reader.readAsDataURL(file);
  };

  const handleSaveUpiConfig = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/settings/upi_config', {
        method: 'PUT',
        body: JSON.stringify(upiForm)
      });
      alert('Temple UPI Merchant Details updated successfully!');
      setIsEditingUpi(false);
      loadSettings();
    } catch (err: any) {
      alert(err.message || 'Failed to update UPI settings');
    }
  };

  const handleSaveTempleInfo = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      await apiRequest('/settings/temple_info', {
        method: 'PUT',
        body: JSON.stringify(templeInfoForm)
      });
      alert('Temple Identity & Contact Details updated successfully!');
      setIsEditingTempleInfo(false);
      loadSettings();
    } catch (err: any) {
      alert(err.message || 'Failed to update temple details');
    }
  };

  const loadReport = async () => {
    try {
      const data = await apiRequest(`/reports/summary?startDate=${reportStart}&endDate=${reportEnd}`);
      setReportData(data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleDownloadCsv = async () => {
    try {
      const csvText = await apiRequest<string>(`/reports/export/csv?startDate=${reportStart}&endDate=${reportEnd}`);
      const blob = new Blob([csvText], { type: 'text/csv;charset=utf-8;' });
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `temple-seva-report-${reportStart}-to-${reportEnd}.csv`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err: any) {
      alert(err.message || 'Failed to download CSV report');
    }
  };

  const loadClosureStatus = async () => {
    try {
      const s = await apiRequest(`/daily-closure/status?date=${reportDate}`);
      setClosureStatus(s);
    } catch (err) {
      console.error(err);
    }
  };

  const handlePerformClosure = async () => {
    if (!confirm(`Are you sure you want to perform Daily Closure for ${reportDate}?`)) return;
    try {
      await apiRequest('/daily-closure/close', {
        method: 'POST',
        body: JSON.stringify({ date: reportDate, notes: closureNotes })
      });
      alert('Daily closure recorded successfully!');
      loadClosureStatus();
    } catch (err: any) {
      alert(err.message || 'Failed to close');
    }
  };

  const loadRetentionPreview = async () => {
    try {
      const prev = await apiRequest('/retention/preview');
      setRetentionPreview(prev);
      const runs = await apiRequest<any[]>('/retention/history');
      setRetentionRuns(runs);
    } catch (err) {
      console.error(err);
    }
  };

  const handleExecuteRetention = async () => {
    if (!retentionConfirmed) {
      alert('Please check the confirmation box to authorize retention cleanup.');
      return;
    }
    try {
      const res = await apiRequest<any>('/retention/cleanup', {
        method: 'POST',
        body: JSON.stringify({ confirm: true, notes: retentionNotes })
      });
      alert(`Cleanup completed! ${res.cleaned_count} profiles updated. Historical bookings remain intact.`);
      setRetentionConfirmed(false);
      setRetentionNotes('');
      loadRetentionPreview();
    } catch (err: any) {
      alert(err.message || 'Cleanup failed');
    }
  };

  const loadAuditLogs = async () => {
    try {
      const logs = await apiRequest<any[]>('/audit-logs');
      setAuditLogs(logs);
    } catch (err) {
      console.error(err);
    }
  };

  // Strict ritual date isolation: hide sevas belonging to other dates when viewing a specific ritual day
  const filteredBookingsList = useMemo<Booking[]>(() => {
    if (bookingFilterType === 'scheduled_date' && reportDate) {
      return (bookings as Booking[]).map(b => {
        const relevantItems = (b.items_summary || []).filter((item: any) =>
          item.scheduled_date === reportDate || (!item.scheduled_date && reportDate === getTempleToday())
        );
        return {
          ...b,
          items_summary: relevantItems
        };
      }).filter(b => b.items_summary.length > 0);
    }
    return bookings;
  }, [bookings, bookingFilterType, reportDate]);

  const handleCreateSeva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingSevaLoading) return;
    setIsCreatingSevaLoading(true);
    try {
      await apiRequest('/sevas', {
        method: 'POST',
        body: JSON.stringify({
          ...newSeva,
          scheduled_date: newSeva.is_scheduled ? newSeva.scheduled_date : null
        })
      });
      setIsCreatingSeva(false);
      setNewSeva({
        name: '',
        telugu_name: '',
        description: '',
        category: 'Daily Pooja',
        price: 100,
        is_scheduled: false,
        scheduled_date: '',
        timing: '',
        assigned_poojari_ids: []
      });
      await loadSevas();
    } catch (err: any) {
      alert(err.message || 'Failed to create seva');
    } finally {
      setIsCreatingSevaLoading(false);
    }
  };

  const handleToggleSevaStatus = async (id: string, currentStatus: boolean) => {
    try {
      await apiRequest(`/sevas/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !currentStatus })
      });
      loadSevas();
    } catch (err: any) {
      alert(err.message || 'Failed to toggle status');
    }
  };

  const handleStartEditSeva = (seva: Seva) => {
    setEditingSeva(seva);
    setEditingSevaForm({
      name: seva.name,
      telugu_name: seva.telugu_name || '',
      description: seva.description || '',
      category: seva.category || 'Daily Pooja',
      price: seva.price,
      is_scheduled: seva.is_scheduled || false,
      scheduled_date: seva.scheduled_date || '',
      timing: seva.timing || '',
      assigned_poojari_ids: seva.assigned_poojaris ? seva.assigned_poojaris.map(p => p.id) : [],
      is_active: seva.is_active
    });
  };

  const handleSaveEditSeva = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingSeva) return;
    try {
      await apiRequest(`/sevas/${editingSeva.id}`, {
        method: 'PUT',
        body: JSON.stringify({
          ...editingSevaForm,
          scheduled_date: editingSevaForm.is_scheduled ? editingSevaForm.scheduled_date : null
        })
      });
      alert('Seva details updated successfully!');
      setEditingSeva(null);
      loadSevas();
    } catch (err: any) {
      alert(err.message || 'Failed to update seva');
    }
  };

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isCreatingUserLoading) return;
    setIsCreatingUserLoading(true);
    try {
      await apiRequest('/auth/users', {
        method: 'POST',
        body: JSON.stringify(newUser)
      });
      setIsCreatingUser(false);
      setNewUser({ username: '', name: '', role: 'poojari', password: '' });
      await loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
    } finally {
      setIsCreatingUserLoading(false);
    }
  };

  const handleToggleUserStatus = async (id: string, currentStatus: boolean) => {
    try {
      await apiRequest(`/auth/users/${id}/status`, {
        method: 'PATCH',
        body: JSON.stringify({ is_active: !currentStatus })
      });
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    }
  };

  const handleResetPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!resettingUser || !newPasswordValue.trim()) return;
    setIsSavingPassword(true);
    setPasswordStatusMsg(null);
    try {
      await apiRequest(`/auth/users/${resettingUser.id}/password`, {
        method: 'PATCH',
        body: JSON.stringify({ password: newPasswordValue.trim() })
      });
      alert(`పాస్‌వర్డ్ విజయవంతంగా మార్చబడింది (${resettingUser.username})`);
      setResettingUser(null);
      setNewPasswordValue('');
    } catch (err: any) {
      setPasswordStatusMsg(err.message || 'పాస్‌వర్డ్ మార్పు విఫలమైంది');
    } finally {
      setIsSavingPassword(false);
    }
  };

  const handleInspectBooking = async (bookingId: string) => {
    try {
      const details = await apiRequest<any>(`/bookings/${bookingId}`);
      setSelectedBookingNumber(details.booking.booking_number);
      setSelectedBookingTickets(details.tickets);
      setPrintModalOpen(true);
    } catch (err: any) {
      alert(err.message || 'Failed to load booking tickets');
    }
  };

  const handleరద్దుBooking = async () => {
    if (!cancellationBookingId || !cancellationReason.trim()) {
      alert('A valid reason is required for cancellation.');
      return;
    }
    try {
      await apiRequest(`/bookings/${cancellationBookingId}/cancel`, {
        method: 'POST',
        body: JSON.stringify({ reason: cancellationReason })
      });
      alert('Booking cancelled and marked for refund.');
      setరద్దుlationBookingId(null);
      setరద్దుlationReason('');
      loadOverview();
    } catch (err: any) {
      alert(err.message || 'Failed to cancel booking');
    }
  };

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      {/* Admin Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-[#E8DCCE]">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold text-[#7A1C23] flex items-center gap-2 font-serif">
            <Shield className="w-6 h-6 text-[#C86A1B]" />
            ఆలయ నిర్వహణ & పర్యవేక్షణ
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">
            సేవలు, అర్చకుల కేటాయింపు, రోజు ముగింపు, ఆడిట్ లాగ్స్, ఆర్థిక నివేదికలు మరియు డేటా గోప్యతా విధానాలు.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-[#E8DCCE] rounded-lg text-xs text-[#2D2520] font-medium"
          />
          <button
            onClick={loadOverview}
            className="px-3 py-1.5 bg-[#FAF5EC] border border-[#E8DCCE] text-[#7A1C23] rounded-lg text-xs font-bold hover:bg-[#F3ECE0]"
          >
            తాజా సమాచారం
          </button>
        </div>
      </div>

      {/* Desktop Metric Cards (Frosted Glass) */}
      {todaySummary && (
        <div className="hidden md:grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-4">
          <div className="glass-surface-interactive p-3 rounded-2xl border border-white/80 shadow-2xs">
            <div className="text-[11px] font-bold text-gray-500 uppercase">మొత్తం బుకింగ్‌లు</div>
            <div className="text-xl font-bold text-[#7A1C23] mt-1 font-mono">{todaySummary.total_bookings}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{todaySummary.total_seva_items} సేవా టికెట్లు</div>
          </div>

          <div className="glass-surface-interactive p-3 rounded-2xl border border-white/80 shadow-2xs">
            <div className="text-[11px] font-bold text-gray-500 uppercase">నికర వసూలు (Net)</div>
            <div className="text-xl font-bold text-emerald-800 mt-1 font-mono">₹{formatCurrency(todaySummary?.financials?.net_collected_amount, 0)}</div>
            <div className="text-[10px] text-emerald-600 mt-0.5">₹{formatCurrency(todaySummary?.financials?.confirmed_amount, 0)} మొత్తం</div>
          </div>

          <div className="glass-surface-interactive p-3 rounded-2xl border border-white/80 shadow-2xs">
            <div className="text-[11px] font-bold text-gray-500 uppercase">కౌంటర్ నగదు (Cash)</div>
            <div className="text-xl font-bold text-[#2D2520] mt-1 font-mono">₹{formatCurrency(todaySummary?.financials?.cash_total, 0)}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">కౌంటర్ పెట్టె</div>
          </div>

          <div className="glass-surface-interactive p-3 rounded-2xl border border-white/80 shadow-2xs">
            <div className="text-[11px] font-bold text-gray-500 uppercase">యూపీఐ డిజిటల్ (UPI)</div>
            <div className="text-xl font-bold text-[#C86A1B] mt-1 font-mono">₹{formatCurrency(todaySummary?.financials?.upi_total, 0)}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">బ్యాంక్ ఖాతా</div>
          </div>

          <div className="glass-surface-interactive p-3 rounded-2xl border border-white/80 shadow-2xs">
            <div className="text-[11px] font-bold text-gray-500 uppercase">ధృవీకరించవలసినవి</div>
            <div className="text-xl font-bold text-amber-700 mt-1 font-mono">₹{formatCurrency(todaySummary?.financials?.pending_amount, 0)}</div>
            <div className="text-[10px] text-amber-600 mt-0.5">పెండింగ్ యూపీఐ</div>
          </div>

          <div className="glass-surface-interactive p-3 rounded-2xl border border-white/80 shadow-2xs">
            <div className="text-[11px] font-bold text-gray-500 uppercase">రద్దు / వాపసు</div>
            <div className="text-xl font-bold text-rose-700 mt-1 font-mono">₹{formatCurrency(todaySummary?.financials?.refund_amount, 0)}</div>
            <div className="text-[10px] text-rose-500 mt-0.5">రద్దయిన సేవలు</div>
          </div>
        </div>
      )}

      {/* Mobile Glass Metric Pill (Zero Clutter) */}
      {todaySummary && (
        <div className="md:hidden glass-surface p-3 rounded-2xl flex items-center justify-between text-sm mb-3 shadow-xs">
          <div className="flex items-center gap-1.5 font-bold text-[#7A1C23]">
            <span>💰 నికర వసూలు:</span>
            <span className="font-mono text-emerald-800 font-bold text-base">₹{formatCurrency(todaySummary?.financials?.net_collected_amount, 0)}</span>
          </div>
          <div className="text-xs sm:text-sm font-semibold text-gray-700">
            బుకింగ్‌లు: <strong className="text-[#7A1C23] font-mono text-sm">{todaySummary.total_bookings}</strong>
          </div>
        </div>
      )}

      {/* Mobile Unified Glass Control Center (Apple iOS Material 3) */}
      <div className="md:hidden glass-surface p-3.5 rounded-2xl border border-white/80 space-y-2.5 mb-3 shadow-xs">
        {/* Row 1: Section Dropdown + Target Date in ONE compact row */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex-1">
            <select
              value={activeTab}
              onChange={(e) => {
                const tabId = e.target.value as any;
                setActiveTab(tabId);
                if (tabId === 'reports') loadReport();
                if (tabId === 'closure') loadClosureStatus();
                if (tabId === 'retention') loadRetentionPreview();
                if (tabId === 'audit') loadAuditLogs();
              }}
              className="w-full bg-[#FAF5EC]/90 border border-[#E8DCCE] text-[#7A1C23] font-bold text-xs sm:text-sm rounded-xl py-2 px-3 focus:outline-none focus:ring-1 focus:ring-[#C86A1B]"
            >
              {[
                { id: 'overview', label: '📖 బుకింగ్స్ & సమీక్ష' },
                { id: 'schedule', label: '✨ పూజా సంకల్ప పట్టిక' },
                { id: 'sevas', label: '📚 సేవల జాబితా' },
                { id: 'staff', label: '👥 సిబ్బంది & అర్చకులు' },
                { id: 'reports', label: '📄 ఆదాయ నివేదికలు' },
                { id: 'closure', label: '☑️ రోజు ముగింపు' },
                { id: 'retention', label: '🛡️ గోప్యత & భద్రత' },
                { id: 'audit', label: '🔒 ఆడిట్ రికార్డులు' },
                { id: 'settings', label: '⚙️ ఆలయ అమరికలు & యూపీఐ' }
              ].map(tab => (
                <option key={tab.id} value={tab.id}>
                  {tab.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <input
              type="date"
              value={reportDate}
              onChange={(e) => setReportDate(e.target.value)}
              className="px-2.5 py-1.5 bg-[#FAF5EC]/90 border border-[#E8DCCE] rounded-xl text-xs sm:text-sm font-bold text-[#2D2520]"
            />
            <button
              type="button"
              onClick={() => setReportDate(getTempleToday())}
              className="px-3 py-1.5 bg-[#FAF5EC] border border-[#E8DCCE] rounded-xl text-xs sm:text-sm font-bold text-[#7A1C23] hover:bg-[#F3ECE0] active:scale-95"
            >
              నేడు
            </button>
          </div>
        </div>

        {/* Row 2: Search Input & Row 3: Minimalist Filter Pills */}
        {activeTab === 'overview' && (
          <>
            <div className="relative">
              <input
                type="text"
                placeholder="బుకింగ్ సంఖ్య, సంకల్ప కర్త, మొబైల్ ద్వారా వెతకండి..."
                value={searchBooking}
                onChange={(e) => setSearchBooking(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadBookings()}
                className="w-full pl-9 pr-3.5 py-2 bg-white/90 border border-white rounded-xl text-xs sm:text-sm text-[#2D2520] font-medium shadow-2xs focus:outline-none focus:ring-1 focus:ring-[#C86A1B]"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            </div>

            <div className="flex flex-wrap items-center gap-1.5 pt-1 border-t border-[#E8DCCE]/40">
              {[
                { id: 'booking_date', label: 'కౌంటర్ బుకింగ్‌లు' },
                { id: 'scheduled_date', label: 'సంకల్ప దినం' },
                { id: 'future_only', label: 'ముందస్తు పూజలు' },
                { id: 'all', label: 'అన్ని రికార్డులు' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setBookingFilterType(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs sm:text-sm font-bold transition-all ${
                    bookingFilterType === f.id
                      ? 'bg-[#7A1C23] text-white shadow-2xs'
                      : 'bg-[#FAF5EC] text-gray-700 hover:bg-[#F3ECE0] border border-[#E8DCCE]/70'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Desktop Tabs Navigation (Segmented Glass Bar) */}
      <div className="hidden md:flex flex-wrap items-center gap-1.5 p-1.5 glass-surface rounded-2xl border border-white/80 no-scrollbar mb-4 shadow-xs">
        {[
          { id: 'overview', label: 'బుకింగ్స్ & సమీక్ష', icon: BookOpen },
          { id: 'schedule', label: 'పూజా సంకల్ప పట్టిక', icon: Sparkles },
          { id: 'sevas', label: 'సేవల జాబితా', icon: Layers },
          { id: 'staff', label: 'సిబ్బంది & అర్చకులు', icon: Users },
          { id: 'reports', label: 'ఆదాయ నివేదికలు', icon: FileText },
          { id: 'closure', label: 'రోజు ముగింపు', icon: CheckSquare },
          { id: 'retention', label: 'గోప్యత & భద్రత', icon: History },
          { id: 'audit', label: 'ఆడిట్ రికార్డులు', icon: Shield },
          { id: 'settings', label: 'ఆలయ అమరికలు & యూపీఐ', icon: Settings }
        ].map(tab => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => {
                setActiveTab(tab.id as any);
                if (tab.id === 'reports') loadReport();
                if (tab.id === 'closure') loadClosureStatus();
                if (tab.id === 'retention') loadRetentionPreview();
                if (tab.id === 'audit') loadAuditLogs();
              }}
              className={`py-1.5 px-3 rounded-xl text-xs font-bold flex items-center gap-1.5 transition-all ${
                isActive
                  ? 'bg-[#7A1C23] text-white shadow-2xs'
                  : 'text-gray-600 hover:text-[#7A1C23] hover:bg-white/70'
              }`}
            >
              <Icon className="w-3.5 h-3.5" />
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* TAB 1: BOOKINGS & OVERVIEW */}
      {activeTab === 'overview' && (
        <div className="space-y-3">
          {/* Desktop Filters Bar */}
          <div className="hidden md:block glass-surface p-3 rounded-2xl border border-white/80 shadow-xs space-y-2.5">
            <div className="flex items-center justify-between gap-3">
              <div className="relative flex-1">
                <input
                  type="text"
                  placeholder="బుకింగ్ సంఖ్య, సంకల్ప కర్త, మొబైల్, గోత్రం ద్వారా వెతకండి..."
                  value={searchBooking}
                  onChange={(e) => setSearchBooking(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && loadBookings()}
                  className="w-full pl-9 pr-4 py-2 bg-white/90 border border-white rounded-xl text-xs focus:outline-none focus:ring-1 focus:ring-[#C86A1B] text-[#2D2520] font-medium shadow-2xs"
                />
                <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
              </div>

              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-[#7A1C23] whitespace-nowrap font-serif">
                  లక్ష్య తేదీ:
                </span>
                <input
                  type="date"
                  value={reportDate}
                  onChange={(e) => setReportDate(e.target.value)}
                  className="px-2.5 py-1.5 bg-white/90 border border-white rounded-xl text-xs font-bold text-[#2D2520] shadow-2xs"
                />
                <button
                  type="button"
                  onClick={() => setReportDate(getTempleToday())}
                  className="px-2.5 py-1.5 bg-[#FAF5EC] border border-[#E8DCCE] rounded-xl text-xs font-bold text-[#7A1C23] hover:bg-[#F3ECE0] transition-colors shadow-2xs"
                >
                  నేడు
                </button>
                <button
                  onClick={() => loadBookings()}
                  className="px-3.5 py-1.5 bg-[#7A1C23] text-white rounded-xl text-xs font-bold hover:bg-[#5C1217] transition-colors shadow-2xs"
                >
                  వెతుకుము
                </button>
              </div>
            </div>

            <div className="flex items-center gap-1.5 pt-2 border-t border-[#E8DCCE]/40">
              <span className="text-[11px] font-bold text-gray-500 mr-1">ఫిల్టర్:</span>
              {[
                { id: 'booking_date', label: `ఈ తేదీన కౌంటర్‌లో బుక్ చేసినవి (${reportDate})` },
                { id: 'scheduled_date', label: 'ఈ తేదీ పూజలు (సంకల్ప దినం)' },
                { id: 'future_only', label: 'ముందస్తు పూజా బుకింగ్‌లు' },
                { id: 'all', label: 'అన్ని రికార్డులు' }
              ].map(f => (
                <button
                  key={f.id}
                  type="button"
                  onClick={() => setBookingFilterType(f.id as any)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-all shadow-2xs ${
                    bookingFilterType === f.id
                      ? 'bg-[#7A1C23] text-white'
                      : 'bg-[#FAF5EC] text-[#7A1C23] hover:bg-[#F3ECE0] border border-[#E8DCCE]'
                  }`}
                >
                  {f.label}
                </button>
              ))}
            </div>
          </div>

          {/* Mobile View: Apple iOS Frosted Glass Cards */}
          <div className="md:hidden space-y-2.5">
            {filteredBookingsList.length === 0 ? (
              <div className="glass-surface rounded-2xl border border-white/80 p-6 text-center text-xs text-gray-500">
                ఎటువంటి బుకింగ్‌లు లభించలేదు.
              </div>
            ) : (
              filteredBookingsList.map((b: Booking) => (
                <div key={b.id} className="glass-surface-interactive rounded-2xl p-3.5 sm:p-4 border border-white/85 shadow-xs space-y-2.5">
                  <div className="flex items-center justify-between border-b border-[#E8DCCE]/50 pb-2">
                    <div>
                      <span className="font-mono font-bold text-sm sm:text-base text-[#7A1C23]">{b.booking_number}</span>
                      <div className="text-xs text-gray-500">
                        {new Date(b.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' })}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-base font-bold text-[#7A1C23] font-mono">₹{formatCurrency(b.total_amount)}</div>
                      <span className={`inline-block px-2.5 py-0.5 rounded-lg text-xs font-bold ${
                        b.payment_status === 'confirmed' ? 'bg-emerald-500/10 text-emerald-800 border border-emerald-500/20' : 'bg-amber-500/10 text-amber-800 border border-amber-500/20'
                      }`}>
                        {b.payment_method === 'cash' ? 'నగదు' : 'యూపీఐ'} • {b.payment_status === 'confirmed' ? 'స్వీకరించబడింది' : 'పెండింగ్'}
                      </span>
                    </div>
                  </div>

                  <div className="text-xs sm:text-sm space-y-1.5">
                    <div>
                      <span className="text-gray-500">సంకల్ప కర్త:</span>{' '}
                      <strong className="text-[#2D2520]">{toTeluguText(b.ritual_beneficiary_name)}</strong>
                      {b.payer_mobile && <span className="text-xs text-gray-500 ml-1.5 font-mono">📱 {b.payer_mobile}</span>}
                    </div>
                    <div>
                      <span className="text-gray-500">గోత్రం:</span>{' '}
                      <span className="font-bold text-amber-950">{formatTeluguGothram(b.gothra)}</span>
                    </div>

                    {/* Detailed Pooja Items */}
                    <div className="pt-1.5 border-t border-[#E8DCCE]/40">
                      <span className="text-gray-600 font-semibold text-xs">సేవలు & నిర్వహణ తేదీలు:</span>
                      {b.items_summary && b.items_summary.length > 0 ? (
                        <div className="mt-1 space-y-1">
                          {b.items_summary.map((item: any, i: number) => (
                            <div key={i} className="flex items-center justify-between text-xs bg-white/70 p-1.5 rounded-xl border border-white">
                              <span className="font-bold text-[#7A1C23]">{item.seva_name} ({item.quantity})</span>
                              <span className={`px-2 py-0.5 rounded text-xs font-bold ${
                                item.scheduled_date ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                              }`}>
                                📅 {item.scheduled_date || 'నేటి పూజ'}
                              </span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <div className="text-xs text-gray-500">{b.ticket_count || 1} సేవా టికెట్లు</div>
                      )}
                    </div>
                  </div>

                  <div className="pt-2 border-t border-[#E8DCCE]/50 flex items-center justify-between">
                    <span className="text-xs font-medium text-gray-600">
                      స్థితి: <strong className={b.booking_status === 'completed' ? 'text-emerald-700' : 'text-rose-700'}>{b.booking_status === 'completed' ? 'పూర్తయింది' : 'రద్దయింది'}</strong>
                    </span>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleInspectBooking(b.id)}
                        className="px-3.5 py-1.5 bg-white/90 border border-white text-[#7A1C23] font-bold text-xs sm:text-sm rounded-xl hover:bg-white shadow-2xs active:scale-95 transition-all"
                      >
                        టికెట్లు ముద్రించు
                      </button>
                      {b.booking_status !== 'cancelled' && (
                        <button
                          onClick={() => setరద్దుlationBookingId(b.id)}
                          className="px-2 py-1 text-rose-700 text-xs font-semibold hover:underline"
                        >
                          రద్దు
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Desktop View: Full Table with pure Telugu headers and detailed item dates */}
          <div className="hidden md:block bg-white rounded-2xl border border-[#E8DCCE] shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF5EC] text-gray-700 font-bold border-b border-[#E8DCCE]">
                  <tr>
                    <th className="py-3 px-4">బుకింగ్ సంఖ్య</th>
                    <th className="py-3 px-4">కౌంటర్ సమయం</th>
                    <th className="py-3 px-4">పూజలు & నిర్వహణ తేదీ</th>
                    <th className="py-3 px-4">సంకల్ప కర్త</th>
                    <th className="py-3 px-4">గోత్రం</th>
                    <th className="py-3 px-4">రుసుము</th>
                    <th className="py-3 px-4">చెల్లింపు</th>
                    <th className="py-3 px-4">స్థితి</th>
                    <th className="py-3 px-4 text-right">చర్యలు</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF5EC]">
                  {filteredBookingsList.map((b) => (
                    <tr key={b.id} className="hover:bg-[#FAF5EC]/30">
                      <td className="py-3 px-4 font-mono font-bold text-[#7A1C23]">
                        {b.booking_number}
                        <div className="text-[10px] text-gray-400 font-sans">{b.ticket_count || 1} టికెట్లు</div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(b.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-3 px-4">
                        {b.items_summary && b.items_summary.length > 0 ? (
                          <div className="space-y-1">
                            {b.items_summary.map((item: any, i: number) => (
                              <div key={i} className="flex items-center gap-1.5 flex-wrap">
                                <span className="font-bold text-[#7A1C23] text-xs">{item.seva_name}:</span>
                                <span className={`px-1.5 py-0.2 rounded text-[10px] font-bold ${
                                  item.scheduled_date ? 'bg-amber-100 text-amber-900 border border-amber-300' : 'bg-emerald-50 text-emerald-800 border border-emerald-200'
                                }`}>
                                  📅 {item.scheduled_date || 'నేటి పూజ'}
                                </span>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-emerald-50 text-emerald-800 border border-emerald-200">
                            ⚡ నేటి పూజ
                          </span>
                        )}
                      </td>
                      <td className="py-3 px-4">
                        <div className="font-bold text-[#2D2520]">{toTeluguText(b.ritual_beneficiary_name)}</div>
                        {b.payer_mobile && <div className="text-[10px] text-gray-400">📱 {b.payer_mobile}</div>}
                      </td>
                      <td className="py-3 px-4 font-bold text-amber-950">
                        {formatTeluguGothram(b.gothra)}
                      </td>
                      <td className="py-3 px-4 font-bold text-[#7A1C23]">
                        ₹{formatCurrency(b.total_amount)}
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.payment_status === 'confirmed'
                            ? 'bg-emerald-100 text-emerald-800'
                            : b.payment_status === 'pending'
                            ? 'bg-amber-100 text-amber-800'
                            : 'bg-rose-100 text-rose-800'
                        }`}>
                          {b.payment_method === 'cash' ? 'నగదు' : 'యూపీఐ'} • {b.payment_status === 'confirmed' ? 'స్వీకరించబడింది' : 'పెండింగ్'}
                        </span>
                      </td>
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          b.booking_status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {b.booking_status === 'completed' ? 'పూర్తయింది' : 'రద్దయింది'}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleInspectBooking(b.id)}
                          className="text-[#7A1C23] hover:underline font-bold"
                        >
                          టికెట్లు
                        </button>
                        {b.booking_status !== 'cancelled' && (
                          <button
                            onClick={() => setరద్దుlationBookingId(b.id)}
                            className="text-rose-600 hover:underline font-medium"
                          >
                            రద్దు
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredBookingsList.length === 0 && (
                    <tr>
                      <td colSpan={9} className="py-8 text-center text-gray-400">
                        ఎటువంటి బుకింగ్‌లు లభించలేదు.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB: RITUAL DAY SCHEDULE & DEVOTEE ROSTER */}
      {activeTab === 'schedule' && (
        <RitualScheduleView
          selectedDate={reportDate}
          onDateChange={setReportDate}
        />
      )}

      {/* TAB 2: SEVA CATALOGUE */}
      {activeTab === 'sevas' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 p-3 sm:p-4 rounded-2xl border border-[#E8DCCE]/80 shadow-xs">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#7A1C23] font-serif flex items-center gap-2">
                <Layers className="w-5 h-5 text-[#C86A1B]" />
                ఆలయ పూజా సేవల జాబితా (Sevas Catalogue)
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                ధరలు, విభాగాలు, నిర్వహణ సమయాలు మరియు అర్చకుల కేటాయింపులు
              </p>
            </div>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={async () => {
                  try {
                    await apiRequest('/sevas/seed-defaults', { method: 'POST' });
                    await loadSevas();
                    alert('ఆలయ సేవల జాబితా విజయవంతంగా సీడ్ చేయబడింది!');
                  } catch (err: any) {
                    alert(err.message || 'సీడింగ్ విఫలమైంది');
                  }
                }}
                className="flex items-center gap-1.5 px-3 py-2 bg-[#FAF5EC] hover:bg-[#F3ECE0] border border-[#E8DCCE] text-[#7A1C23] rounded-xl text-xs sm:text-sm font-bold shadow-xs active:scale-98 transition-all"
              >
                <RefreshCw className="w-4 h-4" />
                <span>అన్ని పూజలను సీడ్ చేయండి (Restore)</span>
              </button>
              <button
                onClick={() => setIsCreatingSeva(true)}
                className="flex items-center gap-1.5 px-3.5 py-2 bg-[#7A1C23] hover:bg-[#5C1217] text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm active:scale-98 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>కొత్త సేవను చేర్చండి (Add Seva)</span>
              </button>
            </div>
          </div>

          {/* New Seva Form Modal */}
          {isCreatingSeva && (
            <div className="p-5 bg-white border border-[#E8DCCE] rounded-xl shadow-md space-y-4">
              <h3 className="font-bold text-sm text-[#7A1C23]">నూతన పూజా సేవను జోడించండి</h3>
              <form onSubmit={handleCreateSeva} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold mb-1">సేవ పేరు (English) *</label>
                  <input
                    type="text"
                    required
                    value={newSeva.name}
                    onChange={(e) => setNewSeva({ ...newSeva, name: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded bg-[#FAF5EC]/40"
                    placeholder="e.g. Sahasra Deepalankarana Seva"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">తెలుగు పేరు (శ్రీ నామం)</label>
                  <input
                    type="text"
                    value={newSeva.telugu_name}
                    onChange={(e) => setNewSeva({ ...newSeva, telugu_name: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded bg-[#FAF5EC]/40"
                    placeholder="e.g. సహస్ర దీపాలంకరణ సేవ"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">రుసుము (₹) *</label>
                  <input
                    type="number"
                    required
                    min="0"
                    step="1"
                    value={newSeva.price}
                    onChange={(e) => setNewSeva({ ...newSeva, price: parseFloat(e.target.value) || 0 })}
                    className="w-full px-3 py-1.5 border rounded bg-[#FAF5EC]/40"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Category</label>
                  <select
                    value={newSeva.category}
                    onChange={(e) => setNewSeva({ ...newSeva, category: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded bg-[#FAF5EC]/40"
                  >
                    <option value="Daily Pooja">Daily Pooja</option>
                    <option value="Special Pooja">Special Pooja</option>
                    <option value="Abhishekam">Abhishekam</option>
                    <option value="Homam">Homam</option>
                    <option value="Archana">Archana</option>
                    <option value="Festivals">Festivals</option>
                  </select>
                </div>

                <div>
                  <label className="block font-semibold mb-1">నిర్వహణ సమయం (ఉదా: 09:00 AM - 11:00 AM)</label>
                  <input
                    type="text"
                    value={newSeva.timing}
                    onChange={(e) => setNewSeva({ ...newSeva, timing: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded bg-[#FAF5EC]/40"
                    placeholder="e.g. 09:00 AM - 11:00 AM"
                  />
                </div>

                {/* Requirement 9: Scheduled Pooja Checkbox & Date */}
                <div className="sm:col-span-2 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                  <div className="flex items-center gap-2">
                    <input
                      type="checkbox"
                      id="isScheduledCheck"
                      checked={newSeva.is_scheduled}
                      onChange={(e) => setNewSeva({ ...newSeva, is_scheduled: e.target.checked })}
                      className="rounded border-amber-400 text-[#7A1C23]"
                    />
                    <label htmlFor="isScheduledCheck" className="font-bold text-amber-900">
                      నిర్ణీత తేదీకి ప్రత్యేక పూజగా నిర్ణయించండి (తేదీ వారీ విశేష పూజ)
                    </label>
                  </div>
                  <p className="text-[11px] text-amber-800">
                    Once scheduled, this pooja will be shown in the counter booking dashboard immediately for advance booking,
                    but for the assigned Poojari, it will only appear on this scheduled date!
                  </p>
                  {newSeva.is_scheduled && (
                    <div className="w-64 pt-1">
                      <label className="block font-semibold text-gray-700 mb-1">Scheduled Date *</label>
                      <input
                        type="date"
                        required={newSeva.is_scheduled}
                        value={newSeva.scheduled_date}
                        onChange={(e) => setNewSeva({ ...newSeva, scheduled_date: e.target.value })}
                        className="w-full px-3 py-1.5 border rounded bg-white"
                      />
                    </div>
                  )}
                </div>

                <div className="sm:col-span-2">
                  <label className="block font-semibold mb-1">అర్చకులను కేటాయించండి</label>
                  <div className="flex flex-wrap gap-2">
                    {poojaris.map(p => (
                      <label key={p.id} className="flex items-center gap-1.5 px-3 py-1 border rounded bg-white cursor-pointer">
                        <input
                          type="checkbox"
                          checked={newSeva.assigned_poojari_ids.includes(p.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setNewSeva({ ...newSeva, assigned_poojari_ids: [...newSeva.assigned_poojari_ids, p.id] });
                            } else {
                              setNewSeva({ ...newSeva, assigned_poojari_ids: newSeva.assigned_poojari_ids.filter(id => id !== p.id) });
                            }
                          }}
                        />
                        <span>{p.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingSeva(false)}
                    className="px-3 py-1.5 border rounded bg-white text-gray-600"
                  >
                    రద్దు
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingSevaLoading}
                    className="px-4 py-1.5 bg-[#7A1C23] text-white rounded font-semibold disabled:opacity-50 flex items-center gap-2 hover:bg-[#5C1217] transition-all"
                  >
                    {isCreatingSevaLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>సేవ్ అవుతోంది... (Saving...)</span>
                      </>
                    ) : (
                      <span>సేవను భద్రపరచండి</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Mobile Seva Cards View (Zero Table Clipping) */}
          <div className="sm:hidden space-y-3">
            {sevas.map((s) => {
              const hasPoojaris = s.assigned_poojaris && s.assigned_poojaris.length > 0;
              return (
                <div
                  key={s.id}
                  className="bg-white rounded-2xl p-4 border border-[#E8DCCE] shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-[#7A1C23]">{s.name}</h4>
                      {s.telugu_name && (
                        <div className="text-xs text-[#C86A1B] font-serif font-bold mt-0.5">
                          {s.telugu_name}
                        </div>
                      )}
                      <div className="text-xs text-gray-500 mt-1">
                        విభాగం: <span className="font-semibold text-gray-700">{s.category}</span>
                      </div>
                    </div>
                    <div className="text-right shrink-0">
                      <div className="text-base font-bold text-[#7A1C23] font-mono">₹{s.price.toFixed(2)}</div>
                      <span className={`inline-block mt-1 px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        s.is_active ? 'bg-emerald-100 text-emerald-800 border border-emerald-200' : 'bg-gray-100 text-gray-600 border border-gray-200'
                      }`}>
                        {s.is_active ? '● Active' : '○ Inactive'}
                      </span>
                    </div>
                  </div>

                  {/* Pooja Schedule & Assigned Poojari */}
                  <div className="text-xs text-gray-600 bg-[#FAF5EC]/70 p-2.5 rounded-xl border border-[#E8DCCE] space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="text-gray-500">పూజా రకం:</span>
                      {s.is_scheduled ? (
                        <span className="font-bold text-amber-900 bg-amber-100 px-2 py-0.5 rounded border border-amber-300">
                          📅 {s.scheduled_date}
                        </span>
                      ) : (
                        <span className="font-bold text-emerald-800">నిత్య పూజ</span>
                      )}
                    </div>
                    <div className="flex items-center justify-between pt-0.5">
                      <span className="text-gray-500">అర్చకులు:</span>
                      <span className="font-semibold text-[#2D2520]">
                        {hasPoojaris && s.assigned_poojaris ? s.assigned_poojaris.map(p => p.name).join(', ') : 'అందరూ'}
                      </span>
                    </div>
                  </div>

                  {/* Actions Grid: Edit & Activate/Deactivate side by side */}
                  <div className="grid grid-cols-2 gap-2 pt-1 border-t border-[#FAF5EC]">
                    <button
                      onClick={() => handleStartEditSeva(s)}
                      className="flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl bg-[#FAF5EC] hover:bg-[#F3ECE0] text-[#7A1C23] text-xs font-bold border border-[#E8DCCE] active:scale-98 transition-all"
                    >
                      <Edit className="w-3.5 h-3.5" />
                      <span>సవరించు (Edit)</span>
                    </button>

                    <button
                      onClick={() => handleToggleSevaStatus(s.id, s.is_active)}
                      className={`flex items-center justify-center gap-1.5 px-3 py-2 rounded-xl text-xs font-bold border transition-all active:scale-98 ${
                        s.is_active
                          ? 'bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100'
                          : 'bg-emerald-50 text-emerald-800 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      <span>{s.is_active ? 'నిలిపివేయి' : 'ప్రారంభించు'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Sevas Table View */}
          <div className="hidden sm:block bg-white rounded-2xl border border-[#E8DCCE] shadow-sm overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#FAF5EC] text-gray-700 font-bold border-b border-[#E8DCCE]">
                <tr>
                  <th className="py-3.5 px-4">సేవ పేరు (Seva Name)</th>
                  <th className="py-3.5 px-4">విభాగం (Category)</th>
                  <th className="py-3.5 px-4">రుసుము (Price)</th>
                  <th className="py-3.5 px-4">పూజా రకం / షెడ్యూల్</th>
                  <th className="py-3.5 px-4">కేటాయించిన అర్చకులు</th>
                  <th className="py-3.5 px-4">స్థితి (Status)</th>
                  <th className="py-3.5 px-4 text-right">చర్యలు (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FAF5EC]">
                {sevas.map((s) => (
                  <tr key={s.id} className="hover:bg-[#FAF5EC]/30">
                    <td className="py-3.5 px-4 font-bold text-[#7A1C23]">
                      {s.name}
                      {s.telugu_name && <div className="text-xs text-[#C86A1B] font-serif font-bold">{s.telugu_name}</div>}
                    </td>
                    <td className="py-3.5 px-4 text-gray-600">{s.category}</td>
                    <td className="py-3.5 px-4 font-bold font-mono">₹{s.price.toFixed(2)}</td>
                    <td className="py-3.5 px-4">
                      {s.is_scheduled ? (
                        <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                          📅 Scheduled: {s.scheduled_date}
                        </span>
                      ) : (
                        <span className="text-xs text-gray-500 font-medium">నిత్య పూజ</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs">
                      {s.assigned_poojaris && s.assigned_poojaris.length > 0 ? (
                        s.assigned_poojaris.map(p => p.name).join(', ')
                      ) : (
                        <span className="text-gray-400 italic">None</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4">
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-semibold ${
                        s.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3.5 px-4 text-right space-x-2">
                      <button
                        onClick={() => handleStartEditSeva(s)}
                        className="text-xs font-semibold text-[#7A1C23] hover:underline inline-flex items-center gap-1 bg-[#FAF5EC] px-3 py-1.5 rounded-lg border border-[#E8DCCE]"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        సవరించు
                      </button>
                      <button
                        onClick={() => handleToggleSevaStatus(s.id, s.is_active)}
                        className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                          s.is_active
                            ? 'text-amber-800 bg-amber-50/50 border-amber-200 hover:bg-amber-100'
                            : 'text-emerald-800 bg-emerald-50/50 border-emerald-200 hover:bg-emerald-100'
                        }`}
                      >
                        {s.is_active ? 'Deactivate' : 'Activate'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {/* Edit Seva Modal */}
          {editingSeva && (
            <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
              <div className="bg-white rounded-xl border border-[#E8DCCE] p-6 max-w-2xl w-full space-y-4 shadow-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex items-center justify-between border-b pb-3">
                  <div>
                    <h3 className="font-bold text-base text-[#7A1C23] flex items-center gap-2">
                      <Edit className="w-4 h-4 text-[#C86A1B]" />
                      సేవ సవరణ: {editingSeva.name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      పేరు, తెలుగు శ్రీ నామం, విభాగం, రుసుము, సమయం మరియు అర్చకుల కేటాయింపులను సవరించవచ్చు.
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setEditingSeva(null)}
                    className="text-gray-400 hover:text-gray-600 p-1"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>

                <form onSubmit={handleSaveEditSeva} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div>
                    <label className="block font-semibold mb-1">సేవ పేరు (English) *</label>
                    <input
                      type="text"
                      required
                      value={editingSevaForm.name}
                      onChange={(e) => setEditingSevaForm({ ...editingSevaForm, name: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded bg-[#FAF5EC]/40"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">తెలుగు పేరు (శ్రీ నామం)</label>
                    <input
                      type="text"
                      value={editingSevaForm.telugu_name}
                      onChange={(e) => setEditingSevaForm({ ...editingSevaForm, telugu_name: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded bg-[#FAF5EC]/40"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">రుసుము (₹) *</label>
                    <input
                      type="number"
                      required
                      min="0"
                      step="1"
                      value={editingSevaForm.price}
                      onChange={(e) => setEditingSevaForm({ ...editingSevaForm, price: parseFloat(e.target.value) || 0 })}
                      className="w-full px-3 py-1.5 border rounded bg-[#FAF5EC]/40 font-bold"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Category</label>
                    <select
                      value={editingSevaForm.category}
                      onChange={(e) => setEditingSevaForm({ ...editingSevaForm, category: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded bg-[#FAF5EC]/40"
                    >
                      <option value="Daily Pooja">Daily Pooja</option>
                      <option value="Special Pooja">Special Pooja</option>
                      <option value="Abhishekam">Abhishekam</option>
                      <option value="Homam">Homam</option>
                      <option value="Archana">Archana</option>
                      <option value="Festivals">Festivals</option>
                    </select>
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">నిర్వహణ సమయం (ఉదా: 09:00 AM - 11:00 AM)</label>
                    <input
                      type="text"
                      value={editingSevaForm.timing}
                      onChange={(e) => setEditingSevaForm({ ...editingSevaForm, timing: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded bg-[#FAF5EC]/40"
                      placeholder="e.g. 08:00 AM - 10:00 AM"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Active Status</label>
                    <select
                      value={editingSevaForm.is_active ? 'true' : 'false'}
                      onChange={(e) => setEditingSevaForm({ ...editingSevaForm, is_active: e.target.value === 'true' })}
                      className="w-full px-3 py-1.5 border rounded bg-[#FAF5EC]/40"
                    >
                      <option value="true">Active (Visible for Booking)</option>
                      <option value="false">Inactive (Disabled)</option>
                    </select>
                  </div>

                  <div className="sm:col-span-2">
                    <label className="block font-semibold mb-1">Description</label>
                    <textarea
                      rows={2}
                      value={editingSevaForm.description}
                      onChange={(e) => setEditingSevaForm({ ...editingSevaForm, description: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded bg-[#FAF5EC]/40"
                    />
                  </div>

                  {/* Date Scheduling */}
                  <div className="sm:col-span-2 p-3 bg-amber-50 border border-amber-200 rounded-lg space-y-2">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        id="editIsScheduledCheck"
                        checked={editingSevaForm.is_scheduled}
                        onChange={(e) => setEditingSevaForm({ ...editingSevaForm, is_scheduled: e.target.checked })}
                        className="rounded border-amber-400 text-[#7A1C23]"
                      />
                      <label htmlFor="editIsScheduledCheck" className="font-bold text-amber-900">
                        నిర్ణీత తేదీకి ప్రత్యేక పూజగా నిర్ణయించండి (తేదీ వారీ విశేష పూజ)
                      </label>
                    </div>
                    <p className="text-[11px] text-amber-800">
                      When scheduled, counter staff can book it immediately in advance, but the assigned poojari will only see it on this scheduled date.
                    </p>
                    {editingSevaForm.is_scheduled && (
                      <div className="w-64 pt-1">
                        <label className="block font-semibold text-gray-700 mb-1">Scheduled Date *</label>
                        <input
                          type="date"
                          required={editingSevaForm.is_scheduled}
                          value={editingSevaForm.scheduled_date}
                          onChange={(e) => setEditingSevaForm({ ...editingSevaForm, scheduled_date: e.target.value })}
                          className="w-full px-3 py-1.5 border rounded bg-white"
                        />
                      </div>
                    )}
                  </div>

                  {/* Assign Poojaris */}
                  <div className="sm:col-span-2">
                    <label className="block font-semibold mb-1">Assigned Poojari(s)</label>
                    <div className="flex flex-wrap gap-2">
                      {poojaris.map(p => (
                        <label key={p.id} className="flex items-center gap-1.5 px-3 py-1 border rounded bg-white cursor-pointer">
                          <input
                            type="checkbox"
                            checked={editingSevaForm.assigned_poojari_ids.includes(p.id)}
                            onChange={(e) => {
                              if (e.target.checked) {
                                setEditingSevaForm({ ...editingSevaForm, assigned_poojari_ids: [...editingSevaForm.assigned_poojari_ids, p.id] });
                              } else {
                                setEditingSevaForm({ ...editingSevaForm, assigned_poojari_ids: editingSevaForm.assigned_poojari_ids.filter(id => id !== p.id) });
                              }
                            }}
                          />
                          <span>{p.name}</span>
                        </label>
                      ))}
                    </div>
                  </div>

                  <div className="sm:col-span-2 flex justify-end gap-2 pt-3 border-t">
                    <button
                      type="button"
                      onClick={() => setEditingSeva(null)}
                      className="px-4 py-2 border rounded bg-white text-gray-600 hover:bg-gray-50"
                    >
                      రద్దు
                    </button>
                    <button
                      type="submit"
                      className="px-5 py-2 bg-[#7A1C23] hover:bg-[#5C1217] text-white rounded font-bold shadow-sm"
                    >
                      Save Changes
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 3: STAFF & POOJARIS */}
      {activeTab === 'staff' && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 bg-white/70 p-3 sm:p-4 rounded-2xl border border-[#E8DCCE]/80 shadow-xs">
            <div>
              <h2 className="text-base sm:text-lg font-bold text-[#7A1C23] font-serif flex items-center gap-2">
                <Users className="w-5 h-5 text-[#C86A1B]" />
                సిబ్బంది & అర్చక ఖాతాలు (Staff & Poojari Accounts)
              </h2>
              <p className="text-xs sm:text-sm text-gray-600 mt-0.5">
                అర్చకులు & కౌంటర్ సిబ్బంది యూజర్ ఐడీలు, అనుమతులు మరియు పాస్‌వర్డ్ నిర్వహణ
              </p>
            </div>
            <button
              onClick={() => setIsCreatingUser(true)}
              className="shrink-0 flex items-center justify-center gap-2 px-4 py-2.5 bg-[#7A1C23] hover:bg-[#5C1217] active:scale-98 text-white rounded-xl text-xs sm:text-sm font-bold shadow-sm transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>కొత్త యూజర్‌ను చేర్చండి (Add User)</span>
            </button>
          </div>

          {isCreatingUser && (
            <div className="p-4 sm:p-5 bg-white border border-[#E8DCCE] rounded-2xl shadow-md space-y-4">
              <h3 className="font-bold text-sm sm:text-base text-[#7A1C23] font-serif flex items-center gap-2">
                <Users className="w-4 h-4 text-[#C86A1B]" />
                సిబ్బంది లేదా అర్చక ఖాతాను సృష్టించండి (Create Account)
              </h3>
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs sm:text-sm">
                <div>
                  <label className="block font-semibold mb-1 text-gray-700">మొబైల్ సంఖ్య / యూజర్‌నేమ్ (Username) *</label>
                  <input
                    type="text"
                    required
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DCCE] rounded-xl bg-[#FAF5EC]/40 text-sm focus:outline-none focus:ring-1 focus:ring-[#C86A1B]"
                    placeholder="మొబైల్ నంబర్ లేదా యూజర్‌నేమ్ (e.g. 9849012345)"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-700">పూర్తి పేరు (Full Name) *</label>
                  <input
                    type="text"
                    required
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full px-3 py-2 border border-[#E8DCCE] rounded-xl bg-[#FAF5EC]/40 text-sm focus:outline-none focus:ring-1 focus:ring-[#C86A1B]"
                    placeholder="e.g. Sri Sharma Deekshitulu"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-700">పాత్ర / హోదా (Role) *</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                    className="w-full px-3 py-2 border border-[#E8DCCE] rounded-xl bg-[#FAF5EC]/40 text-sm focus:outline-none focus:ring-1 focus:ring-[#C86A1B]"
                  >
                    <option value="poojari">అర్చకులు / పూజారి (Poojari - Ritual Dashboard)</option>
                    <option value="booking_staff">కౌంటర్ సిబ్బంది (Booking Counter Staff)</option>
                    <option value="admin">నిర్వాహకులు (Administrator)</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1 text-gray-700">పాస్‌వర్డ్ (Password) *</label>
                  <div className="relative">
                    <input
                      type={showNewUserPass ? 'text' : 'password'}
                      required
                      value={newUser.password}
                      onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                      className="w-full px-3 pr-10 py-2 border border-[#E8DCCE] rounded-xl bg-[#FAF5EC]/40 text-sm focus:outline-none focus:ring-1 focus:ring-[#C86A1B]"
                      placeholder="కనీసం 6 అక్షరాలు (Min 6 chars)"
                    />
                    <button
                      type="button"
                      onClick={() => setShowNewUserPass(!showNewUserPass)}
                      className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                    >
                      {showNewUserPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                    </button>
                  </div>
                </div>
                <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingUser(false)}
                    className="px-4 py-2 border border-[#E8DCCE] rounded-xl bg-white text-gray-600 text-xs sm:text-sm font-semibold hover:bg-gray-50"
                  >
                    రద్దు (Cancel)
                  </button>
                  <button
                    type="submit"
                    disabled={isCreatingUserLoading}
                    className="px-5 py-2 bg-[#7A1C23] text-white rounded-xl text-xs sm:text-sm font-bold hover:bg-[#5C1217] disabled:opacity-50 flex items-center gap-2 transition-all"
                  >
                    {isCreatingUserLoading ? (
                      <>
                        <span className="w-3.5 h-3.5 border-2 border-white border-t-transparent rounded-full animate-spin"></span>
                        <span>సృష్టిస్తోంది... (Creating...)</span>
                      </>
                    ) : (
                      <span>ఖాతా సృష్టించు (Create Account)</span>
                    )}
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Mobile User Cards View (Zero Overflow, Touch-Friendly) */}
          <div className="sm:hidden space-y-3">
            {staffUsers.map((u) => {
              const isActive = (u as any).is_active !== false;
              return (
                <div
                  key={u.id}
                  className="bg-white rounded-2xl p-4 border border-[#E8DCCE] shadow-xs space-y-3"
                >
                  <div className="flex items-start justify-between gap-2">
                    <div>
                      <h4 className="text-sm font-bold text-[#2D2520]">{u.name}</h4>
                      <div className="flex items-center gap-1.5 mt-1">
                        <span className="text-xs font-mono text-gray-600 bg-[#FAF5EC] px-2 py-0.5 rounded-md border border-[#E8DCCE]">
                          @{u.username}
                        </span>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-bold uppercase bg-[#FAF5EC] text-[#7A1C23] border border-[#E8DCCE]">
                        {u.role === 'booking_staff' ? 'కౌంటర్ సిబ్బంది' : u.role === 'poojari' ? 'అర్చకులు' : 'అడ్మిన్'}
                      </span>
                      <span className={`px-2.5 py-0.5 rounded-full text-xs font-bold ${
                        isActive
                          ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                          : 'bg-red-100 text-red-700 border border-red-200'
                      }`}>
                        {isActive ? '● Active' : '○ Disabled'}
                      </span>
                    </div>
                  </div>

                  {/* Actions Grid: Side-by-side, 100% visible and easy to tap on mobile */}
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-[#FAF5EC]">
                    <button
                      onClick={() => {
                        setResettingUser(u);
                        setNewPasswordValue('');
                        setPasswordStatusMsg(null);
                      }}
                      className="flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl bg-[#FAF5EC] hover:bg-[#F3ECE0] text-[#7A1C23] text-xs font-bold border border-[#E8DCCE] active:scale-98 transition-all"
                    >
                      <span>🔑 పాస్‌వర్డ్ రీసెట్</span>
                    </button>

                    <button
                      onClick={() => handleToggleUserStatus(u.id, isActive)}
                      className={`flex items-center justify-center gap-1 px-2.5 py-2 rounded-xl text-xs font-bold border transition-all active:scale-98 ${
                        isActive
                          ? 'bg-red-50 text-red-700 border-red-200 hover:bg-red-100'
                          : 'bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100'
                      }`}
                    >
                      <span>{isActive ? '🚫 ఖాతా నిలిపివేయి (Disable)' : '✅ పునరుద్ధరించు (Enable)'}</span>
                    </button>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Desktop Table View */}
          <div className="hidden sm:block bg-white rounded-2xl border border-[#E8DCCE] shadow-sm overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-[#FAF5EC] text-gray-700 font-bold border-b border-[#E8DCCE]">
                <tr>
                  <th className="py-3.5 px-4">పేరు (Name)</th>
                  <th className="py-3.5 px-4">యూజర్‌నేమ్ (Username)</th>
                  <th className="py-3.5 px-4">పాత్ర (Role)</th>
                  <th className="py-3.5 px-4">స్థితి (Status)</th>
                  <th className="py-3.5 px-4 text-right">చర్యలు (Actions)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FAF5EC]">
                {staffUsers.map((u) => {
                  const isActive = (u as any).is_active !== false;
                  return (
                    <tr key={u.id} className="hover:bg-[#FAF5EC]/30">
                      <td className="py-3.5 px-4 font-bold text-[#2D2520]">{u.name}</td>
                      <td className="py-3.5 px-4 font-mono text-gray-600">{u.username}</td>
                      <td className="py-3.5 px-4">
                        <span className="px-2.5 py-1 rounded-md text-xs font-bold uppercase bg-[#FAF5EC] text-[#7A1C23] border border-[#E8DCCE]">
                          {u.role === 'booking_staff' ? 'కౌంటర్ సిబ్బంది' : u.role === 'poojari' ? 'అర్చకులు' : 'అడ్మిన్'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className={`px-2.5 py-1 rounded-md text-xs font-semibold ${
                          isActive ? 'bg-emerald-100 text-emerald-800' : 'bg-red-100 text-red-700'
                        }`}>
                          {isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4 text-right space-x-2">
                        <button
                          onClick={() => {
                            setResettingUser(u);
                            setNewPasswordValue('');
                            setPasswordStatusMsg(null);
                          }}
                          className="text-xs font-semibold text-[#7A1C23] hover:underline bg-[#FAF5EC] px-3 py-1.5 rounded-lg border border-[#E8DCCE]"
                        >
                          పాస్‌వర్డ్ మార్చు (Reset)
                        </button>
                        <button
                          onClick={() => handleToggleUserStatus(u.id, isActive)}
                          className={`text-xs font-semibold px-3 py-1.5 rounded-lg border ${
                            isActive
                              ? 'text-red-700 bg-red-50/50 border-red-200 hover:bg-red-100'
                              : 'text-emerald-700 bg-emerald-50/50 border-emerald-200 hover:bg-emerald-100'
                          }`}
                        >
                          {isActive ? 'Disable' : 'Enable'}
                        </button>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          {/* Password Reset Modal */}
          {resettingUser && (
            <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/40 backdrop-blur-xs">
              <div className="bg-white rounded-2xl shadow-xl border border-[#E8DCCE] max-w-sm w-full p-5 space-y-4">
                <div className="flex items-center justify-between border-b border-[#FAF5EC] pb-3">
                  <h3 className="text-sm font-bold text-[#7A1C23] font-serif">
                    🔐 పాస్‌వర్డ్ మార్పు (Change Password)
                  </h3>
                  <button
                    onClick={() => setResettingUser(null)}
                    className="text-gray-400 hover:text-gray-600 font-bold text-sm"
                  >
                    ✕
                  </button>
                </div>

                <div className="text-xs sm:text-sm text-gray-600 space-y-1">
                  <p><span className="font-bold text-[#2D2520]">వినియోగదారు:</span> {resettingUser.name}</p>
                  <p><span className="font-bold text-[#2D2520]">యూజర్‌నేమ్:</span> <span className="font-mono bg-[#FAF5EC] px-1.5 py-0.5 rounded border border-[#E8DCCE]">@{resettingUser.username}</span></p>
                </div>

                {passwordStatusMsg && (
                  <div className="p-2.5 rounded-lg bg-red-50 text-red-700 text-xs sm:text-sm border border-red-200">
                    {passwordStatusMsg}
                  </div>
                )}

                <form onSubmit={handleResetPassword} className="space-y-3">
                  <div>
                    <label className="block text-xs sm:text-sm font-bold text-[#7A1C23] mb-1 font-serif">
                      నూతన రహస్య సంకేతం (New Password)
                    </label>
                    <div className="relative">
                      <input
                        type={showResetPass ? 'text' : 'password'}
                        required
                        minLength={6}
                        value={newPasswordValue}
                        onChange={(e) => setNewPasswordValue(e.target.value)}
                        placeholder="కనీసం 6 అక్షరాలు (Min 6 chars)"
                        className="w-full pl-3 pr-10 py-2.5 text-sm bg-[#FAF5EC]/70 border border-[#E8DCCE] rounded-xl focus:outline-none focus:ring-2 focus:ring-[#C86A1B] text-[#2D2520] font-bold"
                      />
                      <button
                        type="button"
                        onClick={() => setShowResetPass(!showResetPass)}
                        className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
                      >
                        {showResetPass ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                      </button>
                    </div>
                  </div>

                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setResettingUser(null)}
                      className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-gray-600 bg-gray-100 hover:bg-gray-200 transition-colors"
                    >
                      రద్దు (Cancel)
                    </button>
                    <button
                      type="submit"
                      disabled={isSavingPassword}
                      className="flex-1 py-2.5 rounded-xl text-xs sm:text-sm font-bold text-white bg-[#7A1C23] hover:bg-[#912028] transition-colors shadow-sm"
                    >
                      {isSavingPassword ? 'సేవ్ అవుతోంది...' : 'సేవ్ చేయండి (Save)'}
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 4: REPORTS & CSV EXPORT */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="glass-surface p-3.5 rounded-2xl border border-white/80 shadow-xs flex flex-col lg:flex-row items-stretch lg:items-center justify-between gap-3">
            <div className="flex flex-wrap items-center gap-2.5">
              <div className="flex-1 min-w-[130px]">
                <label className="block text-[10px] font-bold uppercase text-[#7A1C23] mb-0.5">ప్రారంభ తేదీ</label>
                <input
                  type="date"
                  value={reportStart}
                  onChange={(e) => setReportStart(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#FAF5EC]/90 border border-[#E8DCCE] rounded-xl text-xs font-bold text-[#2D2520]"
                />
              </div>
              <div className="flex-1 min-w-[130px]">
                <label className="block text-[10px] font-bold uppercase text-[#7A1C23] mb-0.5">ముగింపు తేదీ</label>
                <input
                  type="date"
                  value={reportEnd}
                  onChange={(e) => setReportEnd(e.target.value)}
                  className="w-full px-2.5 py-1.5 bg-[#FAF5EC]/90 border border-[#E8DCCE] rounded-xl text-xs font-bold text-[#2D2520]"
                />
              </div>
              <button
                onClick={loadReport}
                className="mt-3.5 px-3.5 py-1.5 bg-[#FAF5EC] border border-[#E8DCCE] text-[#7A1C23] rounded-xl text-xs font-bold hover:bg-[#F3ECE0] transition-colors shadow-2xs"
              >
                నివేదికను రూపొందించు
              </button>
            </div>

            <button
              onClick={handleDownloadCsv}
              className="flex items-center justify-center gap-1.5 px-4 py-2 bg-[#7A1C23] hover:bg-[#5C1217] text-white rounded-xl text-xs font-bold shadow-xs transition-colors shrink-0"
            >
              <Download className="w-4 h-4 text-[#E0AE18]" />
              CSV నివేదిక డౌన్‌లోడ్
            </button>
          </div>

          {reportData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-xl border border-[#E8DCCE] shadow-sm space-y-3">
                <h3 className="font-bold text-sm text-[#7A1C23] border-b pb-2">ఆర్థిక గణాంకాల సమన్వయం</h3>
                <div className="divide-y text-xs">
                  <div className="py-2 flex justify-between">
                    <span>మొత్తం బుకింగ్ రుసుము</span>
                    <span className="font-bold">₹{formatCurrency(reportData.financials?.booked_amount)}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span>స్వీకరించిన వసూళ్లు</span>
                    <span className="font-bold text-emerald-700">₹{formatCurrency(reportData.financials?.confirmed_amount)}</span>
                  </div>
                  <div className="py-2 flex justify-between pl-4 text-gray-600">
                    <span>• కౌంటర్ నగదు (Cash)</span>
                    <span>₹{formatCurrency(reportData.financials?.cash_total)}</span>
                  </div>
                  <div className="py-2 flex justify-between pl-4 text-gray-600">
                    <span>• యూపీఐ డిజిటల్ (UPI)</span>
                    <span>₹{formatCurrency(reportData.financials?.upi_total)}</span>
                  </div>
                  <div className="py-2 flex justify-between text-amber-700">
                    <span>ధృవీకరించవలసినవి (పెండింగ్)</span>
                    <span>₹{formatCurrency(reportData.financials?.pending_amount)}</span>
                  </div>
                  <div className="py-2 flex justify-between text-rose-700">
                    <span>Refunds / రద్దుlations</span>
                    <span>₹{formatCurrency(reportData.financials?.refund_amount)}</span>
                  </div>
                  <div className="py-2 flex justify-between font-extrabold text-[#7A1C23] text-sm">
                    <span>నికర ఆలయ ఆదాయం (Net)</span>
                    <span>₹{formatCurrency(reportData.financials?.net_collected_amount)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-[#E8DCCE] shadow-sm space-y-3">
                <h3 className="font-bold text-sm text-[#7A1C23] border-b pb-2">సేవల వారీ ఆదాయ విశ్లేషణ</h3>
                <div className="divide-y text-xs max-h-72 overflow-y-auto">
                  {reportData.seva_breakdown.map((s: any) => (
                    <div key={s.seva_name} className="py-2 flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-[#2D2520]">{s.seva_name}</div>
                        <div className="text-[10px] text-gray-500">{s.category} • {s.total_quantity} Booked</div>
                      </div>
                      <span className="font-bold text-[#7A1C23]">₹{formatCurrency(s.total_revenue)}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* TAB 5: DAILY CLOSURE */}
      {activeTab === 'closure' && (
        <div className="max-w-3xl mx-auto space-y-4">
          <div className="bg-white p-6 rounded-xl border border-[#E8DCCE] shadow-sm space-y-4">
            <h2 className="text-base font-bold text-[#7A1C23] flex items-center gap-2">
              <CheckSquare className="w-5 h-5 text-[#C86A1B]" />
              End-of-Day Closing Checklist & Verification ({reportDate})
            </h2>

            {closureStatus?.is_closed ? (
              <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-lg text-xs text-emerald-900 space-y-1">
                <div className="font-bold flex items-center gap-1.5">
                  <CheckCircle className="w-4 h-4 text-emerald-600" />
                  Daily closure for {reportDate} is COMPLETED.
                </div>
                <div>Closed By: <strong>{closureStatus.closure_record?.closed_by_name || 'Admin'}</strong></div>
                <div>Net Collected: <strong>₹{parseFloat(closureStatus.closure_record?.net_collected_amount || 0).toFixed(2)}</strong></div>
                {closureStatus.closure_record?.notes && <div>Notes: {closureStatus.closure_record.notes}</div>}
              </div>
            ) : (
              <div className="space-y-4">
                <div className="p-4 bg-amber-50 border border-amber-200 rounded-lg text-xs space-y-2 text-amber-900">
                  <div className="font-bold">Daily Closing Checklist:</div>
                  <ul className="list-disc pl-5 space-y-1">
                    <li>Count physical cash drawer currency and reconcile with ₹{closureStatus?.summary?.cash_total?.toFixed(2) || '0.00'}.</li>
                    <li>Verify all UPI transaction entries on bank merchant soundbox / app.</li>
                    <li>Ensure no unresolved pending payments remain ({closureStatus?.pending_payments_count || 0} pending payments currently).</li>
                    <li>Ensure all poojaris have their assigned seva registration lists.</li>
                  </ul>
                </div>

                <div>
                  <label className="block text-xs font-semibold mb-1">Closure Notes / Reconciliation Comments</label>
                  <textarea
                    rows={2}
                    value={closureNotes}
                    onChange={(e) => setClosureNotes(e.target.value)}
                    placeholder="e.g. Cash drawer counted and reconciled exactly. All 42 sevas successfully completed."
                    className="w-full px-3 py-2 border rounded text-xs bg-[#FAF5EC]/30"
                  />
                </div>

                <button
                  onClick={handlePerformClosure}
                  className="w-full py-2.5 bg-[#7A1C23] hover:bg-[#5C1217] text-white rounded-md text-xs font-bold shadow transition-colors"
                >
                  Verify & Sign-Off Daily Closure
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 6: DEVOTEE PRIVACY & RETENTION */}
      {activeTab === 'retention' && (
        <div className="max-w-4xl mx-auto space-y-5">
          <div className="bg-white p-6 rounded-xl border border-[#E8DCCE] shadow-sm space-y-4">
            <div className="border-b pb-3">
              <h2 className="text-base font-bold text-[#7A1C23] flex items-center gap-2">
                <History className="w-5 h-5 text-[#C86A1B]" />
                Devotee Profile Privacy & 90-Day Retention Policy
              </h2>
              <p className="text-xs text-gray-600 mt-1">
                Under the Sringeri Temple Privacy Policy, devotee reusable contact profiles inactive for more than 90 days are eligible for cleanup.
                <strong> Historical bookings, tickets, payments, and ritual records are retained indefinitely and are NEVER deleted.</strong>
              </p>
            </div>

            {retentionPreview && (
              <div className="space-y-4 text-xs">
                <div className="grid grid-cols-2 gap-4 p-4 bg-[#FAF5EC] rounded-lg border border-[#E8DCCE]">
                  <div>
                    <div className="text-gray-500">Retention Threshold:</div>
                    <div className="font-bold text-sm text-[#7A1C23]">
                      {retentionPreview.policy.min_retention_days} Days (3 Months)
                    </div>
                  </div>
                  <div>
                    <div className="text-gray-500">Profiles Eligible for Cleanup:</div>
                    <div className="font-bold text-sm text-[#7A1C23]">
                      {retentionPreview.eligible_count} Profiles
                    </div>
                  </div>
                </div>

                {retentionPreview.eligible_count > 0 ? (
                  <div className="space-y-3">
                    <h3 className="font-bold text-gray-800">Preview of Eligible Profiles</h3>
                    <div className="max-h-48 overflow-y-auto border border-[#E8DCCE] rounded divide-y">
                      {retentionPreview.sample_profiles.map((p: any) => (
                        <div key={p.id} className="p-2 flex justify-between items-center text-xs">
                          <div>
                            <span className="font-semibold text-[#2D2520]">{p.name}</span> ({p.mobile})
                            <span className="text-gray-500 ml-2">Gothra: {p.gothra}</span>
                          </div>
                          <span className="text-gray-500">{p.days_inactive} days inactive</span>
                        </div>
                      ))}
                    </div>

                    <div className="p-4 bg-red-50 border border-red-200 rounded-lg space-y-3 text-red-900">
                      <div className="flex items-center gap-2">
                        <input
                          type="checkbox"
                          id="confirmRetentionCheck"
                          checked={retentionConfirmed}
                          onChange={(e) => setRetentionConfirmed(e.target.checked)}
                          className="rounded border-red-300 text-[#7A1C23]"
                        />
                        <label htmlFor="confirmRetentionCheck" className="font-bold">
                          I explicitly authorize the cleanup of these {retentionPreview.eligible_count} inactive profiles.
                        </label>
                      </div>

                      <input
                        type="text"
                        placeholder="Audit justification notes..."
                        value={retentionNotes}
                        onChange={(e) => setRetentionNotes(e.target.value)}
                        className="w-full px-3 py-1.5 bg-white border border-red-300 rounded text-xs"
                      />

                      <button
                        onClick={handleExecuteRetention}
                        disabled={!retentionConfirmed}
                        className="px-4 py-2 bg-[#7A1C23] hover:bg-[#5C1217] text-white rounded text-xs font-bold disabled:opacity-50"
                      >
                        Execute Audited Retention Cleanup
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="p-4 bg-emerald-50 border border-emerald-200 rounded text-center text-emerald-800">
                    All devotee profiles are currently active within the 90-day retention window. No cleanup needed.
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}

      {/* TAB 7: IMMUTABLE AUDIT TRAIL */}
      {activeTab === 'audit' && (
        <div className="bg-white rounded-xl border border-[#E8DCCE] shadow-sm overflow-hidden space-y-2 p-4">
          <h2 className="text-base font-bold text-[#7A1C23] mb-2 flex items-center gap-2">
            <Shield className="w-5 h-5 text-[#C86A1B]" />
            Immutable Audit Trail
          </h2>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF5EC] text-gray-700 font-semibold border-b border-[#E8DCCE]">
                <tr>
                  <th className="py-2.5 px-3">Timestamp</th>
                  <th className="py-2.5 px-3">Action</th>
                  <th className="py-2.5 px-3">Entity</th>
                  <th className="py-2.5 px-3">Actor</th>
                  <th className="py-2.5 px-3">Details / Reason</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FAF5EC]">
                {auditLogs.map((log) => (
                  <tr key={log.id} className="hover:bg-[#FAF5EC]/30">
                    <td className="py-2 px-3 text-gray-500 font-mono text-[11px]">
                      {new Date(log.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })}
                    </td>
                    <td className="py-2 px-3 font-semibold text-[#7A1C23]">
                      {log.action}
                    </td>
                    <td className="py-2 px-3 uppercase text-[10px] text-gray-600">
                      {log.entity_type}
                    </td>
                    <td className="py-2 px-3 font-medium">
                      {log.actor_name || 'System'}
                    </td>
                    <td className="py-2 px-3 font-mono text-[10px] text-gray-600 max-w-xs truncate">
                      {log.reason ? `[Reason: ${log.reason}] ` : ''}
                      {JSON.stringify(log.details)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 8: SETTINGS */}
      {activeTab === 'settings' && templeSettings && (
        <div className="max-w-4xl mx-auto space-y-6">
          {/* Header */}
          <div className="bg-white p-5 rounded-xl border border-[#E8DCCE] shadow-sm flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-[#7A1C23] flex items-center gap-2">
                <Settings className="w-5 h-5 text-[#C86A1B]" />
                Temple Identity & Merchant UPI Configuration
              </h2>
              <p className="text-xs text-gray-500 mt-0.5">
                Manage temple identity display headers, official merchant UPI ID, and counter payment QR codes.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 items-start">
            {/* CARD 1: MERCHANT UPI CONFIGURATION */}
            <div className="bg-white p-5 rounded-xl border border-[#E8DCCE] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8DCCE] pb-3">
                <div className="flex items-center gap-2">
                  <QrCode className="w-4 h-4 text-[#C86A1B]" />
                  <h3 className="font-bold text-sm text-[#7A1C23]">Merchant UPI Settings</h3>
                </div>
                {!isEditingUpi && (
                  <button
                    type="button"
                    onClick={() => setIsEditingUpi(true)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-[#FAF5EC] border border-[#E8DCCE] text-[#7A1C23] rounded text-xs font-semibold hover:bg-[#F3ECE0]"
                  >
                    <Edit className="w-3 h-3 text-[#C86A1B]" />
                    Edit UPI Details
                  </button>
                )}
              </div>

              {isEditingUpi ? (
                <form onSubmit={handleSaveUpiConfig} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Merchant Display Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={upiForm.merchant_name}
                      onChange={(e) => setUpiForm({ ...upiForm, merchant_name: e.target.value })}
                      placeholder="e.g. SRI SRINGERI SHARADA PEETHAM TEMPLE"
                      className="w-full px-3 py-1.5 border border-[#E8DCCE] rounded bg-[#FAF5EC]/40 text-[#2D2520] focus:ring-2 focus:ring-[#C86A1B] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      UPI ID / VPA (Virtual Payment Address) *
                    </label>
                    <input
                      type="text"
                      required
                      value={upiForm.upi_id}
                      onChange={(e) => setUpiForm({ ...upiForm, upi_id: e.target.value })}
                      placeholder="e.g. sringeri.temple@sbi"
                      className="w-full px-3 py-1.5 border border-[#E8DCCE] rounded bg-[#FAF5EC]/40 font-mono text-[#2D2520] focus:ring-2 focus:ring-[#C86A1B] focus:outline-none"
                    />
                    <p className="text-[10px] text-gray-500 mt-0.5">
                      Payments will be routed directly to this temple bank account.
                    </p>
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Counter Verification Instructions
                    </label>
                    <textarea
                      rows={2}
                      value={upiForm.verification_instruction}
                      onChange={(e) => setUpiForm({ ...upiForm, verification_instruction: e.target.value })}
                      placeholder="e.g. Verify confirmation on temple soundbox or merchant SMS before issuing tickets."
                      className="w-full px-3 py-1.5 border border-[#E8DCCE] rounded bg-[#FAF5EC]/40 text-[#2D2520] focus:ring-2 focus:ring-[#C86A1B] focus:outline-none"
                    />
                  </div>

                  {/* Upload Official Standee QR Image */}
                  <div className="pt-2 border-t border-gray-100 space-y-2">
                    <label className="block font-semibold text-gray-700 mb-0.5">
                      Upload Official Temple Standee QR (Bank / Merchant Standee Image)
                    </label>
                    <div className="flex items-center gap-3">
                      <label className="cursor-pointer inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#FAF5EC] border border-[#E8DCCE] text-[#7A1C23] rounded text-xs font-semibold hover:bg-[#F3ECE0]">
                        <Upload className="w-3.5 h-3.5 text-[#C86A1B]" />
                        Choose Standee Image
                        <input
                          type="file"
                          accept="image/*"
                          onChange={handleQrUpload}
                          className="hidden"
                        />
                      </label>
                      {upiForm.qr_image_url && (
                        <button
                          type="button"
                          onClick={() => setUpiForm(prev => ({ ...prev, qr_image_url: '' }))}
                          className="text-[11px] text-red-600 hover:text-red-800 underline font-semibold"
                        >
                          Remove Image
                        </button>
                      )}
                    </div>
                    <p className="text-[10px] text-gray-500">
                      Upload photo or digital file of your temple's physical standee (PhonePe, GPay, BharatPe, SBI, Canara). Counter staff will present this QR for devotees to scan.
                    </p>

                    {upiForm.qr_image_url && (
                      <div className="mt-2 p-3 bg-gray-50 border border-gray-200 rounded-lg flex flex-col items-center">
                        <div className="text-[10px] font-bold text-gray-600 uppercase mb-2">
                          Standee Image Preview
                        </div>
                        <img
                          src={upiForm.qr_image_url}
                          alt="Standee QR Preview"
                          className="max-h-52 object-contain rounded border border-gray-300 shadow-sm bg-white p-1"
                        />
                      </div>
                    )}
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[#E8DCCE]">
                    <button
                      type="button"
                      onClick={() => setIsEditingUpi(false)}
                      className="px-3 py-1.5 border border-[#E8DCCE] rounded text-gray-600 bg-white hover:bg-gray-50"
                    >
                      రద్దు
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-[#7A1C23] hover:bg-[#5C1217] text-white rounded font-semibold shadow-xs"
                    >
                      Save UPI Configuration
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-4 text-xs">
                  <div className="p-3 bg-amber-50 rounded-lg border border-amber-200/80 space-y-1.5 text-gray-800">
                    <div>
                      <span className="font-semibold text-gray-600">Merchant Name:</span>{' '}
                      <strong className="text-[#7A1C23]">{templeSettings.upi_config?.merchant_name || 'Sri Sharada Peetham Temple'}</strong>
                    </div>
                    <div>
                      <span className="font-semibold text-gray-600">UPI ID / VPA:</span>{' '}
                      <span className="font-mono font-bold text-amber-950 bg-white px-2 py-0.5 rounded border border-amber-300">
                        {templeSettings.upi_config?.upi_id || 'sringeri.temple@sbi'}
                      </span>
                    </div>
                    {templeSettings.upi_config?.verification_instruction && (
                      <div className="text-[11px] text-gray-600 pt-1 border-t border-amber-200/60">
                        <strong>Counter Instruction:</strong> {templeSettings.upi_config.verification_instruction}
                      </div>
                    )}
                  </div>

                  {/* Active Temple Standee QR Code Display */}
                  <div className="flex flex-col items-center">
                    <div className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider mb-2">
                      Active Counter QR Code
                    </div>
                    {templeSettings.upi_config?.qr_image_url ? (
                      <div className="flex flex-col items-center p-2 bg-white rounded-lg border border-[#E8DCCE] shadow-xs">
                        <img
                          src={templeSettings.upi_config.qr_image_url}
                          alt="Official Temple Standee QR"
                          className="max-h-56 max-w-full object-contain rounded border border-gray-100 shadow-sm"
                        />
                        <div className="text-[11px] font-medium text-amber-900 mt-2 text-center">
                          Official standee QR presented to devotees at counter
                        </div>
                      </div>
                    ) : (
                      <div className="w-full p-4 border border-dashed border-amber-300 bg-amber-50/50 rounded-lg text-center space-y-1.5">
                        <QrCode className="w-8 h-8 text-[#C86A1B] mx-auto opacity-70" />
                        <div className="text-xs font-semibold text-gray-700">No Standee Image Uploaded Yet</div>
                        <p className="text-[10px] text-gray-500">
                          Click "Edit UPI Details" above to upload your temple's official bank standee photo.
                        </p>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* CARD 2: TEMPLE IDENTITY & CONTACTS */}
            <div className="bg-white p-5 rounded-xl border border-[#E8DCCE] shadow-sm space-y-4">
              <div className="flex items-center justify-between border-b border-[#E8DCCE] pb-3">
                <div className="flex items-center gap-2">
                  <Shield className="w-4 h-4 text-[#C86A1B]" />
                  <h3 className="font-bold text-sm text-[#7A1C23]">Temple Identity</h3>
                </div>
                {!isEditingTempleInfo && (
                  <button
                    type="button"
                    onClick={() => setIsEditingTempleInfo(true)}
                    className="flex items-center gap-1 px-2.5 py-1 bg-[#FAF5EC] border border-[#E8DCCE] text-[#7A1C23] rounded text-xs font-semibold hover:bg-[#F3ECE0]"
                  >
                    <Edit className="w-3 h-3 text-[#C86A1B]" />
                    Edit Details
                  </button>
                )}
              </div>

              {isEditingTempleInfo ? (
                <form onSubmit={handleSaveTempleInfo} className="space-y-3 text-xs">
                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Temple Official Name (English) *
                    </label>
                    <input
                      type="text"
                      required
                      value={templeInfoForm.name}
                      onChange={(e) => setTempleInfoForm({ ...templeInfoForm, name: e.target.value })}
                      className="w-full px-3 py-1.5 border border-[#E8DCCE] rounded bg-[#FAF5EC]/40 text-[#2D2520] focus:ring-2 focus:ring-[#C86A1B] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Telugu Name (శ్రీ శారదా పీఠం సన్నిధానం)
                    </label>
                    <input
                      type="text"
                      value={templeInfoForm.telugu_name}
                      onChange={(e) => setTempleInfoForm({ ...templeInfoForm, telugu_name: e.target.value })}
                      className="w-full px-3 py-1.5 border border-[#E8DCCE] rounded bg-[#FAF5EC]/40 text-[#2D2520] font-serif focus:ring-2 focus:ring-[#C86A1B] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Mutt Tagline / Peetham Tradition
                    </label>
                    <input
                      type="text"
                      value={templeInfoForm.tagline}
                      onChange={(e) => setTempleInfoForm({ ...templeInfoForm, tagline: e.target.value })}
                      className="w-full px-3 py-1.5 border border-[#E8DCCE] rounded bg-[#FAF5EC]/40 text-[#2D2520] focus:ring-2 focus:ring-[#C86A1B] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Temple Address
                    </label>
                    <input
                      type="text"
                      value={templeInfoForm.address}
                      onChange={(e) => setTempleInfoForm({ ...templeInfoForm, address: e.target.value })}
                      className="w-full px-3 py-1.5 border border-[#E8DCCE] rounded bg-[#FAF5EC]/40 text-[#2D2520] focus:ring-2 focus:ring-[#C86A1B] focus:outline-none"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold text-gray-700 mb-1">
                      Contact Phone
                    </label>
                    <input
                      type="text"
                      value={templeInfoForm.contact_phone}
                      onChange={(e) => setTempleInfoForm({ ...templeInfoForm, contact_phone: e.target.value })}
                      className="w-full px-3 py-1.5 border border-[#E8DCCE] rounded bg-[#FAF5EC]/40 text-[#2D2520] focus:ring-2 focus:ring-[#C86A1B] focus:outline-none"
                    />
                  </div>

                  <div className="flex justify-end gap-2 pt-2 border-t border-[#E8DCCE]">
                    <button
                      type="button"
                      onClick={() => setIsEditingTempleInfo(false)}
                      className="px-3 py-1.5 border border-[#E8DCCE] rounded text-gray-600 bg-white hover:bg-gray-50"
                    >
                      రద్దు
                    </button>
                    <button
                      type="submit"
                      className="px-4 py-1.5 bg-[#7A1C23] hover:bg-[#5C1217] text-white rounded font-semibold shadow-xs"
                    >
                      Save Temple Identity
                    </button>
                  </div>
                </form>
              ) : (
                <div className="space-y-3 text-xs">
                  <div className="p-3.5 bg-[#FAF5EC] rounded-lg border border-[#E8DCCE] space-y-1.5 text-gray-800">
                    <div>
                      <span className="font-semibold text-gray-500">Official Name:</span>
                      <div className="font-bold text-sm text-[#7A1C23]">{templeSettings.temple_info?.name}</div>
                    </div>
                    {templeSettings.temple_info?.telugu_name && (
                      <div>
                        <span className="font-semibold text-gray-500">శ్రీ నామం:</span>
                        <div className="text-[#C86A1B] font-serif text-sm">{templeSettings.temple_info.telugu_name}</div>
                      </div>
                    )}
                    {templeSettings.temple_info?.tagline && (
                      <div className="text-[11px] text-gray-600 italic">
                        {templeSettings.temple_info.tagline}
                      </div>
                    )}
                    {templeSettings.temple_info?.address && (
                      <div className="text-[11px] text-gray-600 pt-1 border-t border-[#E8DCCE]">
                        📍 {templeSettings.temple_info.address}
                      </div>
                    )}
                    {templeSettings.temple_info?.contact_phone && (
                      <div className="text-[11px] text-gray-600">
                        📞 {templeSettings.temple_info.contact_phone}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Ticket Modal */}
      <TicketPrintModal
        isOpen={printModalOpen}
        onClose={() => setPrintModalOpen(false)}
        bookingNumber={selectedBookingNumber}
        tickets={selectedBookingTickets}
        onTicketsUpdated={(t) => setSelectedBookingTickets(t)}
      />

      {/* రద్దుlation Modal */}
      {cancellationBookingId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E8DCCE] p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-rose-700">రద్దు Booking & Process Refund</h3>
            <p className="text-xs text-gray-600">
              This action will mark the booking and all its item tickets as cancelled, update payment status to refunded, and log an audit record.
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Reason for రద్దుlation *
              </label>
              <textarea
                rows={3}
                required
                value={cancellationReason}
                onChange={(e) => setరద్దుlationReason(e.target.value)}
                placeholder="e.g. Devotee emergency request; ritual could not be performed"
                className="w-full px-3 py-2 border rounded text-xs bg-[#FAF5EC]/30"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setరద్దుlationBookingId(null); setరద్దుlationReason(''); }}
                className="px-3 py-1.5 border rounded text-xs text-gray-600"
              >
                Back
              </button>
              <button
                onClick={handleరద్దుBooking}
                className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded text-xs"
              >
                Confirm రద్దుlation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

