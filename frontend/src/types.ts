export type Role = 'admin' | 'booking_staff' | 'poojari';

export interface User {
  id: string;
  username: string;
  name: string;
  role: Role;
}

export interface Devotee {
  id: string;
  mobile: string;
  name: string;
  gothra: string;
  family_details: string | null;
  profile_status: 'active' | 'inactive' | 'cleaned_up';
  created_at: string;
  last_activity_at: string;
}

export interface Seva {
  id: string;
  name: string;
  telugu_name: string | null;
  description: string | null;
  category: string;
  price: number;
  is_active: boolean;
  is_scheduled: boolean;
  scheduled_date: string | null;
  timing: string | null;
  assigned_poojaris?: { id: string; name: string }[];
}

export interface CartItem {
  seva: Seva;
  quantity: number;
}

export interface Ticket {
  id: string;
  ticket_number: string;
  booking_id: string;
  booking_number: string;
  item_index: number;
  seva_name: string;
  ritual_beneficiary_name: string;
  gothra: string;
  family_details: string | null;
  amount: number;
  status: string;
  completed_at?: string | null;
  completed_by?: string | null;
  completed_by_name?: string | null;
  reprint_count: number;
  last_reprinted_at: string | null;
  created_at: string;
  payment_method?: string;
  payment_status?: string;
}

export interface Booking {
  id: string;
  booking_number: string;
  ritual_beneficiary_name: string;
  gothra: string;
  family_details: string | null;
  payer_name: string | null;
  payer_mobile: string | null;
  total_amount: number;
  booking_status: string;
  created_at: string;
  payment_method?: string;
  payment_status?: string;
  ticket_count?: number;
  completed_ticket_count?: number;
  items_summary?: { seva_name: string; quantity: number; scheduled_date: string | null }[];
  is_advance_booking?: boolean;
  scheduled_for_date?: string | null;
}

export interface PoojariAssignmentSummary {
  seva_id: string;
  seva_name: string;
  telugu_name: string | null;
  category: string;
  timing: string | null;
  is_scheduled: boolean;
  scheduled_date: string | null;
  registration_count: number;
  registrations: {
    ticket_number: string;
    booking_number: string;
    ritual_beneficiary_name: string;
    gothra: string;
    family_details: string | null;
    booking_date: string;
    status: string;
    completed_at?: string | null;
    completed_by_name?: string | null;
  }[];
}

export interface DevoteeBookingRequest {
  id: string;
  request_number: string;
  devotee_name: string;
  gothra: string;
  family_details: string | null;
  mobile: string;
  items: {
    seva_id: string;
    seva_name: string;
    seva_price: number;
    quantity: number;
    scheduled_date?: string | null;
  }[];
  total_amount: number;
  status: 'pending' | 'approved' | 'rejected';
  approved_booking_id: string | null;
  created_at: string;
  updated_at: string;
}

