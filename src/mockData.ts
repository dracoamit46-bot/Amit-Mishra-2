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
} from './types';

// ==========================================
// 1. INITIAL MOCK DATA
// ==========================================

export const mockProperties: Property[] = [
  {
    id: 'prop-riverside',
    name: 'Riverside Hostel',
    address: '12 Riverbank Way, Sector 4, Rishikesh',
    latitude: null,
    longitude: null,
    geofenceRadiusM: null,
  },
  {
    id: 'prop-oldtown',
    name: 'Old Town Hostel',
    address: '45 Heritage Lane, Fort Area, Jaipur',
    latitude: null,
    longitude: null,
    geofenceRadiusM: null,
  },
  {
    id: 'prop-beachside',
    name: 'Beachside Hostel',
    address: '88 Cliffside Road, Anjuna, Goa',
    latitude: null,
    longitude: null,
    geofenceRadiusM: null,
  },
];

export const mockUsers: User[] = [
  // 1 Owner
  {
    id: 'usr-owner-1',
    name: 'Amit',
    phone: '+91 98765 43210',
    role: 'owner',
    propertyId: null,
    staffType: null,
    shiftStart: null,
    shiftEnd: null,
  },

  // 3 Managers (one per property)
  {
    id: 'usr-mgr-1',
    name: 'Aarav Sharma',
    phone: '+91 98765 10001',
    role: 'manager',
    propertyId: 'prop-riverside',
    staffType: null,
    shiftStart: '08:00',
    shiftEnd: '17:00',
  },
  {
    id: 'usr-mgr-2',
    name: 'Pooja Hegde',
    phone: '+91 98765 10002',
    role: 'manager',
    propertyId: 'prop-oldtown',
    staffType: null,
    shiftStart: '09:00',
    shiftEnd: '18:00',
  },
  {
    id: 'usr-mgr-3',
    name: 'Rohan D\'Souza',
    phone: '+91 98765 10003',
    role: 'manager',
    propertyId: 'prop-beachside',
    staffType: null,
    shiftStart: '10:00',
    shiftEnd: '19:00',
  },

  // 3 Inventory Managers (one per property)
  {
    id: 'usr-inv-1',
    name: 'Suresh Kumar',
    phone: '+91 98765 20001',
    role: 'inventory_manager',
    propertyId: 'prop-riverside',
    staffType: null,
    shiftStart: '09:00',
    shiftEnd: '18:00',
  },
  {
    id: 'usr-inv-2',
    name: 'Meenakshi Iyer',
    phone: '+91 98765 20002',
    role: 'inventory_manager',
    propertyId: 'prop-oldtown',
    staffType: null,
    shiftStart: '09:00',
    shiftEnd: '18:00',
  },
  {
    id: 'usr-inv-3',
    name: 'Aniket Vernekar',
    phone: '+91 98765 20003',
    role: 'inventory_manager',
    propertyId: 'prop-beachside',
    staffType: null,
    shiftStart: '09:00',
    shiftEnd: '18:00',
  },

  // 19 Staff distributed across the 3 properties
  // Riverside Hostel Staff (6)
  {
    id: 'usr-stf-101',
    name: 'Devendra Rawat',
    phone: '+91 98765 30101',
    role: 'staff',
    propertyId: 'prop-riverside',
    staffType: 'Kitchen',
    shiftStart: '06:30',
    shiftEnd: '15:30',
  },
  {
    id: 'usr-stf-102',
    name: 'Kavita Joshi',
    phone: '+91 98765 30102',
    role: 'staff',
    propertyId: 'prop-riverside',
    staffType: 'Housekeeping',
    shiftStart: '08:00',
    shiftEnd: '16:00',
  },
  {
    id: 'usr-stf-103',
    name: 'Manoj Negi',
    phone: '+91 98765 30103',
    role: 'staff',
    propertyId: 'prop-riverside',
    staffType: 'Maintenance',
    shiftStart: '09:00',
    shiftEnd: '18:00',
  },
  {
    id: 'usr-stf-104',
    name: 'Priyanka Bisht',
    phone: '+91 98765 30104',
    role: 'staff',
    propertyId: 'prop-riverside',
    staffType: 'Front Desk',
    shiftStart: '07:00',
    shiftEnd: '15:00',
  },
  {
    id: 'usr-stf-105',
    name: 'Rahul Bhatt',
    phone: '+91 98765 30105',
    role: 'staff',
    propertyId: 'prop-riverside',
    staffType: 'Front Desk',
    shiftStart: '15:00',
    shiftEnd: '23:00',
  },
  {
    id: 'usr-stf-106',
    name: 'Deepak Semwal',
    phone: '+91 98765 30106',
    role: 'staff',
    propertyId: 'prop-riverside',
    staffType: 'Kitchen',
    shiftStart: '14:00',
    shiftEnd: '22:00',
  },

  // Old Town Hostel Staff (7)
  {
    id: 'usr-stf-201',
    name: 'Rameshwar Gurjar',
    phone: '+91 98765 30201',
    role: 'staff',
    propertyId: 'prop-oldtown',
    staffType: 'Front Desk',
    shiftStart: '08:00',
    shiftEnd: '16:00',
  },
  {
    id: 'usr-stf-202',
    name: 'Sunita Rathore',
    phone: '+91 98765 30202',
    role: 'staff',
    propertyId: 'prop-oldtown',
    staffType: 'Housekeeping',
    shiftStart: '08:30',
    shiftEnd: '16:30',
  },
  {
    id: 'usr-stf-203',
    name: 'Govind Meena',
    phone: '+91 98765 30203',
    role: 'staff',
    propertyId: 'prop-oldtown',
    staffType: 'Housekeeping',
    shiftStart: '09:00',
    shiftEnd: '17:00',
  },
  {
    id: 'usr-stf-204',
    name: 'Kailash Saini',
    phone: '+91 98765 30204',
    role: 'staff',
    propertyId: 'prop-oldtown',
    staffType: 'Kitchen',
    shiftStart: '07:00',
    shiftEnd: '15:00',
  },
  {
    id: 'usr-stf-205',
    name: 'Mukesh Prajapat',
    phone: '+91 98765 30205',
    role: 'staff',
    propertyId: 'prop-oldtown',
    staffType: 'Maintenance',
    shiftStart: '10:00',
    shiftEnd: '19:00',
  },
  {
    id: 'usr-stf-206',
    name: 'Neetu Shekhawat',
    phone: '+91 98765 30206',
    role: 'staff',
    propertyId: 'prop-oldtown',
    staffType: 'Front Desk',
    shiftStart: '16:00',
    shiftEnd: '00:00',
  },
  {
    id: 'usr-stf-207',
    name: 'Gopal Lal',
    phone: '+91 98765 30207',
    role: 'staff',
    propertyId: 'prop-oldtown',
    staffType: 'Kitchen',
    shiftStart: '15:00',
    shiftEnd: '23:00',
  },

  // Beachside Hostel Staff (6)
  {
    id: 'usr-stf-301',
    name: 'Ashley Fernandes',
    phone: '+91 98765 30301',
    role: 'staff',
    propertyId: 'prop-beachside',
    staffType: 'Front Desk',
    shiftStart: '08:00',
    shiftEnd: '16:00',
  },
  {
    id: 'usr-stf-302',
    name: 'Maria Rodrigues',
    phone: '+91 98765 30302',
    role: 'staff',
    propertyId: 'prop-beachside',
    staffType: 'Housekeeping',
    shiftStart: '08:30',
    shiftEnd: '16:30',
  },
  {
    id: 'usr-stf-303',
    name: 'Joaquim Silva',
    phone: '+91 98765 30303',
    role: 'staff',
    propertyId: 'prop-beachside',
    staffType: 'Maintenance',
    shiftStart: '09:00',
    shiftEnd: '18:00',
  },
  {
    id: 'usr-stf-304',
    name: 'Savio Coutinho',
    phone: '+91 98765 30304',
    role: 'staff',
    propertyId: 'prop-beachside',
    staffType: 'Kitchen',
    shiftStart: '07:30',
    shiftEnd: '15:30',
  },
  {
    id: 'usr-stf-305',
    name: 'Fatima Naik',
    phone: '+91 98765 30305',
    role: 'staff',
    propertyId: 'prop-beachside',
    staffType: 'Housekeeping',
    shiftStart: '10:00',
    shiftEnd: '18:00',
  },
  {
    id: 'usr-stf-306',
    name: 'Clive Gonsalves',
    phone: '+91 98765 30306',
    role: 'staff',
    propertyId: 'prop-beachside',
    staffType: 'Front Desk',
    shiftStart: '16:00',
    shiftEnd: '00:00',
  },
];

