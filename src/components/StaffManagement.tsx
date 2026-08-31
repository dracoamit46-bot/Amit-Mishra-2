import React, { useEffect, useState, useMemo } from 'react';
import { Property, User, UserRole } from '../types';
import { useAuth } from '../context/AuthContext';
import {
  getProperties,
  getPropertyById,
  getUsersByProperty,
  createUser,
  deleteUser,
} from '../services/dataService';
import { authService } from '../services/authService';
import {
  Users,
  UserPlus,
  Trash2,
  Building2,
  Clock,
  Phone,
  Briefcase,
  CheckCircle,
  AlertCircle,
  ShieldAlert,
  UserCheck,
  Shield,
  UserMinus,
  KeyRound,
  Copy,
  Check,
  Eye,
  EyeOff,
  X,
} from 'lucide-react';
import OffboardModal from './OffboardModal';

export default function StaffManagement() {
  const { currentUser } = useAuth();
  const isOwner = currentUser?.role === 'owner';
  const isManager = currentUser?.role === 'manager';

  // Properties state
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('');
  const [currentProperty, setCurrentProperty] = useState<Property | null>(null);

  // Staff / Employees state
  const [employeeList, setEmployeeList] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [loadingEmployees, setLoadingEmployees] = useState<boolean>(false);

  // Add employee form state
  const [selectedRole, setSelectedRole] = useState<UserRole>('staff');
  const [name, setName] = useState<string>('');
  const [phone, setPhone] = useState<string>('');
  const [pin, setPin] = useState<string>('123456');
  const [staffType, setStaffType] = useState<string>('');
  const [shiftStart, setShiftStart] = useState<string>('08:00');
  const [shiftEnd, setShiftEnd] = useState<string>('16:00');
  const [submitting, setSubmitting] = useState<boolean>(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [offboardingEmployee, setOffboardingEmployee] = useState<User | null>(null);
  const [isOffboarding, setIsOffboarding] = useState<boolean>(false);

  // Credentials / PIN modal state
  const [credentialsUser, setCredentialsUser] = useState<User | null>(null);
  const [modalNewPin, setModalNewPin] = useState<string>('');
  const [modalPinSuccess, setModalPinSuccess] = useState<string | null>(null);
  const [modalPinError, setModalPinError] = useState<string | null>(null);
  const [updatingPin, setUpdatingPin] = useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);

  // Notifications
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // 1. Initial load for properties
  useEffect(() => {
    async function initProperties() {
      try {
        setLoading(true);
        if (isOwner) {
          const props = await getProperties();
          setProperties(props);
          if (props.length > 0) {
            setSelectedPropertyId((prev) => (prev ? prev : props[0].id));
          }
        } else if (isManager && currentUser?.propertyId) {
          setSelectedPropertyId(currentUser.propertyId);
          const prop = await getPropertyById(currentUser.propertyId);
          setCurrentProperty(prop);
        }
      } catch (err) {
        console.error('Failed to initialize properties', err);
      } finally {
        setLoading(false);
      }
    }

    initProperties();
  }, [isOwner, isManager, currentUser?.propertyId]);

  // 2. Load staff / employees whenever selectedPropertyId changes
  const loadEmployees = async (propId: string) => {
    if (!propId) {
      setEmployeeList([]);
      return;
    }
    try {
      setLoadingEmployees(true);
      const allPropUsers = await getUsersByProperty(propId);
      
      if (isOwner) {
        // Owner sees ALL employees for this property (staff, manager, inventory_manager)
        setEmployeeList(allPropUsers);
        const prop = await getPropertyById(propId);
        setCurrentProperty(prop);
      } else {
        // Manager sees ONLY general staff for this property
        const generalStaff = allPropUsers.filter((u) => u.role === 'staff');
        setEmployeeList(generalStaff);
      }
    } catch (err) {
      console.error('Failed to load employees for property', err);
    } finally {
      setLoadingEmployees(false);
    }
  };

  useEffect(() => {
    if (selectedPropertyId) {
      loadEmployees(selectedPropertyId);
    }
  }, [selectedPropertyId, isOwner]);

  // Active property name helper
  const activePropertyName = useMemo(() => {
    if (currentProperty) return currentProperty.name;
    const match = properties.find((p) => p.id === selectedPropertyId);
    return match ? match.name : 'Unknown Property';
  }, [currentProperty, properties, selectedPropertyId]);

  // Handle Add Employee (Staff/Manager/Inventory Manager for Owner; Staff only for Manager)
  const handleAddEmployee = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    const trimmedName = name.trim();
    const trimmedPhone = phone.trim();
    const trimmedType = staffType.trim();
    const roleToCreate: UserRole = isOwner ? selectedRole : 'staff';

    if (!selectedPropertyId) {
      setErrorMessage('Please select a valid property before adding an employee.');
      return;
    }

    if (!trimmedName || !trimmedPhone) {
      setErrorMessage('Please fill in both Name and Phone Number.');
      return;
    }

    // Role-specific validation
    if (roleToCreate === 'staff') {
      if (!trimmedType) {
        setErrorMessage('Please specify the Staff Type / Department (e.g. Housekeeping, Kitchen).');
        return;
      }
      if (!shiftStart || !shiftEnd) {
        setErrorMessage('Please set both shift start and end times for staff.');
        return;
      }
    }

    try {
      setSubmitting(true);
      const cleanPin = pin.trim() || '123456';
      if (cleanPin.length < 4 || cleanPin.length > 6) {
        setErrorMessage('Security PIN must be between 4 and 6 digits.');
        setSubmitting(false);
        return;
      }

      const newEmployee = await createUser({
        name: trimmedName,
        phone: trimmedPhone,
        role: roleToCreate,
        propertyId: selectedPropertyId, // Scoped to selected property
        staffType: roleToCreate === 'staff' ? trimmedType : null,
        shiftStart: roleToCreate === 'staff' ? shiftStart : null,
        shiftEnd: roleToCreate === 'staff' ? shiftEnd : null,
      });

      // Provision PIN with Supabase Auth
      try {
        await authService.provisionUserPin(trimmedPhone, cleanPin, {
          name: trimmedName,
          role: roleToCreate,
          propertyId: selectedPropertyId,
        });
      } catch (authPinErr) {
        console.warn('Auth PIN provision note:', authPinErr);
      }

      // Reset form
      setName('');
      setPhone('');
      setPin('123456');
      setStaffType('');
      setShiftStart('08:00');
      setShiftEnd('16:00');
      if (isOwner) {
        setSelectedRole('staff');
      }

      const roleLabel =
        roleToCreate === 'manager'
          ? 'Property Manager'
          : roleToCreate === 'inventory_manager'
          ? 'Inventory Manager'
          : 'Staff Member';

      setSuccessMessage(
        `${roleLabel} "${newEmployee.name}" added successfully to ${activePropertyName}! Login PIN: ${cleanPin}`
      );
      await loadEmployees(selectedPropertyId);
      setTimeout(() => setSuccessMessage(null), 6000);
    } catch (err) {
      console.error('Failed to create employee', err);
      setErrorMessage('Failed to add employee. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  // Handle Delete Employee
  const handleDeleteEmployee = async (userToDelete: User) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      setDeletingId(userToDelete.id);
      const success = await deleteUser(userToDelete.id);
      if (success) {
        setSuccessMessage(`User "${userToDelete.name}" has been removed.`);
        await loadEmployees(selectedPropertyId);
        setTimeout(() => setSuccessMessage(null), 3000);
      } else {
        setErrorMessage('Failed to delete user.');
      }
    } catch (err) {
      console.error('Failed to delete user', err);
      setErrorMessage('An error occurred while deleting the user.');
    } finally {
      setDeletingId(null);
    }
  };

  // Handle Offboard Employee (Removes via deleteUser after calculation confirmation)
  const handleConfirmOffboard = async (userToOffboard: User) => {
    setErrorMessage(null);
    setSuccessMessage(null);

    try {
      setIsOffboarding(true);
      const success = await deleteUser(userToOffboard.id);
      if (success) {
        setSuccessMessage(`Employee "${userToOffboard.name}" has been successfully offboarded.`);
        setOffboardingEmployee(null);
        await loadEmployees(selectedPropertyId);
        setTimeout(() => setSuccessMessage(null), 4000);
      } else {
        setErrorMessage('Failed to offboard employee.');
      }
    } catch (err) {
      console.error('Failed to offboard employee', err);
      setErrorMessage('An error occurred while offboarding the employee.');
    } finally {
      setIsOffboarding(false);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading management details...</p>
      </div>
    );
  }

  // If manager has no property assigned
  if (isManager && !currentUser?.propertyId) {
    return (
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center space-y-4">
        <ShieldAlert className="w-10 h-10 text-amber-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">No Assigned Property</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          You are currently not assigned to any property. Please contact the Owner to assign you to a property before managing staff.
        </p>
      </div>
    );
  }

  // If owner has no properties created yet
  if (isOwner && properties.length === 0) {
    return (
      <div className="rounded-2xl bg-slate-900 border border-slate-800 p-8 text-center space-y-4">
        <Building2 className="w-10 h-10 text-purple-400 mx-auto" />
        <h2 className="text-lg font-bold text-white">No Properties Created Yet</h2>
        <p className="text-sm text-slate-400 max-w-md mx-auto">
          Please add your first property in the "Hostels &amp; Properties" tab before adding employees and configuring staff shifts.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header & Scoping Section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-indigo-400" />
            {isOwner ? 'Employee Management' : 'Staff Management'}
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            {isOwner
              ? 'Manage all property staff, leadership roles (Managers & Inventory Managers), and operational schedules.'
              : 'Manage operational on-ground staff members and their shift schedules.'}
          </p>
        </div>

        {/* Property Selector for Owner OR Fixed Property Badge for Manager */}
        {isOwner ? (
          <div className="flex items-center gap-2 bg-slate-900 border border-slate-700/80 p-1.5 rounded-xl self-start sm:self-auto">
            <Building2 className="w-4 h-4 text-purple-400 ml-2 shrink-0" />
            <label htmlFor="owner-property-select" className="sr-only">Select Property</label>
            <select
              id="owner-property-select"
              value={selectedPropertyId}
              onChange={(e) => setSelectedPropertyId(e.target.value)}
              className="bg-transparent text-xs font-semibold text-slate-100 pr-3 py-1 outline-none cursor-pointer"
            >
              {properties.map((p) => (
                <option key={p.id} value={p.id} className="bg-slate-900 text-slate-100">
                  {p.name}
                </option>
              ))}
            </select>
          </div>
        ) : (
          <div className="text-xs text-blue-300 bg-blue-950/40 border border-blue-800/40 px-3 py-1.5 rounded-lg flex items-center gap-1.5 self-start sm:self-auto">
            <Building2 className="w-3.5 h-3.5" />
            <span>Scoped to: <strong>{activePropertyName}</strong></span>
          </div>
        )}
      </div>

      {/* Notifications */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {errorMessage && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-300 text-xs flex items-center gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
          <span>{errorMessage}</span>
        </div>
      )}

      {/* 1. Add Employee Form */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-slate-200">
          <UserPlus className="w-4 h-4 text-indigo-400" />
          <h3 className="font-semibold text-base">
            {isOwner ? 'Add New Employee' : 'Add New Staff Member'}
          </h3>
          <span className="text-xs text-slate-400 font-normal">
            (Assigning to: {activePropertyName})
          </span>
        </div>

        <form onSubmit={handleAddEmployee} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Role Dropdown - ONLY for Owner */}
            {isOwner && (
              <div>
                <label htmlFor="employee-role-select" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Role <span className="text-indigo-400">*</span>
                </label>
                <select
                  id="employee-role-select"
                  value={selectedRole}
                  onChange={(e) => setSelectedRole(e.target.value as UserRole)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 text-sm outline-none transition cursor-pointer"
                >
                  <option value="staff">Staff (On-ground Shift Worker)</option>
                  <option value="manager">Manager (Property Head)</option>
                  <option value="inventory_manager">Inventory Manager (Stock &amp; Procurement)</option>
                </select>
              </div>
            )}

            {/* Name */}
            <div>
              <label htmlFor="staff-name-input" className="block text-xs font-medium text-slate-300 mb-1.5">
                Full Name <span className="text-indigo-400">*</span>
              </label>
              <input
                id="staff-name-input"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="e.g. Ramesh Kumar"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 text-sm placeholder:text-slate-600 outline-none transition"
              />
            </div>

            {/* Phone */}
            <div>
              <label htmlFor="staff-phone-input" className="block text-xs font-medium text-slate-300 mb-1.5">
                Phone Number <span className="text-indigo-400">*</span>
              </label>
              <input
                id="staff-phone-input"
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="e.g. +91 98765 43210"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 text-sm placeholder:text-slate-600 outline-none transition"
              />
            </div>

            {/* Login PIN */}
            <div>
              <label htmlFor="staff-pin-input" className="block text-xs font-medium text-slate-300 mb-1.5 flex items-center justify-between">
                <span>Login Security PIN <span className="text-indigo-400">*</span></span>
                <span className="text-[10px] text-slate-500">4-6 digits</span>
              </label>
              <input
                id="staff-pin-input"
                type="text"
                maxLength={6}
                value={pin}
                onChange={(e) => setPin(e.target.value.replace(/\D/g, ''))}
                placeholder="e.g. 123456"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 text-sm font-mono tracking-widest outline-none transition"
              />
            </div>

            {/* Staff Type - Only shown when role is 'staff' */}
            {(!isOwner || selectedRole === 'staff') && (
              <div>
                <label htmlFor="staff-type-input" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Staff Type / Department <span className="text-indigo-400">*</span>
                </label>
                <input
                  id="staff-type-input"
                  type="text"
                  value={staffType}
                  onChange={(e) => setStaffType(e.target.value)}
                  placeholder="e.g. Kitchen, Housekeeping, Security"
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 text-sm placeholder:text-slate-600 outline-none transition"
                />
              </div>
            )}

            {/* Shift Start - Only shown when role is 'staff' */}
            {(!isOwner || selectedRole === 'staff') && (
              <div>
                <label htmlFor="staff-shift-start" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Shift Start <span className="text-indigo-400">*</span>
                </label>
                <input
                  id="staff-shift-start"
                  type="time"
                  value={shiftStart}
                  onChange={(e) => setShiftStart(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 text-sm font-mono outline-none transition"
                />
              </div>
            )}

            {/* Shift End - Only shown when role is 'staff' */}
            {(!isOwner || selectedRole === 'staff') && (
              <div>
                <label htmlFor="staff-shift-end" className="block text-xs font-medium text-slate-300 mb-1.5">
                  Shift End <span className="text-indigo-400">*</span>
                </label>
                <input
                  id="staff-shift-end"
                  type="time"
                  value={shiftEnd}
                  onChange={(e) => setShiftEnd(e.target.value)}
                  className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-indigo-500 focus:ring-1 focus:ring-indigo-500 text-slate-100 text-sm font-mono outline-none transition"
                />
              </div>
            )}

            {/* Scoped Summary Info */}
            <div className="flex flex-col justify-center bg-slate-950/50 border border-slate-800/80 rounded-xl p-2.5 text-xs text-slate-400">
              <div>
                Role:{' '}
                <span className="font-mono text-slate-200">
                  {isOwner ? selectedRole : 'staff (fixed for manager)'}
                </span>
              </div>
              <div className="truncate">
                Property: <span className="text-slate-200 font-medium">{activePropertyName}</span>
              </div>
            </div>
          </div>

          <div className="flex items-center justify-end pt-1">
            <button
              id="add-staff-btn"
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition cursor-pointer"
            >
              <UserPlus className="w-3.5 h-3.5" />
              {submitting
                ? 'Adding...'
                : isOwner
                ? `Add ${
                    selectedRole === 'manager'
                      ? 'Manager'
                      : selectedRole === 'inventory_manager'
                      ? 'Inventory Manager'
                      : 'Staff Member'
                  }`
                : 'Add Staff Member'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Employee / Staff List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-semibold text-slate-200 flex items-center gap-2">
            <span>
              {isOwner ? `All Employees (${employeeList.length})` : `Staff Members (${employeeList.length})`}
            </span>
            <span className="text-xs font-normal text-slate-400">
              in {activePropertyName}
            </span>
          </h3>
          {loadingEmployees && (
            <div className="flex items-center gap-1.5 text-xs text-slate-400">
              <div className="w-3 h-3 border border-indigo-400 border-t-transparent rounded-full animate-spin" />
              <span>Updating list...</span>
            </div>
          )}
        </div>

        {employeeList.length === 0 ? (
          <div className="rounded-2xl bg-slate-900/60 border border-slate-800/80 p-8 text-center text-slate-400 text-sm space-y-1">
            <Users className="w-8 h-8 text-slate-600 mx-auto mb-2" />
            <p className="font-medium text-slate-300">
              {isOwner
                ? `No employees found for ${activePropertyName}.`
                : `No staff members found for ${activePropertyName}.`}
            </p>
            <p className="text-xs text-slate-500">
              {isOwner
                ? 'Use the form above to add Managers, Inventory Managers, or Staff to this property.'
                : 'Use the form above to add general staff members to this property.'}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-3">
            {employeeList.map((emp) => {
              const isEmpManager = emp.role === 'manager';
              const isEmpInvManager = emp.role === 'inventory_manager';
              const isEmpStaff = emp.role === 'staff';

              return (
                <div
                  key={emp.id}
                  id={`staff-card-${emp.id}`}
                  className="rounded-xl bg-slate-900/90 border border-slate-800 p-4 sm:p-5 shadow-sm hover:border-slate-700/80 transition flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  {/* Employee info */}
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2.5">
                      <h4 className="font-bold text-white text-base">{emp.name}</h4>

                      {/* Role Badges */}
                      {isEmpManager && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-blue-950/80 border border-blue-800/60 text-blue-300 font-semibold flex items-center gap-1">
                          <Shield className="w-3 h-3 text-blue-400" />
                          Property Manager
                        </span>
                      )}

                      {isEmpInvManager && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-amber-950/80 border border-amber-800/60 text-amber-300 font-semibold flex items-center gap-1">
                          <UserCheck className="w-3 h-3 text-amber-400" />
                          Inventory Manager
                        </span>
                      )}

                      {isEmpStaff && emp.staffType && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-950/70 border border-indigo-800/50 text-indigo-300 font-medium flex items-center gap-1">
                          <Briefcase className="w-3 h-3" />
                          {emp.staffType} (Staff)
                        </span>
                      )}

                      {isEmpStaff && !emp.staffType && (
                        <span className="text-[11px] px-2.5 py-0.5 rounded-full bg-indigo-950/70 border border-indigo-800/50 text-indigo-300 font-medium flex items-center gap-1">
                          Staff
                        </span>
                      )}
                    </div>

                    <div className="flex flex-wrap items-center gap-x-5 gap-y-1 text-xs text-slate-400">
                      <span className="flex items-center gap-1.5">
                        <Phone className="w-3.5 h-3.5 text-slate-500" />
                        <span className="font-mono text-slate-300">{emp.phone}</span>
                      </span>

                      {(emp.shiftStart || emp.shiftEnd) && (
                        <span className="flex items-center gap-1.5">
                          <Clock className="w-3.5 h-3.5 text-slate-500" />
                          <span className="font-mono text-slate-300">
                            {emp.shiftStart || '--:--'} - {emp.shiftEnd || '--:--'}
                          </span>
                        </span>
                      )}

                      <span className="font-mono text-[11px] text-slate-500">
                        ID: {emp.id}
                      </span>
                    </div>
                  </div>

                  {/* Actions: Credentials/PIN + Offboard (for Staff & Inv Manager) + Delete */}
                  <div className="self-end sm:self-center flex flex-wrap items-center gap-2">
                    <button
                      id={`credentials-staff-${emp.id}`}
                      type="button"
                      onClick={() => {
                        setCredentialsUser(emp);
                        setModalNewPin('');
                        setModalPinSuccess(null);
                        setModalPinError(null);
                        setCopied(false);
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-800/60 hover:border-indigo-700 text-indigo-300 hover:text-indigo-200 text-xs font-semibold transition cursor-pointer"
                    >
                      <KeyRound className="w-3.5 h-3.5" />
                      Login PIN
                    </button>

                    {(isEmpStaff || isEmpInvManager) && (
                      <button
                        id={`offboard-staff-${emp.id}`}
                        type="button"
                        onClick={() => setOffboardingEmployee(emp)}
                        disabled={deletingId === emp.id || isOffboarding}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-amber-950/40 hover:bg-amber-900/60 border border-amber-800/60 hover:border-amber-700 text-amber-300 hover:text-amber-200 text-xs font-semibold transition cursor-pointer disabled:opacity-50"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                        Offboard
                      </button>
                    )}

                    <button
                      id={`delete-staff-${emp.id}`}
                      type="button"
                      onClick={() => handleDeleteEmployee(emp)}
                      disabled={deletingId === emp.id || isOffboarding}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/50 hover:border-rose-700 text-rose-300 hover:text-rose-200 text-xs font-medium transition cursor-pointer disabled:opacity-50"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      {deletingId === emp.id ? 'Deleting...' : 'Delete'}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Offboard Employee Confirmation Modal */}
      <OffboardModal
        isOpen={!!offboardingEmployee}
        onClose={() => setOffboardingEmployee(null)}
        employee={offboardingEmployee}
        onConfirmOffboard={handleConfirmOffboard}
        isProcessing={isOffboarding}
      />

      {/* Credentials & PIN Modal */}
      {credentialsUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-xs">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-6 space-y-5 shadow-2xl">
            {/* Modal Header */}
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2.5">
                <div className="p-2 rounded-xl bg-indigo-950 border border-indigo-800/60 text-indigo-400">
                  <KeyRound className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="font-bold text-white text-base">Login Credentials &amp; PIN</h3>
                  <p className="text-xs text-slate-400">{credentialsUser.name}</p>
                </div>
              </div>
              <button
                onClick={() => setCredentialsUser(null)}
                className="text-slate-400 hover:text-slate-200 p-1 rounded-lg hover:bg-slate-800 transition"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Credential summary card */}
            <div className="rounded-xl bg-slate-950/80 border border-slate-800/80 p-4 space-y-3">
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Role:</span>
                <span className="font-semibold text-slate-200 capitalize">
                  {credentialsUser.role.replace('_', ' ')}
                </span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Assigned Property:</span>
                <span className="font-medium text-slate-200">{activePropertyName}</span>
              </div>
              <div className="flex items-center justify-between text-xs">
                <span className="text-slate-400">Login Phone:</span>
                <span className="font-mono text-indigo-300 font-bold">{credentialsUser.phone}</span>
              </div>
            </div>

            {/* Set/Update PIN form */}
            <div className="space-y-3">
              <label className="block text-xs font-semibold text-slate-300">
                Set / Reset Security PIN (4-6 digits)
              </label>
              <div className="flex items-center gap-2">
                <input
                  type="text"
                  maxLength={6}
                  value={modalNewPin}
                  onChange={(e) => setModalNewPin(e.target.value.replace(/\D/g, ''))}
                  placeholder="Enter new 4-6 digit PIN"
                  className="flex-1 px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-700 text-white placeholder-slate-500 font-mono tracking-widest text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                />
                <button
                  type="button"
                  disabled={updatingPin || modalNewPin.length < 4}
                  onClick={async () => {
                    setModalPinError(null);
                    setModalPinSuccess(null);
                    if (modalNewPin.length < 4 || modalNewPin.length > 6) {
                      setModalPinError('PIN must be 4 to 6 numeric digits.');
                      return;
                    }
                    try {
                      setUpdatingPin(true);
                      await authService.provisionUserPin(credentialsUser.phone, modalNewPin, {
                        name: credentialsUser.name,
                        role: credentialsUser.role,
                        propertyId: credentialsUser.propertyId,
                      });
                      setModalPinSuccess(`PIN successfully updated to "${modalNewPin}".`);
                      setModalNewPin('');
                    } catch (err: any) {
                      setModalPinError(err.message || 'Failed to update PIN.');
                    } finally {
                      setUpdatingPin(false);
                    }
                  }}
                  className="px-4 py-2.5 bg-indigo-600 hover:bg-indigo-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition shrink-0 cursor-pointer"
                >
                  {updatingPin ? 'Saving...' : 'Set PIN'}
                </button>
              </div>

              {modalPinSuccess && (
                <div className="p-2.5 rounded-lg bg-emerald-950/70 border border-emerald-800 text-emerald-300 text-xs flex items-center gap-2">
                  <Check className="w-4 h-4 shrink-0" />
                  <span>{modalPinSuccess}</span>
                </div>
              )}

              {modalPinError && (
                <div className="p-2.5 rounded-lg bg-rose-950/70 border border-rose-800 text-rose-300 text-xs flex items-center gap-2">
                  <AlertCircle className="w-4 h-4 shrink-0" />
                  <span>{modalPinError}</span>
                </div>
              )}
            </div>

            {/* Quick Share message */}
            <div className="pt-2 border-t border-slate-800 flex items-center justify-between gap-3">
              <p className="text-[11px] text-slate-400">
                Share login details with this employee.
              </p>
              <button
                type="button"
                onClick={() => {
                  const portalUrl = window.location.origin;
                  const textToCopy = `HostelOps Login Details:\n• Role: ${credentialsUser.role.toUpperCase()}\n• Property: ${activePropertyName}\n• Phone: ${credentialsUser.phone}\n• Portal Link: ${portalUrl}`;
                  navigator.clipboard.writeText(textToCopy);
                  setCopied(true);
                  setTimeout(() => setCopied(false), 3000);
                }}
                className="inline-flex items-center gap-1.5 px-3 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition cursor-pointer shrink-0"
              >
                {copied ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                {copied ? 'Copied Details!' : 'Copy Login Info'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

