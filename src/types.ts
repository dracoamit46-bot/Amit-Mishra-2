export type UserRole = 'owner' | 'manager' | 'inventory_manager' | 'staff';
export type AttendanceStatus = 'shift_completed' | 'week_off' | 'on_leave' | 'absent';
export type TaskStatus = 'created' | 'pending_approval' | 'approved' | 'completed' | 'rejected';
export type PaymentType = 'no_payment' | 'petty_cash' | 'head_office';
export type RequestStatus = 'pending' | 'approved' | 'rejected';

export interface Property {
  id: string;
  name: string;
  address: string;
  latitude: number | null;
  longitude: number | null;
  geofenceRadiusM: number | null;
}

export interface User {
  id: string;
  name: string;
  phone: string;
  role: UserRole;
  propertyId: string | null;
  staffType: string | null;
  shiftStart: string | null;
  shiftEnd: string | null;
}

export interface AttendanceRecord {
  id: string;
  userId: string;
  date: string;
  clockInTime: string | null;
  clockInSelfieUrl: string | null;
  clockInLat: number | null;
  clockInLng: number | null;
  clockOutTime: string | null;
  clockOutSelfieUrl: string | null;
  status: AttendanceStatus | null;
  markedBy: string | null;
}

export interface WeekOffRequest {
  id: string;
  userId: string;
  requestedDates: string[];
  reason: string | null;
  status: RequestStatus;
  reviewedBy: string | null;
}

export interface LeaveRequest {
  id: string;
  userId: string;
  startDate: string;
  endDate: string;
  leaveType: 'casual' | 'sick';
  reason: string;
  status: RequestStatus;
  reviewedBy: string | null;
}

export interface AttendanceCorrectionRequest {
  id: string;
  userId: string;
  date: string;
  note: string | null;
  status: RequestStatus;
  reviewedBy: string | null;
}

export interface TaskCategory {
  id: string;
  propertyId: string;
  name: string;
}

export interface Task {
  id: string;
  propertyId: string;
  createdBy: string;
  categoryId: string;
  description: string;
  photoUrl: string | null;
  status: TaskStatus;
  lastActionBy: string | null;
  lastActionNote: string | null;
}

export interface Voucher {
  id: string;
  taskId: string;
  paymentType: PaymentType;
  amount: number | null;
  createdBy: string;
}