export const mockTaskCategories: TaskCategory[] = [
  // Riverside Hostel Categories
  {
    id: 'cat-riv-1',
    propertyId: 'prop-riverside',
    name: 'Plumbing & Water Filter',
  },
  {
    id: 'cat-riv-2',
    propertyId: 'prop-riverside',
    name: 'Housekeeping & Linen Supply',
  },
  {
    id: 'cat-riv-3',
    propertyId: 'prop-riverside',
    name: 'Kitchen Groceries & Equipment',
  },

  // Old Town Hostel Categories
  {
    id: 'cat-old-1',
    propertyId: 'prop-oldtown',
    name: 'Electrical & AC Maintenance',
  },
  {
    id: 'cat-old-2',
    propertyId: 'prop-oldtown',
    name: 'Dorm Bedding & Toiletries',
  },
  {
    id: 'cat-old-3',
    propertyId: 'prop-oldtown',
    name: 'Cafe Supplies & Inventory',
  },

  // Beachside Hostel Categories
  {
    id: 'cat-bch-1',
    propertyId: 'prop-beachside',
    name: 'Pool & Outdoor Maintenance',
  },
  {
    id: 'cat-bch-2',
    propertyId: 'prop-beachside',
    name: 'Bar & Kitchen Consumables',
  },
  {
    id: 'cat-bch-3',
    propertyId: 'prop-beachside',
    name: 'Guest Amenities & Linen',
  },
];

