import {
  Property,
  User,
  AttendanceRecord,
  WeekOffRequest,
  LeaveRequest,
  AttendanceCorrectionRequest,
  TaskCategory,
  Task,
  Voucher,
  UserRole,
  RequestStatus,
  TaskStatus,
} from '../types';
import { isProduction } from '../config/env';
import { supabase } from '../supabaseClient';
import * as mockData from '../mockData';

// Database Row Types (snake_case)
interface DbProperty {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  geofence_radius_m: number | null;
}

interface DbUser {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  property_id: string | null;
  staff_type: string | null;
  shift_start: string | null;
  shift_end: string | null;
}

interface DbAttendance {
  id: string;
  user_id: string;
  date: string;
  clock_in_time: string | null;
  clock_in_selfie_url: string | null;
  clock_in_lat: number | null;
  clock_in_lng: number | null;
  clock_out_time: string | null;
  clock_out_selfie_url: string | null;
  status: any;
  marked_by: string | null;
}

interface DbTask {
  id: string;
  property_id: string;
  created_by: string;
  category_id: string;
  description: string;
  photo_url: string | null;
  status: TaskStatus;
  last_action_by: string | null;
  last_action_note: string | null;
}

interface DbTaskCategory {
  id: string;
  property_id: string;
  name: string;
}

interface DbVoucher {
  id: string;
  task_id: string;
  payment_type: any;
  amount: number | null;
  created_by: string;
}

interface DbWeekOffRequest {
  id: string;
  user_id: string;
  requested_dates: string[];
  reason: string | null;
  status: RequestStatus;
  reviewed_by: string | null;
}

interface DbLeaveRequest {
  id: string;
  user_id: string;
  start_date: string;
  end_date: string;
  leave_type: 'casual' | 'sick';
  reason: string;
  status: RequestStatus;
  reviewed_by: string | null;
}

interface DbAttendanceCorrectionRequest {
  id: string;
  user_id: string;
  date: string;
  note: string | null;
  status: RequestStatus;
  reviewed_by: string | null;
}

// Converters
const mapProperty = (db: DbProperty): Property => ({
  id: db.id,
  name: db.name,
  address: db.address,
  latitude: db.latitude,
  longitude: db.longitude,
  geofenceRadiusM: db.geofence_radius_m,
});

const mapUser = (db: DbUser): User => ({
  id: db.id,
  name: db.name,
  phone: db.phone,
  role: db.role,
  propertyId: db.property_id,
  staffType: db.staff_type,
  shiftStart: db.shift_start,
  shiftEnd: db.shift_end,
});

const mapAttendance = (db: DbAttendance): AttendanceRecord => ({
  id: db.id,
  userId: db.user_id,
  date: db.date,
  clockInTime: db.clock_in_time,
  clockInSelfieUrl: db.clock_in_selfie_url,
  clockInLat: db.clock_in_lat,
  clockInLng: db.clock_in_lng,
  clockOutTime: db.clock_out_time,
  clockOutSelfieUrl: db.clock_out_selfie_url,
  status: db.status,
  markedBy: db.marked_by,
});

const mapTask = (db: DbTask): Task => ({
  id: db.id,
  propertyId: db.property_id,
  createdBy: db.created_by,
  categoryId: db.category_id,
  description: db.description,
  photoUrl: db.photo_url,
  status: db.status,
  lastActionBy: db.last_action_by,
  lastActionNote: db.last_action_note,
});

const mapTaskCategory = (db: DbTaskCategory): TaskCategory => ({
  id: db.id,
  propertyId: db.property_id,
  name: db.name,
});

const mapVoucher = (db: DbVoucher): Voucher => ({
  id: db.id,
  taskId: db.task_id,
  paymentType: db.payment_type,
  amount: db.amount,
  createdBy: db.created_by,
});

const mapWeekOffRequest = (db: DbWeekOffRequest): WeekOffRequest => ({
  id: db.id,
  userId: db.user_id,
  requestedDates: db.requested_dates,
  reason: db.reason,
  status: db.status,
  reviewedBy: db.reviewed_by,
});

const mapLeaveRequest = (db: DbLeaveRequest): LeaveRequest => ({
  id: db.id,
  userId: db.user_id,
  startDate: db.start_date,
  endDate: db.end_date,
  leaveType: db.leave_type,
  reason: db.reason,
  status: db.status,
  reviewedBy: db.reviewed_by,
});

const mapAttendanceCorrectionRequest = (
  db: DbAttendanceCorrectionRequest
): AttendanceCorrectionRequest => ({
  id: db.id,
  userId: db.user_id,
  date: db.date,
  note: db.note,
  status: db.status,
  reviewedBy: db.reviewed_by,
});

// Schema state tracking & detection
let isSchemaPending = false;
const schemaListeners: Array<(pending: boolean) => void> = [];

