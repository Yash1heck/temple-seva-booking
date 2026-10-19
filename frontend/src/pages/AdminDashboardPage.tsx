import React, { useState, useEffect } from 'react';
import { Seva, Booking, User, Ticket } from '../types.js';
import { apiRequest } from '../api/client.js';
import { TicketPrintModal } from '../components/TicketPrintModal.js';
import {
  Shield, Calendar, DollarSign, Users, BookOpen, Layers,
  Download, CheckCircle, AlertTriangle, Search, Plus, Trash2,
  Lock, RefreshCw, FileText, Settings, History, CheckSquare,
  Edit, X
} from 'lucide-react';

export const AdminDashboardPage: React.FC = () => {
  const [activeTab, setActiveTab] = useState<'overview' | 'sevas' | 'staff' | 'reports' | 'closure' | 'retention' | 'audit' | 'settings'>('overview');

  // Overview Data
  const [reportDate, setReportDate] = useState(new Date().toISOString().split('T')[0]);
  const [todaySummary, setTodaySummary] = useState<any>(null);
  const [bookings, setBookings] = useState<Booking[]>([]);
  const [searchBooking, setSearchBooking] = useState('');
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);

  // Sevas Management
  const [sevas, setSevas] = useState<Seva[]>([]);
  const [poojaris, setPoojaris] = useState<User[]>([]);
  const [isCreatingSeva, setIsCreatingSeva] = useState(false);
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
  const [newUser, setNewUser] = useState({
    username: '',
    name: '',
    role: 'poojari' as 'admin' | 'booking_staff' | 'poojari',
    password: ''
  });

  // Reports
  const [reportStart, setReportStart] = useState(new Date().toISOString().split('T')[0]);
  const [reportEnd, setReportEnd] = useState(new Date().toISOString().split('T')[0]);
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

  // Cancellation Modal
  const [cancellationBookingId, setCancellationBookingId] = useState<string | null>(null);
  const [cancellationReason, setCancellationReason] = useState('');

  useEffect(() => {
    loadOverview();
    loadSevas();
    loadUsers();
    loadSettings();
  }, []);

  const loadOverview = async () => {
    try {
      const summary = await apiRequest(`/reports/summary?startDate=${reportDate}&endDate=${reportDate}`);
      setTodaySummary(summary);
      loadBookings();
    } catch (err) {
      console.error(err);
    }
  };

  const loadBookings = async () => {
    setIsLoadingBookings(true);
    try {
      const list = await apiRequest<Booking[]>(`/bookings?search=${encodeURIComponent(searchBooking)}&limit=50`);
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
    } catch (err) {
      console.error(err);
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

  const handleCreateSeva = async (e: React.FormEvent) => {
    e.preventDefault();
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
      loadSevas();
    } catch (err: any) {
      alert(err.message || 'Failed to create seva');
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
    try {
      await apiRequest('/auth/users', {
        method: 'POST',
        body: JSON.stringify(newUser)
      });
      setIsCreatingUser(false);
      setNewUser({ username: '', name: '', role: 'poojari', password: '' });
      loadUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to create user');
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

  const handleCancelBooking = async () => {
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
      setCancellationBookingId(null);
      setCancellationReason('');
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
          <h1 className="text-xl sm:text-2xl font-bold text-[#7A1C23] flex items-center gap-2">
            <Shield className="w-6 h-6 text-[#C86A1B]" />
            Temple Administration & Operations
          </h1>
          <p className="text-xs text-gray-600 mt-0.5">
            Manage sevas, poojari assignments, daily closure, audits, reports, and privacy retention policies.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <input
            type="date"
            value={reportDate}
            onChange={(e) => setReportDate(e.target.value)}
            className="px-2.5 py-1.5 bg-white border border-[#E8DCCE] rounded text-xs text-[#2D2520] font-medium"
          />
          <button
            onClick={loadOverview}
            className="px-3 py-1.5 bg-[#FAF5EC] border border-[#E8DCCE] text-[#7A1C23] rounded text-xs font-semibold hover:bg-[#F3ECE0]"
          >
            Refresh Data
          </button>
        </div>
      </div>

      {/* Metric Cards */}
      {todaySummary && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mb-6">
          <div className="bg-white p-3.5 rounded-xl border border-[#E8DCCE] shadow-sm">
            <div className="text-[11px] font-semibold text-gray-500 uppercase">Bookings</div>
            <div className="text-xl font-bold text-[#7A1C23] mt-1">{todaySummary.total_bookings}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">{todaySummary.total_seva_items} Seva Items</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-[#E8DCCE] shadow-sm">
            <div className="text-[11px] font-semibold text-gray-500 uppercase">Confirmed (Net)</div>
            <div className="text-xl font-bold text-emerald-800 mt-1">₹{todaySummary.financials.net_collected_amount.toFixed(0)}</div>
            <div className="text-[10px] text-emerald-600 mt-0.5">₹{todaySummary.financials.confirmed_amount.toFixed(0)} Gross</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-[#E8DCCE] shadow-sm">
            <div className="text-[11px] font-semibold text-gray-500 uppercase">Cash In Hand</div>
            <div className="text-xl font-bold text-[#2D2520] mt-1">₹{todaySummary.financials.cash_total.toFixed(0)}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">Counter Drawer</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-[#E8DCCE] shadow-sm">
            <div className="text-[11px] font-semibold text-gray-500 uppercase">UPI Settlement</div>
            <div className="text-xl font-bold text-[#C86A1B] mt-1">₹{todaySummary.financials.upi_total.toFixed(0)}</div>
            <div className="text-[10px] text-gray-400 mt-0.5">Bank Merchant</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-[#E8DCCE] shadow-sm">
            <div className="text-[11px] font-semibold text-gray-500 uppercase">Pending Payments</div>
            <div className="text-xl font-bold text-amber-700 mt-1">₹{todaySummary.financials.pending_amount.toFixed(0)}</div>
            <div className="text-[10px] text-amber-600 mt-0.5">Awaiting check</div>
          </div>

          <div className="bg-white p-3.5 rounded-xl border border-[#E8DCCE] shadow-sm">
            <div className="text-[11px] font-semibold text-gray-500 uppercase">Refunds</div>
            <div className="text-xl font-bold text-rose-700 mt-1">₹{todaySummary.financials.refund_amount.toFixed(0)}</div>
            <div className="text-[10px] text-rose-500 mt-0.5">Cancelled Sevas</div>
          </div>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="border-b border-[#E8DCCE] mb-6 flex overflow-x-auto gap-2">
        {[
          { id: 'overview', label: 'Bookings & Overview', icon: BookOpen },
          { id: 'sevas', label: 'Seva Catalogue', icon: Layers },
          { id: 'staff', label: 'Staff & Poojaris', icon: Users },
          { id: 'reports', label: 'Reports & Exports', icon: FileText },
          { id: 'closure', label: 'Daily Closure', icon: CheckSquare },
          { id: 'retention', label: 'Devotee Privacy & Retention', icon: History },
          { id: 'audit', label: 'Audit Trail', icon: Shield },
          { id: 'settings', label: 'Temple Settings & UPI', icon: Settings }
        ].map(tab => {
          const Icon = tab.icon;
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
              className={`pb-3 px-3 text-xs font-bold border-b-2 whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                activeTab === tab.id
                  ? 'border-[#7A1C23] text-[#7A1C23]'
                  : 'border-transparent text-gray-500 hover:text-[#2D2520] hover:border-gray-300'
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
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-[#E8DCCE] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="relative w-full sm:w-96">
              <input
                type="text"
                placeholder="Search by Booking #, Beneficiary, Mobile, Gothra..."
                value={searchBooking}
                onChange={(e) => setSearchBooking(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && loadBookings()}
                className="w-full pl-9 pr-4 py-2 bg-[#FAF5EC]/50 border border-[#E8DCCE] rounded-lg text-xs focus:outline-none focus:ring-2 focus:ring-[#C86A1B]"
              />
              <Search className="w-4 h-4 text-gray-400 absolute left-3 top-2.5" />
            </div>
            <button
              onClick={loadBookings}
              className="px-4 py-2 bg-[#7A1C23] text-white rounded-md text-xs font-semibold hover:bg-[#5C1217]"
            >
              Search Bookings
            </button>
          </div>

          <div className="bg-white rounded-xl border border-[#E8DCCE] shadow-sm overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs">
                <thead className="bg-[#FAF5EC] text-gray-700 font-semibold border-b border-[#E8DCCE]">
                  <tr>
                    <th className="py-3 px-4">Booking Ref</th>
                    <th className="py-3 px-4">Date / Time</th>
                    <th className="py-3 px-4">Ritual Beneficiary (కర్త)</th>
                    <th className="py-3 px-4">Gothra</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Payment</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#FAF5EC]">
                  {bookings.map((b) => (
                    <tr key={b.id} className="hover:bg-[#FAF5EC]/30">
                      <td className="py-3 px-4 font-mono font-bold text-[#7A1C23]">
                        {b.booking_number}
                        <div className="text-[10px] text-gray-400 font-sans">{b.ticket_count || 1} tickets</div>
                      </td>
                      <td className="py-3 px-4 text-gray-600">
                        {new Date(b.created_at).toLocaleString('en-IN', { timeZone: 'Asia/Kolkata', dateStyle: 'short', timeStyle: 'short' })}
                      </td>
                      <td className="py-3 px-4 font-medium text-[#2D2520]">
                        {b.ritual_beneficiary_name}
                      </td>
                      <td className="py-3 px-4 font-semibold text-[#C86A1B]">
                        {b.gothra}
                      </td>
                      <td className="py-3 px-4 font-bold">
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
                      <td className="py-3 px-4">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                          b.booking_status === 'completed'
                            ? 'bg-emerald-50 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-50 text-rose-700 border border-rose-200'
                        }`}>
                          {b.booking_status}
                        </span>
                      </td>
                      <td className="py-3 px-4 text-right space-x-2">
                        <button
                          onClick={() => handleInspectBooking(b.id)}
                          className="text-[#7A1C23] hover:underline font-semibold"
                        >
                          Tickets
                        </button>
                        {b.booking_status !== 'cancelled' && (
                          <button
                            onClick={() => setCancellationBookingId(b.id)}
                            className="text-rose-600 hover:underline font-medium"
                          >
                            Cancel
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {bookings.length === 0 && (
                    <tr>
                      <td colSpan={8} className="py-8 text-center text-gray-400">
                        No bookings found matching criteria.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SEVA CATALOGUE */}
      {activeTab === 'sevas' && (
        <div className="space-y-4">
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-[#7A1C23]">Configured Sevas</h2>
              <p className="text-xs text-gray-500">Configure prices, categories, scheduled poojas, and poojari assignments.</p>
            </div>
            <button
              onClick={() => setIsCreatingSeva(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#7A1C23] hover:bg-[#5C1217] text-white rounded-md text-xs font-semibold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add New Seva
            </button>
          </div>

          {/* New Seva Form Modal */}
          {isCreatingSeva && (
            <div className="p-5 bg-white border border-[#E8DCCE] rounded-xl shadow-md space-y-4">
              <h3 className="font-bold text-sm text-[#7A1C23]">Create New Seva</h3>
              <form onSubmit={handleCreateSeva} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Seva Name (English) *</label>
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
                  <label className="block font-semibold mb-1">Telugu Name (శ్రీ నామం)</label>
                  <input
                    type="text"
                    value={newSeva.telugu_name}
                    onChange={(e) => setNewSeva({ ...newSeva, telugu_name: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded bg-[#FAF5EC]/40"
                    placeholder="e.g. సహస్ర దీపాలంకరణ సేవ"
                  />
                </div>

                <div>
                  <label className="block font-semibold mb-1">Price (₹) *</label>
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
                  <label className="block font-semibold mb-1">Timing / Schedule Window</label>
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
                      Schedule Seva for a Specific Date (Requirement 9)
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
                  <label className="block font-semibold mb-1">Assign to Poojari(s)</label>
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
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#7A1C23] text-white rounded font-semibold"
                  >
                    Save Seva
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* Sevas List Table */}
          <div className="bg-white rounded-xl border border-[#E8DCCE] shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF5EC] text-gray-700 font-semibold border-b border-[#E8DCCE]">
                <tr>
                  <th className="py-3 px-4">Seva Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Price</th>
                  <th className="py-3 px-4">Scheduling (Req 9)</th>
                  <th className="py-3 px-4">Assigned Poojaris</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FAF5EC]">
                {sevas.map((s) => (
                  <tr key={s.id} className="hover:bg-[#FAF5EC]/30">
                    <td className="py-3 px-4 font-bold text-[#7A1C23]">
                      {s.name}
                      {s.telugu_name && <div className="text-[11px] text-[#C86A1B] font-serif">{s.telugu_name}</div>}
                    </td>
                    <td className="py-3 px-4 text-gray-600">{s.category}</td>
                    <td className="py-3 px-4 font-bold">₹{s.price.toFixed(2)}</td>
                    <td className="py-3 px-4">
                      {s.is_scheduled ? (
                        <span className="px-2 py-0.5 rounded text-[10px] font-semibold bg-amber-100 text-amber-900 border border-amber-300">
                          📅 Scheduled: {s.scheduled_date}
                        </span>
                      ) : (
                        <span className="text-gray-400">Regular Pooja</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      {s.assigned_poojaris && s.assigned_poojaris.length > 0 ? (
                        s.assigned_poojaris.map(p => p.name).join(', ')
                      ) : (
                        <span className="text-gray-400 italic">None</span>
                      )}
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        s.is_active ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {s.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right space-x-3">
                      <button
                        onClick={() => handleStartEditSeva(s)}
                        className="text-xs font-semibold text-[#7A1C23] hover:underline inline-flex items-center gap-1"
                      >
                        <Edit className="w-3.5 h-3.5" />
                        Edit
                      </button>
                      <button
                        onClick={() => handleToggleSevaStatus(s.id, s.is_active)}
                        className={`text-xs font-semibold ${s.is_active ? 'text-amber-700 hover:underline' : 'text-emerald-700 hover:underline'}`}
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
                      Edit Seva: {editingSeva.name}
                    </h3>
                    <p className="text-xs text-gray-500">
                      Admins can configure name, Telugu label, category, price, timing, date scheduling, and assigned poojaris.
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
                    <label className="block font-semibold mb-1">Seva Name (English) *</label>
                    <input
                      type="text"
                      required
                      value={editingSevaForm.name}
                      onChange={(e) => setEditingSevaForm({ ...editingSevaForm, name: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded bg-[#FAF5EC]/40"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Telugu Name (శ్రీ నామం)</label>
                    <input
                      type="text"
                      value={editingSevaForm.telugu_name}
                      onChange={(e) => setEditingSevaForm({ ...editingSevaForm, telugu_name: e.target.value })}
                      className="w-full px-3 py-1.5 border rounded bg-[#FAF5EC]/40"
                    />
                  </div>

                  <div>
                    <label className="block font-semibold mb-1">Price (₹) *</label>
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
                    <label className="block font-semibold mb-1">Timing / Schedule Window</label>
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
                        Schedule Seva for a Specific Date (Requirement 9)
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
                      Cancel
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
          <div className="flex justify-between items-center">
            <div>
              <h2 className="text-base font-bold text-[#7A1C23]">Staff & Poojari Accounts</h2>
              <p className="text-xs text-gray-500">Create poojari accounts and manage counter staff access credentials.</p>
            </div>
            <button
              onClick={() => setIsCreatingUser(true)}
              className="flex items-center gap-1.5 px-3 py-2 bg-[#7A1C23] hover:bg-[#5C1217] text-white rounded-md text-xs font-semibold shadow-sm"
            >
              <Plus className="w-3.5 h-3.5" />
              Add User
            </button>
          </div>

          {isCreatingUser && (
            <div className="p-5 bg-white border border-[#E8DCCE] rounded-xl shadow-md space-y-4">
              <h3 className="font-bold text-sm text-[#7A1C23]">Create Staff or Poojari Account</h3>
              <form onSubmit={handleCreateUser} className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                <div>
                  <label className="block font-semibold mb-1">Username *</label>
                  <input
                    type="text"
                    required
                    value={newUser.username}
                    onChange={(e) => setNewUser({ ...newUser, username: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded bg-[#FAF5EC]/40"
                    placeholder="e.g. poojari_sharma"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Full Name *</label>
                  <input
                    type="text"
                    required
                    value={newUser.name}
                    onChange={(e) => setNewUser({ ...newUser, name: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded bg-[#FAF5EC]/40"
                    placeholder="e.g. Sri Sharma Deekshitulu"
                  />
                </div>
                <div>
                  <label className="block font-semibold mb-1">Role *</label>
                  <select
                    value={newUser.role}
                    onChange={(e) => setNewUser({ ...newUser, role: e.target.value as any })}
                    className="w-full px-3 py-1.5 border rounded bg-[#FAF5EC]/40"
                  >
                    <option value="poojari">Poojari (Read-only Dashboard)</option>
                    <option value="booking_staff">Booking Counter Staff</option>
                    <option value="admin">Administrator</option>
                  </select>
                </div>
                <div>
                  <label className="block font-semibold mb-1">Password *</label>
                  <input
                    type="password"
                    required
                    value={newUser.password}
                    onChange={(e) => setNewUser({ ...newUser, password: e.target.value })}
                    className="w-full px-3 py-1.5 border rounded bg-[#FAF5EC]/40"
                    placeholder="Minimum 6 characters"
                  />
                </div>
                <div className="sm:col-span-2 flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setIsCreatingUser(false)}
                    className="px-3 py-1.5 border rounded bg-white text-gray-600"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-1.5 bg-[#7A1C23] text-white rounded font-semibold"
                  >
                    Create Account
                  </button>
                </div>
              </form>
            </div>
          )}

          <div className="bg-white rounded-xl border border-[#E8DCCE] shadow-sm overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-[#FAF5EC] text-gray-700 font-semibold border-b border-[#E8DCCE]">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Username</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#FAF5EC]">
                {staffUsers.map((u) => (
                  <tr key={u.id} className="hover:bg-[#FAF5EC]/30">
                    <td className="py-3 px-4 font-bold text-[#2D2520]">{u.name}</td>
                    <td className="py-3 px-4 font-mono text-gray-600">{u.username}</td>
                    <td className="py-3 px-4">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[#FAF5EC] text-[#7A1C23] border border-[#E8DCCE]">
                        {u.role === 'booking_staff' ? 'Counter Staff' : u.role}
                      </span>
                    </td>
                    <td className="py-3 px-4">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-semibold ${
                        (u as any).is_active !== false ? 'bg-emerald-100 text-emerald-800' : 'bg-gray-100 text-gray-600'
                      }`}>
                        {(u as any).is_active !== false ? 'Active' : 'Disabled'}
                      </span>
                    </td>
                    <td className="py-3 px-4 text-right">
                      <button
                        onClick={() => handleToggleUserStatus(u.id, (u as any).is_active !== false)}
                        className="text-xs font-semibold text-gray-600 hover:text-red-700"
                      >
                        {(u as any).is_active !== false ? 'Disable' : 'Enable'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* TAB 4: REPORTS & CSV EXPORT */}
      {activeTab === 'reports' && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-xl border border-[#E8DCCE] shadow-sm flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div>
                <label className="block text-[10px] font-semibold uppercase text-gray-500">From Date</label>
                <input
                  type="date"
                  value={reportStart}
                  onChange={(e) => setReportStart(e.target.value)}
                  className="px-2.5 py-1.5 border rounded text-xs"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase text-gray-500">To Date</label>
                <input
                  type="date"
                  value={reportEnd}
                  onChange={(e) => setReportEnd(e.target.value)}
                  className="px-2.5 py-1.5 border rounded text-xs"
                />
              </div>
              <button
                onClick={loadReport}
                className="mt-4 px-3 py-1.5 bg-[#FAF5EC] border border-[#E8DCCE] text-[#7A1C23] rounded text-xs font-semibold"
              >
                Generate Report
              </button>
            </div>

            <button
              onClick={handleDownloadCsv}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#7A1C23] hover:bg-[#5C1217] text-white rounded text-xs font-semibold shadow-sm"
            >
              <Download className="w-4 h-4" />
              Download CSV Report
            </button>
          </div>

          {reportData && (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white p-5 rounded-xl border border-[#E8DCCE] shadow-sm space-y-3">
                <h3 className="font-bold text-sm text-[#7A1C23] border-b pb-2">Financial Reconciliation</h3>
                <div className="divide-y text-xs">
                  <div className="py-2 flex justify-between">
                    <span>Booked Total</span>
                    <span className="font-bold">₹{reportData.financials.booked_amount.toFixed(2)}</span>
                  </div>
                  <div className="py-2 flex justify-between">
                    <span>Confirmed Collections</span>
                    <span className="font-bold text-emerald-700">₹{reportData.financials.confirmed_amount.toFixed(2)}</span>
                  </div>
                  <div className="py-2 flex justify-between pl-4 text-gray-600">
                    <span>• Cash Collections</span>
                    <span>₹{reportData.financials.cash_total.toFixed(2)}</span>
                  </div>
                  <div className="py-2 flex justify-between pl-4 text-gray-600">
                    <span>• UPI Collections</span>
                    <span>₹{reportData.financials.upi_total.toFixed(2)}</span>
                  </div>
                  <div className="py-2 flex justify-between text-amber-700">
                    <span>Pending Payments</span>
                    <span>₹{reportData.financials.pending_amount.toFixed(2)}</span>
                  </div>
                  <div className="py-2 flex justify-between text-rose-700">
                    <span>Refunds / Cancellations</span>
                    <span>₹{reportData.financials.refund_amount.toFixed(2)}</span>
                  </div>
                  <div className="py-2 flex justify-between font-extrabold text-[#7A1C23] text-sm">
                    <span>Net Collected Amount</span>
                    <span>₹{reportData.financials.net_collected_amount.toFixed(2)}</span>
                  </div>
                </div>
              </div>

              <div className="bg-white p-5 rounded-xl border border-[#E8DCCE] shadow-sm space-y-3">
                <h3 className="font-bold text-sm text-[#7A1C23] border-b pb-2">Seva Breakdown</h3>
                <div className="divide-y text-xs max-h-72 overflow-y-auto">
                  {reportData.seva_breakdown.map((s: any) => (
                    <div key={s.seva_name} className="py-2 flex justify-between items-center">
                      <div>
                        <div className="font-semibold text-[#2D2520]">{s.seva_name}</div>
                        <div className="text-[10px] text-gray-500">{s.category} • {s.total_quantity} Booked</div>
                      </div>
                      <span className="font-bold text-[#7A1C23]">₹{s.total_revenue.toFixed(2)}</span>
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
        <div className="max-w-2xl mx-auto bg-white p-6 rounded-xl border border-[#E8DCCE] shadow-sm space-y-4">
          <h2 className="text-base font-bold text-[#7A1C23] flex items-center gap-2 border-b pb-3">
            <Settings className="w-5 h-5 text-[#C86A1B]" />
            Temple Identity & Operational Settings
          </h2>

          <div className="space-y-3 text-xs">
            <div className="p-3 bg-[#FAF5EC] rounded border border-[#E8DCCE] space-y-1">
              <div className="font-bold text-[#7A1C23]">Temple Name:</div>
              <div>{templeSettings.temple_info?.name}</div>
              <div className="text-[#C86A1B] font-serif">{templeSettings.temple_info?.telugu_name}</div>
              <div className="text-gray-500">{templeSettings.temple_info?.address}</div>
            </div>

            <div className="p-3 bg-amber-50 rounded border border-amber-200 space-y-1">
              <div className="font-bold text-amber-900">Configured Merchant UPI:</div>
              <div>Merchant: <strong>{templeSettings.upi_config?.merchant_name}</strong></div>
              <div>UPI VPA: <span className="font-mono">{templeSettings.upi_config?.upi_id}</span></div>
              <div className="text-gray-600">{templeSettings.upi_config?.verification_instruction}</div>
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

      {/* Cancellation Modal */}
      {cancellationBookingId && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white rounded-xl border border-[#E8DCCE] p-6 max-w-md w-full space-y-4 shadow-xl">
            <h3 className="font-bold text-base text-rose-700">Cancel Booking & Process Refund</h3>
            <p className="text-xs text-gray-600">
              This action will mark the booking and all its item tickets as cancelled, update payment status to refunded, and log an audit record.
            </p>
            <div>
              <label className="block text-xs font-semibold text-gray-700 mb-1">
                Reason for Cancellation *
              </label>
              <textarea
                rows={3}
                required
                value={cancellationReason}
                onChange={(e) => setCancellationReason(e.target.value)}
                placeholder="e.g. Devotee emergency request; ritual could not be performed"
                className="w-full px-3 py-2 border rounded text-xs bg-[#FAF5EC]/30"
              />
            </div>
            <div className="flex justify-end gap-2 pt-2">
              <button
                onClick={() => { setCancellationBookingId(null); setCancellationReason(''); }}
                className="px-3 py-1.5 border rounded text-xs text-gray-600"
              >
                Back
              </button>
              <button
                onClick={handleCancelBooking}
                className="px-4 py-1.5 bg-rose-700 hover:bg-rose-800 text-white font-semibold rounded text-xs"
              >
                Confirm Cancellation
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