export const mockAttendanceRecords: AttendanceRecord[] = [
  {
    id: 'att-001',
    userId: 'usr-stf-101',
    date: '2026-08-27',
    clockInTime: '06:28',
    clockInSelfieUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    clockInLat: null,
    clockInLng: null,
    clockOutTime: '15:32',
    clockOutSelfieUrl: 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150',
    status: 'shift_completed',
    markedBy: null,
  },
  {
    id: 'att-002',
    userId: 'usr-stf-102',
    date: '2026-08-27',
    clockInTime: '08:02',
    clockInSelfieUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    clockInLat: null,
    clockInLng: null,
    clockOutTime: '16:05',
    clockOutSelfieUrl: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150',
    status: 'shift_completed',
    markedBy: null,
  },
  {
    id: 'att-003',
    userId: 'usr-stf-103',
    date: '2026-08-27',
    clockInTime: null,
    clockInSelfieUrl: null,
    clockInLat: null,
    clockInLng: null,
    clockOutTime: null,
    clockOutSelfieUrl: null,
    status: 'week_off',
    markedBy: 'usr-mgr-1',
  },
  {
    id: 'att-004',
    userId: 'usr-stf-201',
    date: '2026-08-27',
    clockInTime: '07:55',
    clockInSelfieUrl: 'https://images.unsplash.com/photo-1570295999919-56ceb5ecca61?w=150',
    clockInLat: null,
    clockInLng: null,
    clockOutTime: null,
    clockOutSelfieUrl: null,
    status: null,
    markedBy: null,
  },
  {
    id: 'att-005',
    userId: 'usr-stf-202',
    date: '2026-08-27',
    clockInTime: null,
    clockInSelfieUrl: null,
    clockInLat: null,
    clockInLng: null,
    clockOutTime: null,
    clockOutSelfieUrl: null,
    status: 'on_leave',
    markedBy: 'usr-mgr-2',
  },
  {
    id: 'att-006',
    userId: 'usr-stf-301',
    date: '2026-08-27',
    clockInTime: '07:58',
    clockInSelfieUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    clockInLat: null,
    clockInLng: null,
    clockOutTime: '16:02',
    clockOutSelfieUrl: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150',
    status: 'shift_completed',
    markedBy: null,
  },
  {
    id: 'att-007',
    userId: 'usr-stf-104',
    date: '2026-08-28',
    clockInTime: '08:00',
    clockInSelfieUrl: null,
    clockInLat: null,
    clockInLng: null,
    clockOutTime: null,
    clockOutSelfieUrl: null,
    status: null,
    markedBy: null,
  },
  {
    id: 'att-008',
    userId: 'usr-inv-1',
    date: '2026-08-28',
    clockInTime: '09:05',
    clockInSelfieUrl: null,
    clockInLat: null,
    clockInLng: null,
    clockOutTime: null,
    clockOutSelfieUrl: null,
    status: null,
    markedBy: null,
  },
  {
    id: 'att-009',
    userId: 'usr-stf-204',
    date: '2026-08-28',
    clockInTime: null,
    clockInSelfieUrl: null,
    clockInLat: null,
    clockInLng: null,
    clockOutTime: null,
    clockOutSelfieUrl: null,
    status: null,
    markedBy: null,
  },
];