export function isSchemaMissingError(error: any): boolean {
  if (!error) return false;
  const code = String(error?.code || '');
  const msg = String(error?.message || '').toLowerCase();
  return (
    code === 'PGRST205' ||
    code === '42P01' ||
    code === 'PGRST116' ||
    msg.includes('schema cache') ||
    msg.includes('could not find the table') ||
    msg.includes('relation') ||
    msg.includes('does not exist')
  );
}

export function getIsSchemaPending(): boolean {
  return isSchemaPending;
}

export function subscribeSchemaPending(listener: (pending: boolean) => void): () => void {
  schemaListeners.push(listener);
  listener(isSchemaPending);
  return () => {
    const idx = schemaListeners.indexOf(listener);
    if (idx !== -1) schemaListeners.splice(idx, 1);
  };
}

function notifySchemaMissing(_table: string, _err: any) {
  if (!isSchemaPending) {
    isSchemaPending = true;
    schemaListeners.forEach((fn) => fn(true));
  }
}

export const dataService = {
  // ==========================================
  // 1. PROPERTIES
  // ==========================================
  async getProperties(): Promise<Property[]> {
    if (!isProduction()) return mockData.getProperties();
    const { data, error } = await supabase.from('properties').select('*').order('name');
    if (error) {
      if (isSchemaMissingError(error)) notifySchemaMissing('properties', error);
      console.error('Properties query error:', error.message);
      throw new Error(error.message || 'Failed to fetch properties from database');
    }
    return (data || []).map(mapProperty);
  },

  async getPropertyById(id: string): Promise<Property | null> {
    if (!isProduction()) return mockData.getPropertyById(id);
    const { data, error } = await supabase.from('properties').select('*').eq('id', id).maybeSingle();
    if (error) {
      if (isSchemaMissingError(error)) notifySchemaMissing('properties', error);
      throw new Error(error.message || 'Failed to fetch property from database');
    }
    return data ? mapProperty(data) : null;
  },

  async createProperty(property: Omit<Property, 'id'>): Promise<Property> {
    if (!isProduction()) return mockData.createProperty(property);

    // Pre-flight sync: ensure current authenticated user has an owner record in public.users
    try {
      const { data: sessionData } = await supabase.auth.getSession();
      const authUser = sessionData?.session?.user;
      if (authUser) {
        await supabase.from('users').upsert({
          id: authUser.id,
          name: authUser.user_metadata?.name || 'Amit',
          phone: authUser.user_metadata?.phone || authUser.phone || '+91 98765 43210',
          role: 'owner',
        }, { onConflict: 'id' });
      }
    } catch (preErr) {
      console.warn('Pre-flight user sync notice:', preErr);
    }

    const { data, error } = await supabase
      .from('properties')
      .insert({
        name: property.name,
        address: property.address,
        latitude: property.latitude,
        longitude: property.longitude,
        geofence_radius_m: property.geofenceRadiusM,
      })
      .select()
      .single();

    if (error) {
      console.error('Supabase property insert error:', error);
      throw new Error(error.message || 'Failed to create property in database');
    }

    return mapProperty(data);
  },

  async updateProperty(id: string, updates: Partial<Property>): Promise<Property | null> {
    if (!isProduction()) return mockData.updateProperty(id, updates);
    const payload: Partial<DbProperty> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.address !== undefined) payload.address = updates.address;
    if (updates.latitude !== undefined) payload.latitude = updates.latitude;
    if (updates.longitude !== undefined) payload.longitude = updates.longitude;
    if (updates.geofenceRadiusM !== undefined) payload.geofence_radius_m = updates.geofenceRadiusM;

    const { data, error } = await supabase
      .from('properties')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      notifySchemaMissing('properties', error);
      throw new Error(error.message || 'Failed to update property in database');
    }
    return data ? mapProperty(data) : null;
  },

  // ==========================================
  // 2. USERS
  // ==========================================
  async getUsers(): Promise<User[]> {
    if (!isProduction()) return mockData.getUsers();
    const { data, error } = await supabase.from('users').select('*').order('name');
    if (error) {
      if (isSchemaMissingError(error)) notifySchemaMissing('users', error);
      console.error('Users query error:', error.message);
      throw new Error(error.message || 'Failed to fetch users from database');
    }
    return (data || []).map(mapUser);
  },

  async getUserById(id: string): Promise<User | null> {
    if (!isProduction()) return mockData.getUserById(id);
    const { data, error } = await supabase.from('users').select('*').eq('id', id).maybeSingle();
    if (error) {
      if (isSchemaMissingError(error)) notifySchemaMissing('users', error);
      throw new Error(error.message || 'Failed to fetch user from database');
    }
    return data ? mapUser(data) : null;
  },

  async getUsersByProperty(propertyId: string): Promise<User[]> {
    if (!isProduction()) return mockData.getUsersByProperty(propertyId);
    const { data, error } = await supabase.from('users').select('*').eq('property_id', propertyId);
    if (error) {
      throw new Error(error.message || 'Failed to fetch users for property');
    }
    return (data || []).map(mapUser);
  },

  async getUsersByRole(role: UserRole): Promise<User[]> {
    if (!isProduction()) return mockData.getUsersByRole(role);
    const { data, error } = await supabase.from('users').select('*').eq('role', role);
    if (error) {
      throw new Error(error.message || 'Failed to fetch users by role');
    }
    return (data || []).map(mapUser);
  },

  async createUser(user: Omit<User, 'id'> & { id?: string }): Promise<User> {
    if (!isProduction()) return mockData.createUser(user);
    const userId = user.id || (typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : undefined);
    const { data, error } = await supabase
      .from('users')
      .insert({
        ...(userId ? { id: userId } : {}),
        name: user.name,
        phone: user.phone,
        role: user.role,
        property_id: user.propertyId,
        staff_type: user.staffType,
        shift_start: user.shiftStart,
        shift_end: user.shiftEnd,
      })
      .select()
      .single();
    if (error) {
      notifySchemaMissing('users', error);
      throw new Error(error.message || 'Failed to create user in database');
    }
    return mapUser(data);
  },

  async updateUser(id: string, updates: Partial<User>): Promise<User | null> {
    if (!isProduction()) return mockData.updateUser(id, updates);
    const payload: Partial<DbUser> = {};
    if (updates.name !== undefined) payload.name = updates.name;
    if (updates.phone !== undefined) payload.phone = updates.phone;
    if (updates.role !== undefined) payload.role = updates.role;
    if (updates.propertyId !== undefined) payload.property_id = updates.propertyId;
    if (updates.staffType !== undefined) payload.staff_type = updates.staffType;
    if (updates.shiftStart !== undefined) payload.shift_start = updates.shiftStart;
    if (updates.shiftEnd !== undefined) payload.shift_end = updates.shiftEnd;

    const { data, error } = await supabase
      .from('users')
      .update(payload)
      .eq('id', id)
      .select()
      .single();
    if (error) {
      notifySchemaMissing('users', error);
      throw new Error(error.message || 'Failed to update user in database');
    }
    return data ? mapUser(data) : null;
  },

  async deleteUser(id: string): Promise<boolean> {
    if (!isProduction()) return mockData.deleteUser(id);
    const { error } = await supabase.from('users').delete().eq('id', id);
    if (error) {
      notifySchemaMissing('users', error);
      throw new Error(error.message || 'Failed to delete user from database');
    }
    return true;
  },

  // ==========================================
  // 3. ATTENDANCE
  // ==========================================
  async getAttendanceRecords(): Promise<AttendanceRecord[]> {
    if (!isProduction()) return mockData.getAttendanceRecords();
    try {
      const { data, error } = await supabase.from('attendance_records').select('*');
      if (error) {
        notifySchemaMissing('attendance_records', error);
        return [];
      }
      return (data || []).map(mapAttendance);
    } catch (err) {
      notifySchemaMissing('attendance_records', err);
      return [];
    }
  },

  async getAttendanceByUser(userId: string): Promise<AttendanceRecord[]> {
    if (!isProduction()) return mockData.getAttendanceByUser(userId);
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', userId);
      if (error) {
        notifySchemaMissing('attendance_records', error);
        return [];
      }
      return (data || []).map(mapAttendance);
    } catch (err) {
      notifySchemaMissing('attendance_records', err);
      return [];
    }
  },

  async getAttendanceByDate(date: string): Promise<AttendanceRecord[]> {
    if (!isProduction()) return mockData.getAttendanceByDate(date);
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('date', date);
      if (error) {
        notifySchemaMissing('attendance_records', error);
        return [];
      }
      return (data || []).map(mapAttendance);
    } catch (err) {
      notifySchemaMissing('attendance_records', err);
      return [];
    }
  },

  async getAttendanceByUserAndDate(userId: string, date: string): Promise<AttendanceRecord | null> {
    if (!isProduction()) return mockData.getAttendanceByUserAndDate(userId, date);
    try {
      const { data, error } = await supabase
        .from('attendance_records')
        .select('*')
        .eq('user_id', userId)
        .eq('date', date)
        .maybeSingle();
      if (error) {
        if (isSchemaMissingError(error)) notifySchemaMissing('attendance_records', error);
        return null;
      }
      return data ? mapAttendance(data) : null;
    } catch (err) {
      notifySchemaMissing('attendance_records', err);
      return null;
    }
  },

  async markAttendance(
    record: Omit<AttendanceRecord, 'id'> & { id?: string }
  ): Promise<AttendanceRecord> {
    if (!isProduction()) return mockData.markAttendance(record);

    try {
      const payload = {
        user_id: record.userId,
        date: record.date,
        clock_in_time: record.clockInTime,
        clock_in_selfie_url: record.clockInSelfieUrl,
        clock_in_lat: record.clockInLat,
        clock_in_lng: record.clockInLng,
        clock_out_time: record.clockOutTime,
        clock_out_selfie_url: record.clockOutSelfieUrl,
        status: record.status,
        marked_by: record.markedBy,
      };

      if (record.id) {
        const { data, error } = await supabase
          .from('attendance_records')
          .upsert({ id: record.id, ...payload })
          .select()
          .single();
        if (error) {
          notifySchemaMissing('attendance_records', error);
          throw new Error(error.message || 'Failed to mark attendance');
        }
        return mapAttendance(data);
      } else {
        const { data, error } = await supabase
          .from('attendance_records')
          .upsert(payload, { onConflict: 'user_id,date' })
          .select()
          .single();
        if (error) {
          notifySchemaMissing('attendance_records', error);
          throw new Error(error.message || 'Failed to mark attendance');
        }
        return mapAttendance(data);
      }
    } catch (err) {
      notifySchemaMissing('attendance_records', err);
      throw err;
    }
  },

  // ==========================================
  // 4. WEEK OFF REQUESTS
  // ==========================================
  async getWeekOffRequests(): Promise<WeekOffRequest[]> {
    if (!isProduction()) return mockData.getWeekOffRequests();
    try {
      const { data, error } = await supabase.from('week_off_requests').select('*');
      if (error) {
        notifySchemaMissing('week_off_requests', error);
        return [];
      }
      return (data || []).map(mapWeekOffRequest);
    } catch (err) {
      notifySchemaMissing('week_off_requests', err);
      return [];
    }
  },

  async getWeekOffRequestsByUser(userId: string): Promise<WeekOffRequest[]> {
    if (!isProduction()) return mockData.getWeekOffRequestsByUser(userId);
    try {
      const { data, error } = await supabase
        .from('week_off_requests')
        .select('*')
        .eq('user_id', userId);
      if (error) {
        notifySchemaMissing('week_off_requests', error);
        return [];
      }
      return (data || []).map(mapWeekOffRequest);
    } catch (err) {
      notifySchemaMissing('week_off_requests', err);
      return [];
    }
  },

  async createWeekOffRequest(request: Omit<WeekOffRequest, 'id'>): Promise<WeekOffRequest> {
    if (!isProduction()) return mockData.createWeekOffRequest(request);
    try {
      const { data, error } = await supabase
        .from('week_off_requests')
        .insert({
          user_id: request.userId,
          requested_dates: request.requestedDates,
          reason: request.reason,
          status: request.status,
          reviewed_by: request.reviewedBy,
        })
        .select()
        .single();
      if (error) {
        notifySchemaMissing('week_off_requests', error);
        throw new Error(error.message || 'Failed to create week off request');
      }
      return mapWeekOffRequest(data);
    } catch (err) {
      notifySchemaMissing('week_off_requests', err);
      throw err;
    }
  },

  async updateWeekOffRequestStatus(
    id: string,
    status: RequestStatus,
    reviewedBy: string | null,
    reason?: string | null
  ): Promise<WeekOffRequest | null> {
    if (!isProduction())
      return mockData.updateWeekOffRequestStatus(id, status, reviewedBy, reason);
    try {
      const payload: Partial<DbWeekOffRequest> = {
        status,
        reviewed_by: reviewedBy,
      };
      if (reason !== undefined) payload.reason = reason;

      const { data, error } = await supabase
        .from('week_off_requests')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        notifySchemaMissing('week_off_requests', error);
        throw new Error(error.message || 'Failed to update week off request');
      }
      return data ? mapWeekOffRequest(data) : null;
    } catch (err) {
      notifySchemaMissing('week_off_requests', err);
      throw err;
    }
  },

  async getCarriedForwardWeekOffBalance(userId: string): Promise<number> {
    try {
      const records = await this.getAttendanceByUser(userId);
      const today = new Date();
      const currentYearMonth = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}`;
      
      const priorMonthsSet = new Set<string>();
      records.forEach((r) => {
        const ym = r.date.substring(0, 7);
        if (ym < currentYearMonth) {
          priorMonthsSet.add(ym);
        }
      });

      let carriedForwardBalance = 0;
      priorMonthsSet.forEach((ym) => {
        const usedInMonth = records.filter(
          (r) => r.date.startsWith(ym) && r.status === 'week_off'
        ).length;
        const unusedInMonth = Math.max(0, 4 - usedInMonth);
        carriedForwardBalance += unusedInMonth;
      });

      return carriedForwardBalance;
    } catch {
      return 0;
    }
  },

  async getEmployeeMonthlySalary(user: User): Promise<number> {
    if (user.role === 'inventory_manager') return 25000;
    if (user.role === 'manager') return 35000;
    if (user.role === 'owner') return 50000;

    switch (user.staffType?.toLowerCase()) {
      case 'front desk':
        return 20000;
      case 'kitchen':
        return 18000;
      case 'maintenance':
        return 17000;
      case 'housekeeping':
        return 15000;
      case 'security':
        return 16000;
      default:
        return 16000;
    }
  },

  // ==========================================
  // 5. LEAVE REQUESTS
  // ==========================================
  async getLeaveRequests(): Promise<LeaveRequest[]> {
    if (!isProduction()) return mockData.getLeaveRequests();
    try {
      const { data, error } = await supabase.from('leave_requests').select('*');
      if (error) {
        notifySchemaMissing('leave_requests', error);
        return [];
      }
      return (data || []).map(mapLeaveRequest);
    } catch (err) {
      notifySchemaMissing('leave_requests', err);
      return [];
    }
  },

  async getLeaveRequestsByUser(userId: string): Promise<LeaveRequest[]> {
    if (!isProduction()) return mockData.getLeaveRequestsByUser(userId);
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .select('*')
        .eq('user_id', userId);
      if (error) {
        notifySchemaMissing('leave_requests', error);
        return [];
      }
      return (data || []).map(mapLeaveRequest);
    } catch (err) {
      notifySchemaMissing('leave_requests', err);
      return [];
    }
  },

  async createLeaveRequest(request: Omit<LeaveRequest, 'id'>): Promise<LeaveRequest> {
    if (!isProduction()) return mockData.createLeaveRequest(request);
    try {
      const { data, error } = await supabase
        .from('leave_requests')
        .insert({
          user_id: request.userId,
          start_date: request.startDate,
          end_date: request.endDate,
          leave_type: request.leaveType,
          reason: request.reason,
          status: request.status,
          reviewed_by: request.reviewedBy,
        })
        .select()
        .single();
      if (error) {
        notifySchemaMissing('leave_requests', error);
        throw new Error(error.message || 'Failed to create leave request');
      }
      return mapLeaveRequest(data);
    } catch (err) {
      notifySchemaMissing('leave_requests', err);
      throw err;
    }
  },

  async updateLeaveRequestStatus(
    id: string,
    status: RequestStatus,
    reviewedBy: string | null,
    reason?: string
  ): Promise<LeaveRequest | null> {
    if (!isProduction())
      return mockData.updateLeaveRequestStatus(id, status, reviewedBy, reason);
    try {
      const payload: Partial<DbLeaveRequest> = {
        status,
        reviewed_by: reviewedBy,
      };
      if (reason !== undefined) payload.reason = reason;

      const { data, error } = await supabase
        .from('leave_requests')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        notifySchemaMissing('leave_requests', error);
        throw new Error(error.message || 'Failed to update leave request');
      }
      return data ? mapLeaveRequest(data) : null;
    } catch (err) {
      notifySchemaMissing('leave_requests', err);
      throw err;
    }
  },

  // ==========================================
  // 6. ATTENDANCE CORRECTION REQUESTS
  // ==========================================
  async getAttendanceCorrectionRequests(): Promise<AttendanceCorrectionRequest[]> {
    if (!isProduction()) return mockData.getAttendanceCorrectionRequests();
    try {
      const { data, error } = await supabase
        .from('attendance_correction_requests')
        .select('*');
      if (error) {
        notifySchemaMissing('attendance_correction_requests', error);
        return [];
      }
      return (data || []).map(mapAttendanceCorrectionRequest);
    } catch (err) {
      notifySchemaMissing('attendance_correction_requests', err);
      return [];
    }
  },

  async getAttendanceCorrectionRequestsByUser(userId: string): Promise<AttendanceCorrectionRequest[]> {
    if (!isProduction()) return mockData.getAttendanceCorrectionRequestsByUser(userId);
    try {
      const { data, error } = await supabase
        .from('attendance_correction_requests')
        .select('*')
        .eq('user_id', userId);
      if (error) {
        notifySchemaMissing('attendance_correction_requests', error);
        return [];
      }
      return (data || []).map(mapAttendanceCorrectionRequest);
    } catch (err) {
      notifySchemaMissing('attendance_correction_requests', err);
      return [];
    }
  },

  async getAttendanceCorrectionRequestsByProperty(propertyId: string): Promise<AttendanceCorrectionRequest[]> {
    if (!isProduction()) return mockData.getAttendanceCorrectionRequestsByProperty(propertyId);
    try {
      const users = await this.getUsersByProperty(propertyId);
      const userIds = users.map((u) => u.id);
      if (userIds.length === 0) return [];

      const { data, error } = await supabase
        .from('attendance_correction_requests')
        .select('*')
        .in('user_id', userIds);
      if (error) {
        notifySchemaMissing('attendance_correction_requests', error);
        return [];
      }
      return (data || []).map(mapAttendanceCorrectionRequest);
    } catch (err) {
      notifySchemaMissing('attendance_correction_requests', err);
      return [];
    }
  },

  async createAttendanceCorrectionRequest(
    request: Omit<AttendanceCorrectionRequest, 'id'>
  ): Promise<AttendanceCorrectionRequest> {
    if (!isProduction()) return mockData.createAttendanceCorrectionRequest(request);
    try {
      const { data, error } = await supabase
        .from('attendance_correction_requests')
        .insert({
          user_id: request.userId,
          date: request.date,
          note: request.note,
          status: request.status,
          reviewed_by: request.reviewedBy,
        })
        .select()
        .single();
      if (error) {
        notifySchemaMissing('attendance_correction_requests', error);
        throw new Error(error.message || 'Failed to create attendance correction request');
      }
      return mapAttendanceCorrectionRequest(data);
    } catch (err) {
      notifySchemaMissing('attendance_correction_requests', err);
      throw err;
    }
  },

  async updateAttendanceCorrectionRequestStatus(
    id: string,
    status: RequestStatus,
    reviewedBy: string | null
  ): Promise<AttendanceCorrectionRequest | null> {
    if (!isProduction())
      return mockData.updateAttendanceCorrectionRequestStatus(id, status, reviewedBy);
    try {
      const { data, error } = await supabase
        .from('attendance_correction_requests')
        .update({ status, reviewed_by: reviewedBy })
        .eq('id', id)
        .select()
        .single();
      if (error) {
        notifySchemaMissing('attendance_correction_requests', error);
        throw new Error(error.message || 'Failed to update attendance correction request');
      }
      return data ? mapAttendanceCorrectionRequest(data) : null;
    } catch (err) {
      notifySchemaMissing('attendance_correction_requests', err);
      throw err;
    }
  },

  // ==========================================
  // 7. TASK CATEGORIES
  // ==========================================
  async getTaskCategories(propertyId?: string): Promise<TaskCategory[]> {
    if (!isProduction()) return mockData.getTaskCategories(propertyId);
    try {
      let query = supabase.from('task_categories').select('*');
      if (propertyId) query = query.eq('property_id', propertyId);
      const { data, error } = await query;
      if (error) {
        notifySchemaMissing('task_categories', error);
        return [];
      }
      return (data || []).map(mapTaskCategory);
    } catch (err) {
      notifySchemaMissing('task_categories', err);
      return [];
    }
  },

  // ==========================================
  // 8. TASKS
  // ==========================================
  async getTasks(): Promise<Task[]> {
    if (!isProduction()) return mockData.getTasks();
    try {
      const { data, error } = await supabase.from('tasks').select('*');
      if (error) {
        notifySchemaMissing('tasks', error);
        return [];
      }
      return (data || []).map(mapTask);
    } catch (err) {
      notifySchemaMissing('tasks', err);
      return [];
    }
  },

  async getTasksByProperty(propertyId: string): Promise<Task[]> {
    if (!isProduction()) return mockData.getTasksByProperty(propertyId);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .select('*')
        .eq('property_id', propertyId);
      if (error) {
        notifySchemaMissing('tasks', error);
        return [];
      }
      return (data || []).map(mapTask);
    } catch (err) {
      notifySchemaMissing('tasks', err);
      return [];
    }
  },

  async getTaskById(id: string): Promise<Task | null> {
    if (!isProduction()) return mockData.getTaskById(id);
    try {
      const { data, error } = await supabase.from('tasks').select('*').eq('id', id).maybeSingle();
      if (error) {
        if (isSchemaMissingError(error)) notifySchemaMissing('tasks', error);
        return null;
      }
      return data ? mapTask(data) : null;
    } catch (err) {
      notifySchemaMissing('tasks', err);
      return null;
    }
  },

  async createTask(task: Omit<Task, 'id'>): Promise<Task> {
    if (!isProduction()) return mockData.createTask(task);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .insert({
          property_id: task.propertyId,
          created_by: task.createdBy,
          category_id: task.categoryId,
          description: task.description,
          photo_url: task.photoUrl,
          status: task.status,
          last_action_by: task.lastActionBy,
          last_action_note: task.lastActionNote,
        })
        .select()
        .single();
      if (error) {
        notifySchemaMissing('tasks', error);
        throw new Error(error.message || 'Failed to create task in database');
      }
      return mapTask(data);
    } catch (err) {
      notifySchemaMissing('tasks', err);
      throw err;
    }
  },

  async updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
    if (!isProduction()) return mockData.updateTask(id, updates);
    try {
      const payload: Partial<DbTask> = {};
      if (updates.propertyId !== undefined) payload.property_id = updates.propertyId;
      if (updates.createdBy !== undefined) payload.created_by = updates.createdBy;
      if (updates.categoryId !== undefined) payload.category_id = updates.categoryId;
      if (updates.description !== undefined) payload.description = updates.description;
      if (updates.photoUrl !== undefined) payload.photo_url = updates.photoUrl;
      if (updates.status !== undefined) payload.status = updates.status;
      if (updates.lastActionBy !== undefined) payload.last_action_by = updates.lastActionBy;
      if (updates.lastActionNote !== undefined) payload.last_action_note = updates.lastActionNote;

      const { data, error } = await supabase
        .from('tasks')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        notifySchemaMissing('tasks', error);
        throw new Error(error.message || 'Failed to update task in database');
      }
      return data ? mapTask(data) : null;
    } catch (err) {
      notifySchemaMissing('tasks', err);
      throw err;
    }
  },

  async updateTaskStatus(
    id: string,
    status: TaskStatus,
    lastActionBy: string | null,
    lastActionNote: string | null = null
  ): Promise<Task | null> {
    if (!isProduction())
      return mockData.updateTaskStatus(id, status, lastActionBy, lastActionNote);
    try {
      const { data, error } = await supabase
        .from('tasks')
        .update({
          status,
          last_action_by: lastActionBy,
          last_action_note: lastActionNote,
        })
        .eq('id', id)
        .select()
        .single();
      if (error) {
        notifySchemaMissing('tasks', error);
        throw new Error(error.message || 'Failed to update task status in database');
      }
      return data ? mapTask(data) : null;
    } catch (err) {
      notifySchemaMissing('tasks', err);
      throw err;
    }
  },

  // ==========================================
  // 9. VOUCHERS
  // ==========================================
  async getVouchers(): Promise<Voucher[]> {
    if (!isProduction()) return mockData.getVouchers();
    try {
      const { data, error } = await supabase.from('vouchers').select('*');
      if (error) {
        notifySchemaMissing('vouchers', error);
        return [];
      }
      return (data || []).map(mapVoucher);
    } catch (err) {
      notifySchemaMissing('vouchers', err);
      return [];
    }
  },

  async getVoucherById(id: string): Promise<Voucher | null> {
    if (!isProduction()) return mockData.getVoucherById(id);
    try {
      const { data, error } = await supabase.from('vouchers').select('*').eq('id', id).maybeSingle();
      if (error) {
        if (isSchemaMissingError(error)) notifySchemaMissing('vouchers', error);
        return null;
      }
      return data ? mapVoucher(data) : null;
    } catch (err) {
      notifySchemaMissing('vouchers', err);
      return null;
    }
  },

  async getVoucherByTaskId(taskId: string): Promise<Voucher | null> {
    if (!isProduction()) return mockData.getVoucherByTaskId(taskId);
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .select('*')
        .eq('task_id', taskId)
        .maybeSingle();
      if (error) {
        if (isSchemaMissingError(error)) notifySchemaMissing('vouchers', error);
        return null;
      }
      return data ? mapVoucher(data) : null;
    } catch (err) {
      notifySchemaMissing('vouchers', err);
      return null;
    }
  },

  async createVoucher(voucher: Omit<Voucher, 'id'>): Promise<Voucher> {
    if (!isProduction()) return mockData.createVoucher(voucher);
    try {
      const { data, error } = await supabase
        .from('vouchers')
        .insert({
          task_id: voucher.taskId,
          payment_type: voucher.paymentType,
          amount: voucher.amount,
          created_by: voucher.createdBy,
        })
        .select()
        .single();
      if (error) {
        notifySchemaMissing('vouchers', error);
        throw new Error(error.message || 'Failed to create voucher in database');
      }
      return mapVoucher(data);
    } catch (err) {
      notifySchemaMissing('vouchers', err);
      throw err;
    }
  },

  async updateVoucher(id: string, updates: Partial<Voucher>): Promise<Voucher | null> {
    if (!isProduction()) return mockData.updateVoucher(id, updates);
    try {
      const payload: Partial<DbVoucher> = {};
      if (updates.taskId !== undefined) payload.task_id = updates.taskId;
      if (updates.paymentType !== undefined) payload.payment_type = updates.paymentType;
      if (updates.amount !== undefined) payload.amount = updates.amount;
      if (updates.createdBy !== undefined) payload.created_by = updates.createdBy;

      const { data, error } = await supabase
        .from('vouchers')
        .update(payload)
        .eq('id', id)
        .select()
        .single();
      if (error) {
        notifySchemaMissing('vouchers', error);
        throw new Error(error.message || 'Failed to update voucher in database');
      }
      return data ? mapVoucher(data) : null;
    } catch (err) {
      notifySchemaMissing('vouchers', err);
      throw err;
    }
  },
};

// Named function exports for seamless drop-in compatibility across the codebase
export const getProperties = () => dataService.getProperties();
export const getPropertyById = (id: string) => dataService.getPropertyById(id);
export const createProperty = (p: Omit<Property, 'id'>) => dataService.createProperty(p);
export const updateProperty = (id: string, u: Partial<Property>) => dataService.updateProperty(id, u);

export const getUsers = () => dataService.getUsers();
export const getUserById = (id: string) => dataService.getUserById(id);
export const getUsersByProperty = (propertyId: string) => dataService.getUsersByProperty(propertyId);
export const getUsersByRole = (role: UserRole) => dataService.getUsersByRole(role);
export const createUser = (user: Omit<User, 'id'> & { id?: string }) => dataService.createUser(user);
export const updateUser = (id: string, updates: Partial<User>) => dataService.updateUser(id, updates);
export const deleteUser = (id: string) => dataService.deleteUser(id);

export const getAttendanceRecords = () => dataService.getAttendanceRecords();
export const getAttendanceByUser = (userId: string) => dataService.getAttendanceByUser(userId);
export const getAttendanceByDate = (date: string) => dataService.getAttendanceByDate(date);
export const getAttendanceByUserAndDate = (userId: string, date: string) => dataService.getAttendanceByUserAndDate(userId, date);
export const markAttendance = (r: Omit<AttendanceRecord, 'id'> & { id?: string }) => dataService.markAttendance(r);

export const getWeekOffRequests = () => dataService.getWeekOffRequests();
export const getWeekOffRequestsByUser = (userId: string) => dataService.getWeekOffRequestsByUser(userId);
export const createWeekOffRequest = (r: Omit<WeekOffRequest, 'id'>) => dataService.createWeekOffRequest(r);
export const updateWeekOffRequestStatus = (id: string, s: RequestStatus, rBy: string | null, reason?: string | null) => dataService.updateWeekOffRequestStatus(id, s, rBy, reason);
export const getCarriedForwardWeekOffBalance = (userId: string) => dataService.getCarriedForwardWeekOffBalance(userId);
export const getEmployeeMonthlySalary = (user: User) => dataService.getEmployeeMonthlySalary(user);

export const getLeaveRequests = () => dataService.getLeaveRequests();
export const getLeaveRequestsByUser = (userId: string) => dataService.getLeaveRequestsByUser(userId);
export const createLeaveRequest = (r: Omit<LeaveRequest, 'id'>) => dataService.createLeaveRequest(r);
export const updateLeaveRequestStatus = (id: string, s: RequestStatus, rBy: string | null, reason?: string) => dataService.updateLeaveRequestStatus(id, s, rBy, reason);

export const getAttendanceCorrectionRequests = () => dataService.getAttendanceCorrectionRequests();
export const getAttendanceCorrectionRequestsByUser = (userId: string) => dataService.getAttendanceCorrectionRequestsByUser(userId);
export const getAttendanceCorrectionRequestsByProperty = (propertyId: string) => dataService.getAttendanceCorrectionRequestsByProperty(propertyId);
export const createAttendanceCorrectionRequest = (r: Omit<AttendanceCorrectionRequest, 'id'>) => dataService.createAttendanceCorrectionRequest(r);
export const updateAttendanceCorrectionRequestStatus = (id: string, s: RequestStatus, rBy: string | null) => dataService.updateAttendanceCorrectionRequestStatus(id, s, rBy);

export const getTaskCategories = (propertyId?: string) => dataService.getTaskCategories(propertyId);
export const getTasks = () => dataService.getTasks();
export const getTasksByProperty = (propertyId: string) => dataService.getTasksByProperty(propertyId);
export const getTaskById = (id: string) => dataService.getTaskById(id);
export const createTask = (task: Omit<Task, 'id'>) => dataService.createTask(task);
export const updateTask = (id: string, updates: Partial<Task>) => dataService.updateTask(id, updates);
export const updateTaskStatus = (id: string, status: TaskStatus, lastActionBy: string | null, lastActionNote: string | null = null) => dataService.updateTaskStatus(id, status, lastActionBy, lastActionNote);

export const getVouchers = () => dataService.getVouchers();
export const getVoucherById = (id: string) => dataService.getVoucherById(id);
export const getVoucherByTaskId = (taskId: string) => dataService.getVoucherByTaskId(taskId);
export const createVoucher = (v: Omit<Voucher, 'id'>) => dataService.createVoucher(v);
export const updateVoucher = (id: string, updates: Partial<Voucher>) => dataService.updateVoucher(id, updates);
