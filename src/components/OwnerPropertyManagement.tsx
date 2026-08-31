import React, { useEffect, useState } from 'react';
import { Property, User } from '../types';
import {
  getProperties,
  getUsersByRole,
  getUsersByProperty,
  createProperty,
  updateUser,
} from '../services/dataService';
import {
  Building2,
  Plus,
  MapPin,
  Briefcase,
  UserCheck,
  CheckCircle,
  AlertCircle,
  Sparkles,
} from 'lucide-react';

export default function OwnerPropertyManagement() {
  const [properties, setProperties] = useState<Property[]>([]);
  const [propertyStaffMap, setPropertyStaffMap] = useState<
    Record<string, { manager: User | null; inventoryManager: User | null }>
  >({});
  const [allManagers, setAllManagers] = useState<User[]>([]);
  const [allInventoryManagers, setAllInventoryManagers] = useState<User[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // New property form state
  const [newName, setNewName] = useState<string>('');
  const [newAddress, setNewAddress] = useState<string>('');
  const [creating, setCreating] = useState<boolean>(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // Load properties and assigned staff
  const loadData = async () => {
    try {
      setLoading(true);
      const [fetchedProperties, managers, inventoryManagers] = await Promise.all([
        getProperties(),
        getUsersByRole('manager'),
        getUsersByRole('inventory_manager'),
      ]);

      setProperties(fetchedProperties);
      setAllManagers(managers);
      setAllInventoryManagers(inventoryManagers);

      // Load assigned staff for each property via getUsersByProperty
      const staffMap: Record<string, { manager: User | null; inventoryManager: User | null }> = {};
      for (const prop of fetchedProperties) {
        const propUsers = await getUsersByProperty(prop.id);
        const manager = propUsers.find((u) => u.role === 'manager') || null;
        const inventoryManager = propUsers.find((u) => u.role === 'inventory_manager') || null;
        staffMap[prop.id] = { manager, inventoryManager };
      }
      setPropertyStaffMap(staffMap);
    } catch (err) {
      console.error('Failed to load property data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreateProperty = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);
    setSuccessMessage(null);

    const trimmedName = newName.trim();
    const trimmedAddress = newAddress.trim();

    if (!trimmedName || !trimmedAddress) {
      setFormError('Please enter both property name and address.');
      return;
    }

    try {
      setCreating(true);
      const created = await createProperty({
        name: trimmedName,
        address: trimmedAddress,
        latitude: null,
        longitude: null,
        geofenceRadiusM: null,
      });

      setNewName('');
      setNewAddress('');
      setSuccessMessage(`Property "${created.name}" created successfully!`);
      await loadData();
      setTimeout(() => setSuccessMessage(null), 4000);
    } catch (err: any) {
      console.error('Failed to create property', err);
      const errMsg = err?.message || 'Failed to create property. Please try again.';
      setFormError(errMsg);
    } finally {
      setCreating(false);
    }
  };

  const handleAssignManager = async (propertyId: string, newManagerId: string) => {
    try {
      const currentStaff = propertyStaffMap[propertyId];
      const previousManager = currentStaff?.manager;

      // If assigning a new manager
      if (newManagerId) {
        // If there was a previous manager on this property, unassign them
        if (previousManager && previousManager.id !== newManagerId) {
          await updateUser(previousManager.id, { propertyId: null });
        }
        // Assign the new manager to this property
        await updateUser(newManagerId, { propertyId });
      } else if (previousManager) {
        // Unassigned
        await updateUser(previousManager.id, { propertyId: null });
      }

      await loadData();
      setSuccessMessage('Manager assignment updated successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to update manager assignment', err);
    }
  };

  const handleAssignInventoryManager = async (
    propertyId: string,
    newInventoryManagerId: string
  ) => {
    try {
      const currentStaff = propertyStaffMap[propertyId];
      const previousInvManager = currentStaff?.inventoryManager;

      if (newInventoryManagerId) {
        if (previousInvManager && previousInvManager.id !== newInventoryManagerId) {
          await updateUser(previousInvManager.id, { propertyId: null });
        }
        await updateUser(newInventoryManagerId, { propertyId });
      } else if (previousInvManager) {
        await updateUser(previousInvManager.id, { propertyId: null });
      }

      await loadData();
      setSuccessMessage('Inventory Manager assignment updated successfully.');
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      console.error('Failed to update inventory manager assignment', err);
    }
  };

  if (loading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-3">
        <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm text-slate-400">Loading properties and staff assignments...</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header section */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Building2 className="w-5 h-5 text-purple-400" />
            Property Management
          </h2>
          <p className="text-sm text-slate-400 mt-1">
            Manage your hostel chain properties and assign key leadership roles.
          </p>
        </div>
        <div className="text-xs text-purple-300 bg-purple-950/40 border border-purple-800/40 px-3 py-1.5 rounded-lg flex items-center gap-1.5 self-start sm:self-auto">
          <Sparkles className="w-3.5 h-3.5" />
          <span>{properties.length} Active Hostels</span>
        </div>
      </div>

      {/* Success / Error notification */}
      {successMessage && (
        <div className="p-3.5 rounded-xl bg-emerald-950/60 border border-emerald-800/60 text-emerald-300 text-xs flex items-center gap-2">
          <CheckCircle className="w-4 h-4 shrink-0 text-emerald-400" />
          <span>{successMessage}</span>
        </div>
      )}

      {/* 1. Create Property Form */}
      <div className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 shadow-sm">
        <div className="flex items-center gap-2 mb-4 text-slate-200">
          <Plus className="w-4 h-4 text-purple-400" />
          <h3 className="font-semibold text-base">Add New Property</h3>
        </div>

        <form onSubmit={handleCreateProperty} className="space-y-4">
          {formError && (
            <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800/60 text-rose-200 text-xs flex flex-col gap-2">
              <div className="flex items-center gap-2 font-medium">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
                <span>{formError}</span>
              </div>
              {formError.toLowerCase().includes('row-level security') && (
                <div className="mt-1 p-2.5 rounded-lg bg-slate-950/80 border border-slate-800 text-[11px] text-slate-300 leading-relaxed">
                  <p className="font-semibold text-purple-300 mb-1">How to fix in Supabase in 5 seconds:</p>
                  <ol className="list-decimal list-inside space-y-0.5 text-slate-400">
                    <li>Open your Supabase Project Dashboard &gt; <strong>SQL Editor</strong>.</li>
                    <li>Copy and paste the script from <code className="text-purple-300 bg-purple-950/60 px-1 py-0.5 rounded">/supabase/migrations/20260830_fix_rls_policies.sql</code>.</li>
                    <li>Click <strong>Run</strong> to apply the updated owner policies.</li>
                  </ol>
                </div>
              )}
            </div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label htmlFor="property-name-input" className="block text-xs font-medium text-slate-300 mb-1.5">
                Property Name <span className="text-purple-400">*</span>
              </label>
              <input
                id="property-name-input"
                type="text"
                value={newName}
                onChange={(e) => setNewName(e.target.value)}
                placeholder="e.g. Mountain View Hostel"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-slate-100 text-sm placeholder:text-slate-600 outline-none transition"
              />
            </div>

            <div>
              <label htmlFor="property-address-input" className="block text-xs font-medium text-slate-300 mb-1.5">
                Full Address <span className="text-purple-400">*</span>
              </label>
              <input
                id="property-address-input"
                type="text"
                value={newAddress}
                onChange={(e) => setNewAddress(e.target.value)}
                placeholder="e.g. 104 Pine Ridge, Mall Road, Manali"
                className="w-full px-3.5 py-2.5 rounded-xl bg-slate-950 border border-slate-800 focus:border-purple-500 focus:ring-1 focus:ring-purple-500 text-slate-100 text-sm placeholder:text-slate-600 outline-none transition"
              />
            </div>
          </div>

          <div className="flex items-center justify-between pt-1">
            <p className="text-xs text-slate-500">
              Note: Geofence coordinates and radius will be configured by the assigned Manager.
            </p>
            <button
              id="create-property-btn"
              type="submit"
              disabled={creating}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-purple-600 hover:bg-purple-500 disabled:opacity-50 text-white text-xs font-semibold shadow transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              {creating ? 'Creating...' : 'Create Property'}
            </button>
          </div>
        </form>
      </div>

      {/* 2. Property List */}
      <div className="space-y-4">
        <h3 className="text-base font-semibold text-slate-200 flex items-center justify-between">
          <span>All Properties ({properties.length})</span>
        </h3>

        <div className="grid grid-cols-1 gap-4">
          {properties.length === 0 ? (
            <div className="rounded-2xl bg-slate-900/40 border border-slate-800/80 p-8 text-center space-y-2">
              <Building2 className="w-8 h-8 text-slate-600 mx-auto" />
              <p className="text-sm font-medium text-slate-300">No properties in database yet</p>
              <p className="text-xs text-slate-500 max-w-sm mx-auto">
                Use the "Add New Property" form above to create your first hostel property in Supabase.
              </p>
            </div>
          ) : (
            properties.map((property) => {
            const staff = propertyStaffMap[property.id] || {
              manager: null,
              inventoryManager: null,
            };

            return (
              <div
                key={property.id}
                id={`property-card-${property.id}`}
                className="rounded-2xl bg-slate-900/90 border border-slate-800 p-5 sm:p-6 shadow-sm hover:border-slate-700 transition space-y-5"
              >
                {/* Property title & address */}
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Building2 className="w-4 h-4 text-purple-400 shrink-0" />
                      <h4 className="text-lg font-bold text-white tracking-tight">
                        {property.name}
                      </h4>
                    </div>
                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                      <MapPin className="w-3.5 h-3.5 text-slate-500 shrink-0" />
                      <span>{property.address}</span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 text-xs font-mono text-slate-500 bg-slate-950 px-2.5 py-1 rounded-lg border border-slate-800 self-start">
                    ID: {property.id}
                  </div>
                </div>

                {/* Staff Assignment Controls */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-4 border-t border-slate-800/80">
                  {/* Property Manager Dropdown */}
                  <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor={`select-mgr-${property.id}`}
                        className="text-xs font-medium text-blue-300 flex items-center gap-1.5"
                      >
                        <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                        Property Manager
                      </label>
                      {staff.manager && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          {staff.manager.phone}
                        </span>
                      )}
                    </div>

                    <select
                      id={`select-mgr-${property.id}`}
                      value={staff.manager?.id || ''}
                      onChange={(e) => handleAssignManager(property.id, e.target.value)}
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-blue-500 text-xs text-slate-200 outline-none transition cursor-pointer"
                    >
                      <option value="">(Unassigned)</option>
                      {allManagers.map((mgr) => {
                        const isAssignedElsewhere =
                          mgr.propertyId && mgr.propertyId !== property.id;
                        return (
                          <option key={mgr.id} value={mgr.id}>
                            {mgr.name} {isAssignedElsewhere ? `(Currently on other property)` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Inventory Manager Dropdown */}
                  <div className="space-y-2 bg-slate-950/60 p-3.5 rounded-xl border border-slate-800/60">
                    <div className="flex items-center justify-between">
                      <label
                        htmlFor={`select-inv-${property.id}`}
                        className="text-xs font-medium text-amber-300 flex items-center gap-1.5"
                      >
                        <UserCheck className="w-3.5 h-3.5 text-amber-400" />
                        Inventory Manager
                      </label>
                      {staff.inventoryManager && (
                        <span className="text-[11px] text-slate-400 font-mono">
                          {staff.inventoryManager.phone}
                        </span>
                      )}
                    </div>

                    <select
                      id={`select-inv-${property.id}`}
                      value={staff.inventoryManager?.id || ''}
                      onChange={(e) =>
                        handleAssignInventoryManager(property.id, e.target.value)
                      }
                      className="w-full px-3 py-2 rounded-lg bg-slate-900 border border-slate-700 hover:border-slate-600 focus:border-amber-500 text-xs text-slate-200 outline-none transition cursor-pointer"
                    >
                      <option value="">(Unassigned)</option>
                      {allInventoryManagers.map((inv) => {
                        const isAssignedElsewhere =
                          inv.propertyId && inv.propertyId !== property.id;
                        return (
                          <option key={inv.id} value={inv.id}>
                            {inv.name} {isAssignedElsewhere ? `(Currently on other property)` : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>
                </div>
              </div>
            );
          })
          )}
        </div>
      </div>
    </div>
  );
}