export const mockWeekOffRequests: WeekOffRequest[] = [
  {
    id: 'wor-001',
    userId: 'usr-stf-103',
    requestedDates: ['2026-08-27', '2026-08-28'],
    reason: null,
    status: 'approved',
    reviewedBy: 'usr-mgr-1',
  },
  {
    id: 'wor-002',
    userId: 'usr-stf-204',
    requestedDates: ['2026-08-30'],
    reason: null,
    status: 'pending',
    reviewedBy: null,
  },
  {
    id: 'wor-003',
    userId: 'usr-stf-304',
    requestedDates: ['2026-08-29', '2026-08-30'],
    reason: 'Operational clash with inventory stock audit day.',
    status: 'rejected',
    reviewedBy: 'usr-mgr-3',
  },
];

export const mockLeaveRequests: LeaveRequest[] = [
  {
    id: 'lvr-001',
    userId: 'usr-stf-202',
    startDate: '2026-08-26',
    endDate: '2026-08-29',
    leaveType: 'casual',
    reason: 'Family wedding in hometown',
    status: 'approved',
    reviewedBy: 'usr-mgr-2',
  },
  {
    id: 'lvr-002',
    userId: 'usr-stf-105',
    startDate: '2026-09-02',
    endDate: '2026-09-05',
    leaveType: 'sick',
    reason: 'Medical appointment and recovery',
    status: 'pending',
    reviewedBy: null,
  },
  {
    id: 'lvr-003',
    userId: 'usr-stf-305',
    startDate: '2026-09-10',
    endDate: '2026-09-12',
    leaveType: 'casual',
    reason: 'Personal urgent work',
    status: 'pending',
    reviewedBy: null,
  },
  {
    id: 'lvr-004',
    userId: 'usr-stf-101',
    startDate: '2026-08-20',
    endDate: '2026-08-21',
    leaveType: 'sick',
    reason: 'Viral fever and doctor prescribed rest',
    status: 'approved',
    reviewedBy: 'usr-mgr-1',
  },
];

export const mockAttendanceCorrectionRequests: AttendanceCorrectionRequest[] = [
  {
    id: 'acr-001',
    userId: 'usr-stf-104',
    date: '2026-08-28',
    note: 'Worked full kitchen shift, mobile battery died before clocking out.',
    status: 'pending',
    reviewedBy: null,
  },
  {
    id: 'acr-002',
    userId: 'usr-inv-1',
    date: '2026-08-28',
    note: 'Completed inventory inspection shift, attendance not yet approved.',
    status: 'pending',
    reviewedBy: null,
  },
  {
    id: 'acr-003',
    userId: 'usr-stf-204',
    date: '2026-08-27',
    note: 'Was present on morning duty.',
    status: 'approved',
    reviewedBy: 'usr-mgr-2',
  },
];

