import React, { useEffect, useState, useCallback, useRef } from 'react';
import {
  Task,
  TaskCategory,
  TaskStatus,
  PaymentType,
  Voucher,
  User,
  Property,
} from '../types';
import { useAuth } from '../context/AuthContext';
import {
  getTasks,
  getTasksByProperty,
  getTaskCategories,
  getProperties,
  getPropertyById,
  getUsers,
  getUsersByProperty,
  getVoucherByTaskId,
  createTask,
  updateTask,
  updateTaskStatus,
  createVoucher,
  updateVoucher,
} from '../services/dataService';
import {
  ClipboardList,
  PlusCircle,
  Image as ImageIcon,
  CheckCircle2,
  AlertCircle,
  Building2,
  Camera,
  Trash2,
  Clock,
  CheckCheck,
  XCircle,
  FileText,
  Layers,
  Sparkles,
  Send,
  Receipt,
  User as UserIcon,
  IndianRupee,
  Edit3,
  ThumbsUp,
  X,
  Hourglass,
  ArrowRight,
  Filter,
  Check,
  ChevronDown,
  ChevronUp,
} from 'lucide-react';

type TaskTab = 'created' | 'pending_approval' | 'approved' | 'completed' | 'rejected';

export default function UnifiedTaskManagement() {
  const { currentUser } = useAuth();
  if (!currentUser) return null;

  const isOwner = currentUser.role === 'owner';
  const isManager = currentUser.role === 'manager';
  const isInventoryManager = currentUser.role === 'inventory_manager';
  const isStaff = currentUser.role === 'staff';

  const canEditDescription = isInventoryManager || isManager || isOwner;
  const canEditVoucher = isManager || isOwner;
  const canMoveToApproval = isManager || isOwner;
  const canMarkCompleted = isInventoryManager || isManager;

  // Active tab state
  const [activeTab, setActiveTab] = useState<TaskTab>('created');

  // Filter state for Owner
  const [properties, setProperties] = useState<Property[]>([]);
  const [selectedPropertyId, setSelectedPropertyId] = useState<string>('all');
  const [property, setProperty] = useState<Property | null>(null);

  // Data states
  const [tasks, setTasks] = useState<Task[]>([]);
  const [categories, setCategories] = useState<TaskCategory[]>([]);
  const [usersMap, setUsersMap] = useState<Record<string, User>>({});
  const [vouchersMap, setVouchersMap] = useState<Record<string, Voucher>>({});
  const [loading, setLoading] = useState<boolean>(true);

  // "New" badge tracking for pending_approval
  const [seenApprovalCount, setSeenApprovalCount] = useState<number>(() => {
    const saved = localStorage.getItem(`hostelops_seen_approval_${currentUser.id}`);
    return saved ? parseInt(saved, 10) : 0;
  });

  // Creation form state
  const [showCreateForm, setShowCreateForm] = useState<boolean>(false);
  const [createPropertyId, setCreatePropertyId] = useState<string>(currentUser.propertyId || '');
  const [createCategoryId, setCreateCategoryId] = useState<string>('');
  const [createDescription, setCreateDescription] = useState<string>('');
  const [createPhotoDataUrl, setCreatePhotoDataUrl] = useState<string | null>(null);
  const [createSubmitting, setCreateSubmitting] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Edit Task Description Modal
  const [editingTask, setEditingTask] = useState<Task | null>(null);
  const [editDescriptionText, setEditDescriptionText] = useState<string>('');
  const [editDescriptionSubmitting, setEditDescriptionSubmitting] = useState<boolean>(false);

  // Edit Voucher Modal
  const [editingVoucherTask, setEditingVoucherTask] = useState<Task | null>(null);
  const [voucherPaymentType, setVoucherPaymentType] = useState<PaymentType>('no_payment');
  const [voucherAmount, setVoucherAmount] = useState<string>('');
  const [voucherSubmitting, setVoucherSubmitting] = useState<boolean>(false);

  // Rejection Modal
  const [rejectingTask, setRejectingTask] = useState<Task | null>(null);
  const [rejectReason, setRejectReason] = useState<string>('');
  const [rejectSubmitting, setRejectSubmitting] = useState<boolean>(false);

  // Photo viewer modal
  const [selectedPhotoUrl, setSelectedPhotoUrl] = useState<string | null>(null);

  // Processing tracker for fast actions
  const [processingTaskId, setProcessingTaskId] = useState<string | null>(null);

  // Notification state
  const [notification, setNotification] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const showNotification = (type: 'success' | 'error', message: string) => {
    setNotification({ type, message });
    setTimeout(() => {
      setNotification((curr) => (curr?.message === message ? null : curr));
    }, 4500);
  };

  // Load all foundational data
  const loadData = useCallback(async () => {
    try {
      setLoading(true);

      let fetchedProperties: Property[] = [];
      let currentProperty: Property | null = null;
      let fetchedCategories: TaskCategory[] = [];
      let fetchedTasks: Task[] = [];
      let userList: User[] = [];

      if (isOwner) {
        fetchedProperties = await getProperties();
        setProperties(fetchedProperties);
        userList = await getUsers();
        fetchedCategories = await getTaskCategories(); // all categories
        fetchedTasks = await getTasks();
      } else if (currentUser.propertyId) {
        currentProperty = await getPropertyById(currentUser.propertyId);
        setProperty(currentProperty);
        fetchedCategories = await getTaskCategories(currentUser.propertyId);
        userList = await getUsersByProperty(currentUser.propertyId);
        fetchedTasks = await getTasksByProperty(currentUser.propertyId);
      }

      const uMap: Record<string, User> = {};
      userList.forEach((u) => {
        uMap[u.id] = u;
      });
      setUsersMap(uMap);
      setCategories(fetchedCategories);
      setTasks(fetchedTasks);

      // Fetch vouchers for these tasks
      const vMap: Record<string, Voucher> = {};
      await Promise.all(
        fetchedTasks.map(async (t) => {
          const v = await getVoucherByTaskId(t.id);
          if (v) {
            vMap[t.id] = v;
          }
        })
      );
      setVouchersMap(vMap);

      // Initialize create property selector for owner if not set
      if (isOwner && fetchedProperties.length > 0 && !createPropertyId) {
        setCreatePropertyId(fetchedProperties[0].id);
      }
    } catch (err) {
      console.error('Failed to load task management data', err);
      showNotification('error', 'Failed to load task data. Please try again.');
    } finally {
      setLoading(false);
    }
  }, [currentUser, isOwner, createPropertyId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Track pending approval count
  const pendingApprovalTasks = tasks.filter((t) => {
    if (t.status !== 'pending_approval') return false;
    if (isOwner && selectedPropertyId !== 'all') {
      return t.propertyId === selectedPropertyId;
    }
    return true;
  });

  const totalPendingApprovalCount = pendingApprovalTasks.length;
  const hasNewApprovalTasks = totalPendingApprovalCount > seenApprovalCount;

  // When user switches to 'pending_approval' tab, mark all as seen
  const handleTabChange = (tab: TaskTab) => {
    setActiveTab(tab);
    if (tab === 'pending_approval') {
      setSeenApprovalCount(totalPendingApprovalCount);
      localStorage.setItem(
        `hostelops_seen_approval_${currentUser.id}`,
        totalPendingApprovalCount.toString()
      );
    }
  };

  // Helper category resolver
  const getCategoryName = (categoryId: string) => {
    const cat = categories.find((c) => c.id === categoryId);
    return cat ? cat.name : 'General Task';
  };

  // Helper user resolver
  const getUserName = (userId: string | null) => {
    if (!userId) return 'System';
    const user = usersMap[userId];
    if (!user) return 'Staff Member';
    return `${user.name} (${user.role.replace('_', ' ')})`;
  };

  // Helper property resolver
  const getPropertyName = (propertyId: string) => {
    if (property && property.id === propertyId) return property.name;
    const prop = properties.find((p) => p.id === propertyId);
    return prop ? prop.name : propertyId;
  };

  // Filter tasks for the current tab and property
  const currentTabTasks = tasks.filter((task) => {
    if (task.status !== activeTab) return false;
    if (isOwner && selectedPropertyId !== 'all') {
      return task.propertyId === selectedPropertyId;
    }
    return true;
  });

  // Handle Photo File Upload (via FileReader to Base64 Data URL)
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      showNotification('error', 'Please upload a valid image file (JPG, PNG, WebP).');
      return;
    }

    if (file.size > 4 * 1024 * 1024) {
      showNotification('error', 'Image size should be less than 4MB.');
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      setCreatePhotoDataUrl(reader.result as string);
    };
    reader.onerror = () => {
      showNotification('error', 'Failed to read image file.');
    };
    reader.readAsDataURL(file);
  };

  // Submit Create Task
  const handleCreateTask = async (e: React.FormEvent) => {
    e.preventDefault();

    const targetPropertyId = isOwner ? createPropertyId : currentUser.propertyId;
    if (!targetPropertyId) {
      showNotification('error', 'Please select a valid property.');
      return;
    }

    if (!createCategoryId) {
      showNotification('error', 'Please select a task category.');
      return;
    }

    if (!createDescription.trim()) {
      showNotification('error', 'Please enter a task description.');
      return;
    }

    try {
      setCreateSubmitting(true);

      const newTask = await createTask({
        propertyId: targetPropertyId,
        createdBy: currentUser.id,
        categoryId: createCategoryId,
        description: createDescription.trim(),
        photoUrl: createPhotoDataUrl,
        status: 'created',
        lastActionBy: currentUser.id,
        lastActionNote: 'Task created',
      });

      showNotification('success', `Task #${newTask.id.slice(-4).toUpperCase()} created successfully.`);

      // Reset form
      setCreateDescription('');
      setCreateCategoryId('');
      setCreatePhotoDataUrl(null);
      if (fileInputRef.current) fileInputRef.current.value = '';
      setShowCreateForm(false);

      // Reload tasks & switch to Created tab
      await loadData();
      setActiveTab('created');
    } catch (err) {
      console.error('Failed to create task', err);
      showNotification('error', 'Failed to create task. Please try again.');
    } finally {
      setCreateSubmitting(false);
    }
  };

  // Handle Edit Description Submit
  const handleSaveDescription = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingTask) return;
    if (!editDescriptionText.trim()) {
      showNotification('error', 'Description cannot be empty.');
      return;
    }

    try {
      setEditDescriptionSubmitting(true);
      await updateTask(editingTask.id, {
        description: editDescriptionText.trim(),
        lastActionBy: currentUser.id,
        lastActionNote: `Description updated by ${currentUser.name}`,
      });

      showNotification('success', 'Task description updated successfully.');
      setEditingTask(null);
      setEditDescriptionText('');
      await loadData();
    } catch (err) {
      console.error('Failed to update description', err);
      showNotification('error', 'Failed to update description.');
    } finally {
      setEditDescriptionSubmitting(false);
    }
  };

  // Open Voucher Edit Modal
  const handleOpenVoucherModal = (task: Task) => {
    setEditingVoucherTask(task);
    const existing = vouchersMap[task.id];
    if (existing) {
      setVoucherPaymentType(existing.paymentType);
      setVoucherAmount(existing.amount !== null ? existing.amount.toString() : '');
    } else {
      setVoucherPaymentType('no_payment');
      setVoucherAmount('');
    }
  };

  // Submit Voucher Edit
  const handleSaveVoucher = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingVoucherTask) return;

    if (voucherPaymentType !== 'no_payment') {
      const parsed = parseFloat(voucherAmount);
      if (isNaN(parsed) || parsed <= 0) {
        showNotification('error', 'Please enter a valid positive amount.');
        return;
      }
    }

    try {
      setVoucherSubmitting(true);
      const existingVoucher = vouchersMap[editingVoucherTask.id];
      const prevPaymentType = existingVoucher?.paymentType || 'no_payment';
      const numAmount = voucherPaymentType === 'no_payment' ? null : parseFloat(voucherAmount);

      if (existingVoucher) {
        await updateVoucher(existingVoucher.id, {
          paymentType: voucherPaymentType,
          amount: numAmount,
        });
      } else {
        await createVoucher({
          taskId: editingVoucherTask.id,
          paymentType: voucherPaymentType,
          amount: numAmount,
          createdBy: currentUser.id,
        });
      }

      // Check if paymentType was edited while status is 'pending_approval' or 'approved'
      // and the new paymentType requires a different approver than before
      // 'no_payment' (Manager) vs 'petty_cash'/'head_office' (Owner)
      const prevApproverRole = prevPaymentType === 'no_payment' ? 'manager' : 'owner';
      const newApproverRole = voucherPaymentType === 'no_payment' ? 'manager' : 'owner';

      if (
        (editingVoucherTask.status === 'pending_approval' || editingVoucherTask.status === 'approved') &&
        prevApproverRole !== newApproverRole
      ) {
        await updateTaskStatus(
          editingVoucherTask.id,
          'pending_approval',
          currentUser.id,
          `Payment type changed to ${voucherPaymentType.replace('_', ' ')}. Reverted to Pending Approval.`
        );
        showNotification(
          'success',
          `Voucher updated. Task reverted to Pending Approval for ${newApproverRole === 'owner' ? 'Owner' : 'Manager'} review.`
        );
      } else {
        showNotification('success', 'Voucher details updated successfully.');
      }

      setEditingVoucherTask(null);
      await loadData();
    } catch (err) {
      console.error('Failed to save voucher', err);
      showNotification('error', 'Failed to update voucher.');
    } finally {
      setVoucherSubmitting(false);
    }
  };

  // Move to Approval (Pending Review -> Pending Approval)
  const handleMoveToApproval = async (task: Task) => {
    try {
      setProcessingTaskId(task.id);
      await updateTaskStatus(
        task.id,
        'pending_approval',
        currentUser.id,
        `Moved to Approval by ${currentUser.name}`
      );
      showNotification('success', `Task #${task.id.slice(-4).toUpperCase()} moved to Pending Approval.`);
      await loadData();
    } catch (err) {
      console.error('Failed to move task to approval', err);
      showNotification('error', 'Failed to update task status.');
    } finally {
      setProcessingTaskId(null);
    }
  };

  // Approve Task
  const handleApprove = async (task: Task) => {
    try {
      setProcessingTaskId(task.id);
      await updateTaskStatus(
        task.id,
        'approved',
        currentUser.id,
        `Approved by ${currentUser.name} (${currentUser.role.replace('_', ' ')})`
      );
      showNotification('success', `Task #${task.id.slice(-4).toUpperCase()} approved.`);
      await loadData();
    } catch (err) {
      console.error('Failed to approve task', err);
      showNotification('error', 'Failed to approve task.');
    } finally {
      setProcessingTaskId(null);
    }
  };

  // Reject Task Submit
  const handleRejectSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!rejectingTask) return;
    if (!rejectReason.trim()) {
      showNotification('error', 'Please provide a rejection reason.');
      return;
    }

    try {
      setRejectSubmitting(true);
      await updateTaskStatus(
        rejectingTask.id,
        'rejected',
        currentUser.id,
        rejectReason.trim()
      );
      showNotification('success', `Task #${rejectingTask.id.slice(-4).toUpperCase()} rejected.`);
      setRejectingTask(null);
      setRejectReason('');
      await loadData();
    } catch (err) {
      console.error('Failed to reject task', err);
      showNotification('error', 'Failed to reject task.');
    } finally {
      setRejectSubmitting(false);
    }
  };

  // Mark Completed (Approved -> Completed)
  const handleMarkCompleted = async (task: Task) => {
    try {
      setProcessingTaskId(task.id);
      await updateTaskStatus(
        task.id,
        'completed',
        currentUser.id,
        `Marked completed by ${currentUser.name}`
      );
      showNotification('success', `Task #${task.id.slice(-4).toUpperCase()} marked as completed.`);
      await loadData();
    } catch (err) {
      console.error('Failed to mark task completed', err);
      showNotification('error', 'Failed to mark task completed.');
    } finally {
      setProcessingTaskId(null);
    }
  };

  // Available categories for create form based on chosen property
  const activeCreateCategories = isOwner
    ? categories.filter((c) => c.propertyId === createPropertyId)
    : categories;

  return (
    <div id="unified-task-management" className="space-y-6">
      {/* Header & Controls */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl p-5 md:p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-blue-400 uppercase tracking-wider mb-1">
              <ClipboardList className="w-4 h-4" />
              <span>Unified Operations</span>
            </div>
            <h1 className="text-xl md:text-2xl font-bold text-white flex items-center gap-2">
              Task Management
              {!isOwner && property && (
                <span className="text-sm font-normal px-2.5 py-0.5 rounded-full bg-slate-800 text-slate-300 border border-slate-700">
                  {property.name}
                </span>
              )}
            </h1>
            <p className="text-xs md:text-sm text-slate-400 mt-1">
              Create, review, approve vouchers, and track operational tasks across hostel branches.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            {/* Owner Property Filter */}
            {isOwner && properties.length > 0 && (
              <div className="flex items-center gap-2 bg-slate-800/80 border border-slate-700/80 rounded-xl px-3 py-2">
                <Filter className="w-4 h-4 text-blue-400 shrink-0" />
                <select
                  id="task-property-filter"
                  value={selectedPropertyId}
                  onChange={(e) => setSelectedPropertyId(e.target.value)}
                  className="bg-transparent text-xs md:text-sm text-slate-200 font-medium focus:outline-none cursor-pointer"
                >
                  <option value="all" className="bg-slate-900 text-slate-200">
                    All Properties ({properties.length})
                  </option>
                  {properties.map((p) => (
                    <option key={p.id} value={p.id} className="bg-slate-900 text-slate-200">
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>
            )}

            {/* Create Task Button */}
            <button
              id="btn-create-task-toggle"
              onClick={() => setShowCreateForm(!showCreateForm)}
              className="px-4 py-2.5 rounded-xl bg-blue-600 hover:bg-blue-500 text-white text-xs md:text-sm font-semibold flex items-center gap-2 transition cursor-pointer shadow-md shadow-blue-900/30"
            >
              {showCreateForm ? (
                <>
                  <ChevronUp className="w-4 h-4" />
                  Close Form
                </>
              ) : (
                <>
                  <PlusCircle className="w-4 h-4" />
                  Create Task
                </>
              )}
            </button>
          </div>
        </div>

        {/* Notifications */}
        {notification && (
          <div
            className={`mt-4 p-3.5 rounded-xl border flex items-center gap-2.5 text-xs md:text-sm transition-all ${
              notification.type === 'success'
                ? 'bg-emerald-950/40 border-emerald-800/60 text-emerald-300'
                : 'bg-rose-950/40 border-rose-800/60 text-rose-300'
            }`}
          >
            {notification.type === 'success' ? (
              <CheckCircle2 className="w-4 h-4 shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-400" />
            )}
            <span>{notification.message}</span>
          </div>
        )}

        {/* 1. TOP OF SCREEN: Create Task Form (Collapsible) */}
        {showCreateForm && (
          <form
            id="form-create-task"
            onSubmit={handleCreateTask}
            className="mt-5 p-5 bg-slate-950/80 border border-blue-900/40 rounded-2xl space-y-4"
          >
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-sm font-bold text-slate-200 flex items-center gap-2">
                <Sparkles className="w-4 h-4 text-blue-400" />
                Create New Task
              </h3>
              <span className="text-xs text-slate-400">
                Created as <span className="text-blue-300 capitalize">{currentUser.role.replace('_', ' ')}</span>
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Owner Property Picker */}
              {isOwner && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Target Property <span className="text-rose-400">*</span>
                  </label>
                  <select
                    id="create-task-property"
                    value={createPropertyId}
                    onChange={(e) => {
                      setCreatePropertyId(e.target.value);
                      setCreateCategoryId('');
                    }}
                    required
                    className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                  >
                    {properties.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} ({p.address})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Category Dropdown */}
              <div className={!isOwner ? 'md:col-span-2' : ''}>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Task Category <span className="text-rose-400">*</span>
                </label>
                <select
                  id="create-task-category"
                  value={createCategoryId}
                  onChange={(e) => setCreateCategoryId(e.target.value)}
                  required
                  className="w-full bg-slate-900 border border-slate-800 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="">-- Select Category --</option>
                  {activeCreateCategories.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* Description */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Task Description <span className="text-rose-400">*</span>
              </label>
              <textarea
                id="create-task-description"
                rows={3}
                value={createDescription}
                onChange={(e) => setCreateDescription(e.target.value)}
                placeholder="Describe the issue, required maintenance, or requested supplies..."
                required
                className="w-full bg-slate-900 border border-slate-800 rounded-xl p-3 text-xs md:text-sm text-slate-200 placeholder-slate-500 focus:outline-none focus:border-blue-500 resize-y"
              />
            </div>

            {/* Photo Upload (Data URL) */}
            <div>
              <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                Attach Photo (Optional)
              </label>
              <div className="flex flex-wrap items-center gap-3">
                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/*"
                  onChange={handleFileChange}
                  className="hidden"
                  id="create-task-photo-input"
                />
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="px-3.5 py-2 rounded-xl bg-slate-900 border border-slate-700 hover:border-slate-600 text-slate-300 text-xs font-medium flex items-center gap-2 cursor-pointer transition"
                >
                  <Camera className="w-4 h-4 text-blue-400" />
                  {createPhotoDataUrl ? 'Change Photo' : 'Upload / Capture Photo'}
                </button>

                {createPhotoDataUrl && (
                  <div className="flex items-center gap-2">
                    <img
                      src={createPhotoDataUrl}
                      alt="Preview"
                      className="w-10 h-10 rounded-lg object-cover border border-slate-700"
                    />
                    <button
                      type="button"
                      onClick={() => {
                        setCreatePhotoDataUrl(null);
                        if (fileInputRef.current) fileInputRef.current.value = '';
                      }}
                      className="p-1.5 rounded-lg bg-rose-950/40 text-rose-400 hover:bg-rose-900/50 transition cursor-pointer"
                      title="Remove Photo"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Submit & Cancel */}
            <div className="flex items-center justify-end gap-2.5 pt-2">
              <button
                type="button"
                onClick={() => setShowCreateForm(false)}
                className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={createSubmitting}
                className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
              >
                {createSubmitting ? (
                  <>
                    <Hourglass className="w-3.5 h-3.5 animate-spin" />
                    Creating...
                  </>
                ) : (
                  <>
                    <Send className="w-3.5 h-3.5" />
                    Submit Task
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>

      {/* 2. TABBED TASK LIST */}
      <div className="bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-xl">
        {/* Navigation Tabs */}
        <div className="flex items-center border-b border-slate-800 overflow-x-auto bg-slate-950/50 p-2 gap-1.5 scrollbar-thin">
          {/* Tab 1: Pending Review (created) */}
          <button
            id="tab-task-created"
            onClick={() => handleTabChange('created')}
            className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'created'
                ? 'bg-blue-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Clock className="w-3.5 h-3.5" />
            Pending Review
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === 'created'
                  ? 'bg-blue-800 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {tasks.filter((t) => t.status === 'created' && (isOwner && selectedPropertyId !== 'all' ? t.propertyId === selectedPropertyId : true)).length}
            </span>
          </button>

          {/* Tab 2: Pending Approval (pending_approval) with New Badge */}
          <button
            id="tab-task-pending-approval"
            onClick={() => handleTabChange('pending_approval')}
            className={`relative px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'pending_approval'
                ? 'bg-amber-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <Hourglass className="w-3.5 h-3.5" />
            Pending Approval
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === 'pending_approval'
                  ? 'bg-amber-800 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {totalPendingApprovalCount}
            </span>

            {/* New Badge */}
            {hasNewApprovalTasks && activeTab !== 'pending_approval' && (
              <span className="px-1.5 py-0.5 rounded-md bg-rose-500 text-white text-[10px] font-extrabold uppercase tracking-wide animate-pulse">
                New
              </span>
            )}
          </button>

          {/* Tab 3: Approved */}
          <button
            id="tab-task-approved"
            onClick={() => handleTabChange('approved')}
            className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'approved'
                ? 'bg-emerald-600 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CheckCheck className="w-3.5 h-3.5" />
            Approved
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === 'approved'
                  ? 'bg-emerald-800 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {tasks.filter((t) => t.status === 'approved' && (isOwner && selectedPropertyId !== 'all' ? t.propertyId === selectedPropertyId : true)).length}
            </span>
          </button>

          {/* Tab 4: Completed */}
          <button
            id="tab-task-completed"
            onClick={() => handleTabChange('completed')}
            className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'completed'
                ? 'bg-slate-700 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <CheckCircle2 className="w-3.5 h-3.5" />
            Completed
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === 'completed'
                  ? 'bg-slate-800 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {tasks.filter((t) => t.status === 'completed' && (isOwner && selectedPropertyId !== 'all' ? t.propertyId === selectedPropertyId : true)).length}
            </span>
          </button>

          {/* Tab 5: Rejected */}
          <button
            id="tab-task-rejected"
            onClick={() => handleTabChange('rejected')}
            className={`px-3.5 py-2 rounded-xl text-xs md:text-sm font-semibold flex items-center gap-2 transition whitespace-nowrap cursor-pointer ${
              activeTab === 'rejected'
                ? 'bg-rose-700 text-white shadow'
                : 'text-slate-400 hover:text-slate-200 hover:bg-slate-800/60'
            }`}
          >
            <XCircle className="w-3.5 h-3.5" />
            Rejected
            <span
              className={`px-2 py-0.5 rounded-full text-[11px] font-bold ${
                activeTab === 'rejected'
                  ? 'bg-rose-900 text-white'
                  : 'bg-slate-800 text-slate-400'
              }`}
            >
              {tasks.filter((t) => t.status === 'rejected' && (isOwner && selectedPropertyId !== 'all' ? t.propertyId === selectedPropertyId : true)).length}
            </span>
          </button>
        </div>

        {/* Tab Content List */}
        <div className="p-4 md:p-6">
          {loading ? (
            <div className="py-16 text-center text-slate-400 flex flex-col items-center justify-center gap-2">
              <Hourglass className="w-6 h-6 animate-spin text-blue-500" />
              <span className="text-sm">Loading task records...</span>
            </div>
          ) : currentTabTasks.length === 0 ? (
            <div className="py-16 text-center text-slate-500 border border-dashed border-slate-800 rounded-xl">
              <FileText className="w-10 h-10 mx-auto mb-2 text-slate-600" />
              <p className="text-sm font-medium text-slate-400">
                No tasks found in this tab.
              </p>
              <p className="text-xs text-slate-500 mt-1">
                Tasks will appear here as they transition through review and approval stages.
              </p>
            </div>
          ) : (
            <div className="space-y-4">
              {currentTabTasks.map((task) => {
                const voucher = vouchersMap[task.id];
                const paymentType = voucher?.paymentType || 'no_payment';
                const isProcessing = processingTaskId === task.id;

                return (
                  <div
                    key={task.id}
                    className="p-4 md:p-5 rounded-xl bg-slate-950/60 border border-slate-800 hover:border-slate-700/80 transition space-y-3.5"
                  >
                    {/* Top Row: Meta, Creator & Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-800/80 pb-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-slate-800 text-blue-300 border border-slate-700">
                          #{task.id.slice(-6).toUpperCase()}
                        </span>
                        <span className="text-xs font-semibold px-2 py-0.5 rounded bg-blue-950/80 text-blue-300 border border-blue-800/50">
                          {getCategoryName(task.categoryId)}
                        </span>
                        {isOwner && (
                          <span className="text-xs px-2 py-0.5 rounded bg-slate-800 text-slate-300 flex items-center gap-1">
                            <Building2 className="w-3 h-3 text-blue-400" />
                            {getPropertyName(task.propertyId)}
                          </span>
                        )}
                      </div>

                      <div className="text-xs text-slate-400 flex items-center gap-1.5">
                        <UserIcon className="w-3.5 h-3.5 text-slate-500" />
                        <span>Created by:</span>
                        <span className="font-semibold text-slate-200">
                          {getUserName(task.createdBy)}
                        </span>
                      </div>
                    </div>

                    {/* Middle Row: Description & Photo Thumbnail */}
                    <div className="flex flex-col md:flex-row items-start justify-between gap-4">
                      <div className="space-y-2 flex-1">
                        <p className="text-sm text-slate-200 leading-relaxed">
                          {task.description}
                        </p>

                        {/* Audit info */}
                        {task.lastActionNote && (
                          <div className="text-xs text-slate-400 bg-slate-900/90 rounded-lg p-2 border border-slate-800 flex items-start gap-1.5">
                            <Clock className="w-3.5 h-3.5 text-slate-500 mt-0.5 shrink-0" />
                            <div>
                              <span className="font-medium text-slate-300">
                                {task.lastActionBy ? `${getUserName(task.lastActionBy)}: ` : ''}
                              </span>
                              <span>{task.lastActionNote}</span>
                            </div>
                          </div>
                        )}
                      </div>

                      {/* Photo Thumbnail */}
                      {task.photoUrl && (
                        <div
                          onClick={() => setSelectedPhotoUrl(task.photoUrl)}
                          className="shrink-0 cursor-pointer group relative rounded-lg overflow-hidden border border-slate-700 bg-slate-900"
                        >
                          <img
                            src={task.photoUrl}
                            alt="Task Attachment"
                            className="w-20 h-20 md:w-24 md:h-24 object-cover group-hover:scale-105 transition"
                          />
                          <div className="absolute inset-0 bg-black/40 flex items-center justify-center opacity-0 group-hover:opacity-100 transition">
                            <ImageIcon className="w-5 h-5 text-white" />
                          </div>
                        </div>
                      )}
                    </div>

                    {/* Voucher Information Badge */}
                    <div className="pt-2 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80">
                      <div className="flex flex-wrap items-center gap-2 text-xs">
                        <Receipt className="w-4 h-4 text-slate-400 shrink-0" />
                        <span className="text-slate-400">Payment:</span>

                        {paymentType === 'no_payment' ? (
                          <span className="px-2 py-0.5 rounded bg-slate-800 text-slate-300 font-medium">
                            No Payment Required
                          </span>
                        ) : paymentType === 'petty_cash' ? (
                          <span className="px-2 py-0.5 rounded bg-emerald-950/80 text-emerald-300 border border-emerald-800/50 font-medium flex items-center gap-1">
                            <IndianRupee className="w-3 h-3" />
                            Petty Cash ({voucher?.amount !== null ? `₹${voucher?.amount}` : 'Amount pending'})
                          </span>
                        ) : (
                          <span className="px-2 py-0.5 rounded bg-purple-950/80 text-purple-300 border border-purple-800/50 font-medium flex items-center gap-1">
                            <IndianRupee className="w-3 h-3" />
                            Head Office ({voucher?.amount !== null ? `₹${voucher?.amount}` : 'Amount pending'})
                          </span>
                        )}

                        {/* Approver role indicator */}
                        {task.status === 'pending_approval' && (
                          <span className="text-[11px] text-amber-400/90 font-medium">
                            (Approver:{' '}
                            {paymentType === 'no_payment' ? 'Manager' : 'Owner'})
                          </span>
                        )}
                      </div>

                      {/* ACTIONS PER TAB & ROLE */}
                      <div className="flex flex-wrap items-center gap-2">
                        {/* 3. PENDING REVIEW TAB ACTIONS */}
                        {activeTab === 'created' && (
                          <>
                            {canEditDescription && (
                              <button
                                onClick={() => {
                                  setEditingTask(task);
                                  setEditDescriptionText(task.description);
                                }}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                              >
                                <Edit3 className="w-3.5 h-3.5 text-blue-400" />
                                Edit Note
                              </button>
                            )}

                            {canEditVoucher && (
                              <button
                                onClick={() => handleOpenVoucherModal(task)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                              >
                                <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                                Set Voucher
                              </button>
                            )}

                            {canMoveToApproval && (
                              <button
                                disabled={isProcessing}
                                onClick={() => handleMoveToApproval(task)}
                                className="px-3 py-1.5 rounded-lg bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition shadow"
                              >
                                {isProcessing ? (
                                  <Hourglass className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <ArrowRight className="w-3.5 h-3.5" />
                                )}
                                Move to Approval
                              </button>
                            )}
                          </>
                        )}

                        {/* 4. PENDING APPROVAL TAB ACTIONS */}
                        {activeTab === 'pending_approval' && (
                          <>
                            {/* Allow voucher edit if needed */}
                            {canEditVoucher && (
                              <button
                                onClick={() => handleOpenVoucherModal(task)}
                                className="px-2.5 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                              >
                                <Receipt className="w-3.5 h-3.5 text-emerald-400" />
                                Edit Voucher
                              </button>
                            )}

                            {/* Approve button based on PaymentType */}
                            {/* paymentType === 'no_payment': only Manager sees Approve */}
                            {/* paymentType === 'petty_cash' or 'head_office': only Owner sees Approve */}
                            {((paymentType === 'no_payment' && isManager) ||
                              (paymentType !== 'no_payment' && isOwner)) && (
                              <button
                                disabled={isProcessing}
                                onClick={() => handleApprove(task)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition shadow"
                              >
                                {isProcessing ? (
                                  <Hourglass className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <ThumbsUp className="w-3.5 h-3.5" />
                                )}
                                Approve
                              </button>
                            )}

                            {/* Reject button (Manager or Owner) */}
                            {(isManager || isOwner) && (
                              <button
                                onClick={() => {
                                  setRejectingTask(task);
                                  setRejectReason('');
                                }}
                                className="px-3 py-1.5 rounded-lg bg-rose-950/60 hover:bg-rose-900/60 border border-rose-800/50 text-rose-300 text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition"
                              >
                                <X className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            )}
                          </>
                        )}

                        {/* 5. APPROVED TAB ACTIONS */}
                        {activeTab === 'approved' && (
                          <>
                            {canMarkCompleted && (
                              <button
                                disabled={isProcessing}
                                onClick={() => handleMarkCompleted(task)}
                                className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-1.5 cursor-pointer transition shadow"
                              >
                                {isProcessing ? (
                                  <Hourglass className="w-3.5 h-3.5 animate-spin" />
                                ) : (
                                  <Check className="w-3.5 h-3.5" />
                                )}
                                Mark Completed
                              </button>
                            )}
                          </>
                        )}

                        {/* 6. COMPLETED & REJECTED TABS ARE READ-ONLY */}
                        {(activeTab === 'completed' || activeTab === 'rejected') && (
                          <span className="text-xs text-slate-500 font-medium italic">
                            Archived Record
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* MODAL 1: Edit Description */}
      {editingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-lg w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Edit3 className="w-4 h-4 text-blue-400" />
                Edit Task Note / Description
              </h3>
              <button
                onClick={() => setEditingTask(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveDescription} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Task Description
                </label>
                <textarea
                  rows={4}
                  value={editDescriptionText}
                  onChange={(e) => setEditDescriptionText(e.target.value)}
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs md:text-sm text-slate-200 focus:outline-none focus:border-blue-500 resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingTask(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editDescriptionSubmitting}
                  className="px-4 py-2 rounded-xl bg-blue-600 hover:bg-blue-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
                >
                  {editDescriptionSubmitting ? (
                    <Hourglass className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Save Changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 2: Set / Edit Voucher */}
      {editingVoucherTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <Receipt className="w-4 h-4 text-emerald-400" />
                Voucher & Payment Setup
              </h3>
              <button
                onClick={() => setEditingVoucherTask(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSaveVoucher} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Payment Type
                </label>
                <select
                  value={voucherPaymentType}
                  onChange={(e) => setVoucherPaymentType(e.target.value as PaymentType)}
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl px-3 py-2 text-xs md:text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                >
                  <option value="no_payment">No Payment (Manager Approves)</option>
                  <option value="petty_cash">Petty Cash (Owner Approves)</option>
                  <option value="head_office">Head Office (Owner Approves)</option>
                </select>
              </div>

              {voucherPaymentType !== 'no_payment' && (
                <div>
                  <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                    Amount (₹ INR) <span className="text-rose-400">*</span>
                  </label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-slate-400">
                      <IndianRupee className="w-4 h-4" />
                    </div>
                    <input
                      type="number"
                      step="0.01"
                      min="0.01"
                      value={voucherAmount}
                      onChange={(e) => setVoucherAmount(e.target.value)}
                      placeholder="e.g. 850"
                      required
                      className="w-full bg-slate-950 border border-slate-800 rounded-xl pl-9 pr-3 py-2 text-xs md:text-sm text-slate-200 focus:outline-none focus:border-blue-500"
                    />
                  </div>
                </div>
              )}

              <p className="text-[11px] text-slate-400 bg-slate-950/60 p-2.5 rounded-lg border border-slate-800">
                {voucherPaymentType === 'no_payment'
                  ? 'No cash disbursement. This task is approved directly by the Hostel Manager.'
                  : 'Requires funds disbursement. This task will require the Owner to approve payment.'}
              </p>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingVoucherTask(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={voucherSubmitting}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
                >
                  {voucherSubmitting ? (
                    <Hourglass className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <Check className="w-3.5 h-3.5" />
                  )}
                  Save Voucher
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 3: Rejection Reason */}
      {rejectingTask && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl max-w-md w-full p-5 space-y-4 shadow-2xl">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="text-base font-bold text-white flex items-center gap-2">
                <XCircle className="w-4 h-4 text-rose-400" />
                Reject Task #{rejectingTask.id.slice(-6).toUpperCase()}
              </h3>
              <button
                onClick={() => setRejectingTask(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleRejectSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-300 mb-1.5">
                  Reason for Rejection <span className="text-rose-400">*</span>
                </label>
                <textarea
                  rows={3}
                  value={rejectReason}
                  onChange={(e) => setRejectReason(e.target.value)}
                  placeholder="Explain why this task or voucher was rejected..."
                  required
                  className="w-full bg-slate-950 border border-slate-800 rounded-xl p-3 text-xs md:text-sm text-slate-200 focus:outline-none focus:border-rose-500 resize-y"
                />
              </div>

              <div className="flex items-center justify-end gap-2.5 pt-2">
                <button
                  type="button"
                  onClick={() => setRejectingTask(null)}
                  className="px-3.5 py-2 rounded-xl bg-slate-800 text-slate-300 hover:bg-slate-700 text-xs font-semibold transition cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={rejectSubmitting}
                  className="px-4 py-2 rounded-xl bg-rose-600 hover:bg-rose-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2 transition cursor-pointer"
                >
                  {rejectSubmitting ? (
                    <Hourglass className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <X className="w-3.5 h-3.5" />
                  )}
                  Confirm Rejection
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL 4: Full Photo Viewer */}
      {selectedPhotoUrl && (
        <div
          onClick={() => setSelectedPhotoUrl(null)}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/90 backdrop-blur-md animate-in fade-in duration-150"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative max-w-3xl w-full bg-slate-900 border border-slate-800 rounded-2xl overflow-hidden shadow-2xl"
          >
            <div className="flex items-center justify-between p-3.5 bg-slate-950 border-b border-slate-800">
              <span className="text-xs font-semibold text-slate-300 flex items-center gap-1.5">
                <ImageIcon className="w-4 h-4 text-blue-400" />
                Attached Photo
              </span>
              <button
                onClick={() => setSelectedPhotoUrl(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-800 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <div className="p-3 bg-black flex items-center justify-center max-h-[75vh] overflow-auto">
              <img
                src={selectedPhotoUrl}
                alt="Task attachment full"
                className="max-h-[70vh] w-auto object-contain rounded-lg"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