export const mockTasks: Task[] = [
  {
    id: 'tsk-001',
    propertyId: 'prop-riverside',
    createdBy: 'usr-stf-103',
    categoryId: 'cat-riv-1',
    description: 'Main overhead water tank float valve is leaking and needs immediate replacement',
    photoUrl: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?w=400',
    status: 'created',
    lastActionBy: 'usr-stf-103',
    lastActionNote: 'Reported leaking valve on terrace tank',
  },
  {
    id: 'tsk-002',
    propertyId: 'prop-riverside',
    createdBy: 'usr-stf-102',
    categoryId: 'cat-riv-2',
    description: 'Restock 30 bottles of floor cleaner and 10 packs of microfibre cloths for housekeeping',
    photoUrl: null,
    status: 'pending_approval',
    lastActionBy: 'usr-inv-1',
    lastActionNote: 'Voucher attached, forwarded for approval',
  },
  {
    id: 'tsk-003',
    propertyId: 'prop-riverside',
    createdBy: 'usr-stf-101',
    categoryId: 'cat-riv-3',
    description: 'Kitchen exhaust chimney blower fan motor repair required',
    photoUrl: 'https://images.unsplash.com/photo-1556911220-e15b29be8c8f?w=400',
    status: 'completed',
    lastActionBy: 'usr-mgr-1',
    lastActionNote: 'Repairs completed and tested',
  },
  {
    id: 'tsk-004',
    propertyId: 'prop-oldtown',
    createdBy: 'usr-stf-203',
    categoryId: 'cat-old-2',
    description: 'Procured 15 sets of fresh duvet covers and bath towels for Dorm 4',
    photoUrl: null,
    status: 'completed',
    lastActionBy: 'usr-mgr-2',
    lastActionNote: 'Approved petty cash voucher and verified inventory receipt',
  },
  {
    id: 'tsk-005',
    propertyId: 'prop-oldtown',
    createdBy: 'usr-stf-205',
    categoryId: 'cat-old-1',
    description: 'AC unit in Room 204 leaking water onto desk, needs technician servicing',
    photoUrl: 'https://images.unsplash.com/photo-1621905251189-08b45d6a269e?w=400',
    status: 'created',
    lastActionBy: 'usr-stf-205',
    lastActionNote: 'Reported AC malfunction',
  },
  {
    id: 'tsk-006',
    propertyId: 'prop-beachside',
    createdBy: 'usr-stf-303',
    categoryId: 'cat-bch-1',
    description: 'Pool pump filter basket cracked, replacement required before weekend',
    photoUrl: 'https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?w=400',
    status: 'approved',
    lastActionBy: 'usr-own-1',
    lastActionNote: 'Approved for procurement',
  },
];

export const mockVouchers: Voucher[] = [
  {
    id: 'vch-001',
    taskId: 'tsk-004',
    paymentType: 'petty_cash',
    amount: 4200,
    createdBy: 'usr-inv-2',
  },
  {
    id: 'vch-002',
    taskId: 'tsk-002',
    paymentType: 'head_office',
    amount: 6500,
    createdBy: 'usr-inv-1',
  },
  {
    id: 'vch-003',
    taskId: 'tsk-003',
    paymentType: 'petty_cash',
    amount: 1800,
    createdBy: 'usr-inv-1',
  },
];

// ==========================================
// 2. IN-MEMORY DATA STORE
// ==========================================

let propertiesStore: Property[] = [...mockProperties];
let usersStore: User[] = [...mockUsers];
let taskCategoriesStore: TaskCategory[] = [...mockTaskCategories];
let attendanceRecordsStore: AttendanceRecord[] = [...mockAttendanceRecords];
let weekOffRequestsStore: WeekOffRequest[] = [...mockWeekOffRequests];
let leaveRequestsStore: LeaveRequest[] = [...mockLeaveRequests];
let attendanceCorrectionRequestsStore: AttendanceCorrectionRequest[] = [...mockAttendanceCorrectionRequests];
let tasksStore: Task[] = [...mockTasks];
let vouchersStore: Voucher[] = [...mockVouchers];

// ==========================================
// 3. ASYNC MOCK API FUNCTIONS
// ==========================================

// Property operations
export async function getProperties(): Promise<Property[]> {
  return [...propertiesStore];
}

export async function getPropertyById(id: string): Promise<Property | null> {
  const property = propertiesStore.find((p) => p.id === id);
  return property ? { ...property } : null;
}

export async function createProperty(property: Omit<Property, 'id'>): Promise<Property> {
  const newProperty: Property = {
    id: `prop-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ...property,
  };
  propertiesStore.push(newProperty);
  return { ...newProperty };
}

export async function updateProperty(id: string, updates: Partial<Property>): Promise<Property | null> {
  const index = propertiesStore.findIndex((p) => p.id === id);
  if (index === -1) return null;
  const updated: Property = {
    ...propertiesStore[index],
    ...updates,
  };
  propertiesStore[index] = updated;
  return { ...updated };
}

// User operations
export async function getUsers(): Promise<User[]> {
  return [...usersStore];
}

export async function getUserById(id: string): Promise<User | null> {
  const user = usersStore.find((u) => u.id === id);
  return user ? { ...user } : null;
}

export async function getUsersByProperty(propertyId: string): Promise<User[]> {
  return usersStore.filter((u) => u.propertyId === propertyId).map((u) => ({ ...u }));
}

export async function getUsersByRole(role: UserRole): Promise<User[]> {
  return usersStore.filter((u) => u.role === role).map((u) => ({ ...u }));
}

export async function updateUser(id: string, updates: Partial<User>): Promise<User | null> {
  const index = usersStore.findIndex((u) => u.id === id);
  if (index === -1) return null;
  const updated: User = {
    ...usersStore[index],
    ...updates,
  };
  usersStore[index] = updated;
  return { ...updated };
}

export async function createUser(user: Omit<User, 'id'>): Promise<User> {
  const newUser: User = {
    id: `usr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ...user,
  };
  usersStore.push(newUser);
  return { ...newUser };
}

export async function deleteUser(id: string): Promise<boolean> {
  const index = usersStore.findIndex((u) => u.id === id);
  if (index === -1) return false;
  usersStore.splice(index, 1);
  return true;
}

// Attendance operations
export async function getAttendanceRecords(): Promise<AttendanceRecord[]> {
  return [...attendanceRecordsStore];
}

export async function getAttendanceByUser(userId: string): Promise<AttendanceRecord[]> {
  return attendanceRecordsStore.filter((a) => a.userId === userId).map((a) => ({ ...a }));
}

export async function getAttendanceByDate(date: string): Promise<AttendanceRecord[]> {
  return attendanceRecordsStore.filter((a) => a.date === date).map((a) => ({ ...a }));
}

export async function getAttendanceByUserAndDate(userId: string, date: string): Promise<AttendanceRecord | null> {
  const record = attendanceRecordsStore.find((a) => a.userId === userId && a.date === date);
  return record ? { ...record } : null;
}

export async function markAttendance(
  record: Omit<AttendanceRecord, 'id'> & { id?: string }
): Promise<AttendanceRecord> {
  const existingIndex = attendanceRecordsStore.findIndex(
    (a) => (record.id && a.id === record.id) || (a.userId === record.userId && a.date === record.date)
  );

  if (existingIndex >= 0) {
    const updated: AttendanceRecord = {
      ...attendanceRecordsStore[existingIndex],
      ...record,
      id: attendanceRecordsStore[existingIndex].id,
    };
    attendanceRecordsStore[existingIndex] = updated;
    return { ...updated };
  } else {
    const newRecord: AttendanceRecord = {
      id: record.id || `att-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
      userId: record.userId,
      date: record.date,
      clockInTime: record.clockInTime ?? null,
      clockInSelfieUrl: record.clockInSelfieUrl ?? null,
      clockInLat: record.clockInLat ?? null,
      clockInLng: record.clockInLng ?? null,
      clockOutTime: record.clockOutTime ?? null,
      clockOutSelfieUrl: record.clockOutSelfieUrl ?? null,
      status: record.status ?? null,
      markedBy: record.markedBy ?? null,
    };
    attendanceRecordsStore.push(newRecord);
    return { ...newRecord };
  }
}

// Week off operations
export async function getWeekOffRequests(): Promise<WeekOffRequest[]> {
  return [...weekOffRequestsStore];
}

export async function getWeekOffRequestsByUser(userId: string): Promise<WeekOffRequest[]> {
  return weekOffRequestsStore.filter((w) => w.userId === userId).map((w) => ({ ...w }));
}

export async function createWeekOffRequest(request: Omit<WeekOffRequest, 'id'>): Promise<WeekOffRequest> {
  const newRequest: WeekOffRequest = {
    id: `wor-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    reason: request.reason ?? null,
    ...request,
  };
  weekOffRequestsStore.push(newRequest);
  return { ...newRequest };
}

export async function updateWeekOffRequestStatus(
  id: string,
  status: RequestStatus,
  reviewedBy: string | null,
  reason?: string | null
): Promise<WeekOffRequest | null> {
  const index = weekOffRequestsStore.findIndex((w) => w.id === id);
  if (index === -1) return null;
  const updated: WeekOffRequest = {
    ...weekOffRequestsStore[index],
    status,
    reviewedBy,
    reason: reason !== undefined ? reason : weekOffRequestsStore[index].reason,
  };
  weekOffRequestsStore[index] = updated;
  return { ...updated };
}

// Leave operations
export async function getCarriedForwardWeekOffBalance(userId: string): Promise<number> {
  const attendanceRecords = await getAttendanceByUser(userId);
  const today = new Date();
  const currentYearMonth = today.toISOString().slice(0, 7);

  const priorMonthsSet = new Set<string>();
  attendanceRecords.forEach((r) => {
    const ym = r.date.slice(0, 7);
    if (ym < currentYearMonth) {
      priorMonthsSet.add(ym);
    }
  });

  let carriedForwardBalance = 0;
  priorMonthsSet.forEach((ym) => {
    const usedInMonth = attendanceRecords.filter(
      (r) => r.date.startsWith(ym) && r.status === 'week_off'
    ).length;
    const unusedInMonth = Math.max(0, 4 - usedInMonth);
    carriedForwardBalance += unusedInMonth;
  });

  return carriedForwardBalance;
}

export async function getEmployeeMonthlySalary(user: User): Promise<number> {
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
}

export async function getLeaveRequests(): Promise<LeaveRequest[]> {
  return [...leaveRequestsStore];
}

export async function getLeaveRequestsByUser(userId: string): Promise<LeaveRequest[]> {
  return leaveRequestsStore.filter((l) => l.userId === userId).map((l) => ({ ...l }));
}

export async function createLeaveRequest(request: Omit<LeaveRequest, 'id'>): Promise<LeaveRequest> {
  const newRequest: LeaveRequest = {
    id: `lvr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ...request,
  };
  leaveRequestsStore.push(newRequest);
  return { ...newRequest };
}

export async function updateLeaveRequestStatus(
  id: string,
  status: RequestStatus,
  reviewedBy: string | null,
  reason?: string
): Promise<LeaveRequest | null> {
  const index = leaveRequestsStore.findIndex((l) => l.id === id);
  if (index === -1) return null;
  const updated: LeaveRequest = {
    ...leaveRequestsStore[index],
    status,
    reviewedBy,
    reason: reason !== undefined ? reason : leaveRequestsStore[index].reason,
  };
  leaveRequestsStore[index] = updated;
  return { ...updated };
}

// Attendance Correction Request operations
export async function getAttendanceCorrectionRequests(): Promise<AttendanceCorrectionRequest[]> {
  return [...attendanceCorrectionRequestsStore];
}

export async function getAttendanceCorrectionRequestsByUser(userId: string): Promise<AttendanceCorrectionRequest[]> {
  return attendanceCorrectionRequestsStore.filter((r) => r.userId === userId).map((r) => ({ ...r }));
}

export async function getAttendanceCorrectionRequestsByProperty(propertyId: string): Promise<AttendanceCorrectionRequest[]> {
  const propertyUsers = usersStore.filter((u) => u.propertyId === propertyId);
  const propertyUserIds = new Set(propertyUsers.map((u) => u.id));
  return attendanceCorrectionRequestsStore.filter((r) => propertyUserIds.has(r.userId)).map((r) => ({ ...r }));
}

export async function createAttendanceCorrectionRequest(
  request: Omit<AttendanceCorrectionRequest, 'id'>
): Promise<AttendanceCorrectionRequest> {
  const newRequest: AttendanceCorrectionRequest = {
    id: `acr-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ...request,
  };
  attendanceCorrectionRequestsStore.push(newRequest);
  return { ...newRequest };
}

export async function updateAttendanceCorrectionRequestStatus(
  id: string,
  status: RequestStatus,
  reviewedBy: string | null
): Promise<AttendanceCorrectionRequest | null> {
  const index = attendanceCorrectionRequestsStore.findIndex((r) => r.id === id);
  if (index === -1) return null;
  const updated: AttendanceCorrectionRequest = {
    ...attendanceCorrectionRequestsStore[index],
    status,
    reviewedBy,
  };
  attendanceCorrectionRequestsStore[index] = updated;
  return { ...updated };
}

// Task categories
export async function getTaskCategories(propertyId?: string): Promise<TaskCategory[]> {
  if (propertyId) {
    return taskCategoriesStore.filter((c) => c.propertyId === propertyId).map((c) => ({ ...c }));
  }
  return [...taskCategoriesStore];
}

// Task operations
export async function getTasks(): Promise<Task[]> {
  return [...tasksStore];
}

export async function getTasksByProperty(propertyId: string): Promise<Task[]> {
  return tasksStore.filter((t) => t.propertyId === propertyId).map((t) => ({ ...t }));
}

export async function getTaskById(id: string): Promise<Task | null> {
  const task = tasksStore.find((t) => t.id === id);
  return task ? { ...task } : null;
}

export async function createTask(task: Omit<Task, 'id'>): Promise<Task> {
  const newTask: Task = {
    id: `tsk-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ...task,
  };
  tasksStore.push(newTask);
  return { ...newTask };
}

export async function updateTask(id: string, updates: Partial<Task>): Promise<Task | null> {
  const index = tasksStore.findIndex((t) => t.id === id);
  if (index === -1) return null;
  const updated: Task = {
    ...tasksStore[index],
    ...updates,
  };
  tasksStore[index] = updated;
  return { ...updated };
}

export async function updateTaskStatus(
  id: string,
  status: TaskStatus,
  lastActionBy: string | null,
  lastActionNote: string | null = null
): Promise<Task | null> {
  const index = tasksStore.findIndex((t) => t.id === id);
  if (index === -1) return null;
  const updated: Task = {
    ...tasksStore[index],
    status,
    lastActionBy,
    lastActionNote: lastActionNote ?? tasksStore[index].lastActionNote,
  };
  tasksStore[index] = updated;
  return { ...updated };
}

// Voucher operations
export async function getVouchers(): Promise<Voucher[]> {
  return [...vouchersStore];
}

export async function getVoucherById(id: string): Promise<Voucher | null> {
  const voucher = vouchersStore.find((v) => v.id === id);
  return voucher ? { ...voucher } : null;
}

export async function getVoucherByTaskId(taskId: string): Promise<Voucher | null> {
  const voucher = vouchersStore.find((v) => v.taskId === taskId);
  return voucher ? { ...voucher } : null;
}

export async function createVoucher(voucher: Omit<Voucher, 'id'>): Promise<Voucher> {
  const newVoucher: Voucher = {
    id: `vch-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    ...voucher,
  };
  vouchersStore.push(newVoucher);
  return { ...newVoucher };
}

export async function updateVoucher(id: string, updates: Partial<Voucher>): Promise<Voucher | null> {
  const index = vouchersStore.findIndex((v) => v.id === id);
  if (index === -1) return null;
  const updated: Voucher = {
    ...vouchersStore[index],
    ...updates,
  };
  vouchersStore[index] = updated;
  return { ...updated };
}

