import { User } from 'firebase/auth';
import { Clock, Download, FileArchive, UploadCloud, KeyRound } from 'lucide-react';
import React, { useEffect, useMemo, useState } from 'react';
import { AlertBanner } from './components/AlertBanner';
import { AIAssistantView } from './components/AIAssistantView';
import { ConfirmDialog } from './components/ConfirmDialog';
import { DashboardView } from './components/DashboardView';
import { DriverModal } from './components/DriverModal';
import { DriverModeView } from './components/DriverModeView';
import { DriversSheetView } from './components/DriversSheetView';
import { FuelSheetView } from './components/FuelSheetView';
import { GoogleSheetsSyncModal } from './components/GoogleSheetsSyncModal';
import { LocationModal } from './components/LocationModal';
import { LocationsSheetView } from './components/LocationsSheetView';
import { MaintenanceModal } from './components/MaintenanceModal';
import { MaintenanceSheetView } from './components/MaintenanceSheetView';
import { MobileBottomNav } from './components/MobileBottomNav';
import { MonthlyReportView } from './components/MonthlyReportView';
import { Navbar } from './components/Navbar';
import { DailyEmailModal } from './components/DailyEmailModal';
import { NotificationSettingsModal } from './components/NotificationSettingsModal';
import { NotificationToastBanner } from './components/NotificationToastBanner';
import { OfflineIndicator } from './components/OfflineIndicator';
import { PWAInstallButton } from './components/PWAInstallButton';
import { ReportsView } from './components/ReportsView';
import { TabsHeader } from './components/TabsHeader';
import { ToastContainer, ToastMessage } from './components/Toast';
import { TripModal } from './components/TripModal';
import { TripsSheetView } from './components/TripsSheetView';
import { UsersManagementView } from './components/UsersManagementView';
import { VehicleModal } from './components/VehicleModal';
import { VehiclesSheetView } from './components/VehiclesSheetView';
import { Header } from './components/Header';
import { Sidebar } from './components/Sidebar';
import { GlobalSearchModal } from './components/GlobalSearchModal';
import { OperationsView } from './components/OperationsView';
import { FleetView } from './components/FleetView';
import { PeopleView } from './components/PeopleView';
import { HierarchicalLocationsView } from './components/HierarchicalLocationsView';
import { AutomationView } from './components/AutomationView';
import { NotificationsCenterView } from './components/NotificationsCenterView';
import { AICenterView } from './components/AICenterView';
import { SettingsView } from './components/SettingsView';
import { Dashboard as SalesDashboard } from './components/sales';
import { ZipUploadModal } from './components/ZipUploadModal';
import { LoginModal } from './components/auth/LoginModal';
import { ExtractedFleetData } from './utils/zipHandler';
import { INITIAL_FUEL_RECORDS } from './data/fuelData';
import {
  INITIAL_DRIVERS,
  INITIAL_MAINTENANCE,
  INITIAL_TRIPS,
  INITIAL_VEHICLES,
} from './data/initialData';
import { DEFAULT_REGIONS, INITIAL_LOCATIONS } from './data/locationsData';
import {
  DEFAULT_COMPANIES,
  DEFAULT_AREAS,
  DEFAULT_BRANCHES,
  INITIAL_VEHICLE_DOCUMENTS,
  INITIAL_AUTOMATION_RULES,
  INITIAL_AUTOMATION_EXECUTIONS,
  INITIAL_NOTIFICATIONS,
  INITIAL_AUDIT_LOGS,
  INITIAL_OPERATION_TASKS,
  ROLE_PERMISSIONS_MAP,
} from './data/operationsData';
import {
  authorizeGoogleSheets,
  getStoredGoogleToken,
  listenToAuthChanges,
  signInWithGoogle,
  signOutUser,
} from './services/authService';
import {
  clearAllDriversFromCloud,
  clearAllTripsFromCloud,
  createOrInviteUserAccount,
  deleteDriverFromCloud,
  deleteFuelFromCloud,
  deleteLocationFromCloud,
  deleteMaintenanceFromCloud,
  deleteMultipleDriversFromCloud,
  deleteMultipleTripsFromCloud,
  deleteTripFromCloud,
  deleteUserAccount,
  deleteVehicleFromCloud,
  listenToCompanyFleetData,
  listenToCompanyTasks,
  listenToCompanyVehicleDocuments,
  listenToCompanyAutomationRules,
  listenToCompanyAutomationExecutions,
  listenToCompanyNotifications,
  listenToCompanyAuditLogs,
  listenToUsers,
  saveDriverToCloud,
  saveFuelToCloud,
  saveLocationToCloud,
  saveMaintenanceToCloud,
  saveTripToCloud,
  saveVehicleToCloud,
  saveTaskToCloud,
  deleteTaskFromCloud,
  saveVehicleDocumentToCloud,
  deleteVehicleDocumentFromCloud,
  saveAutomationRuleToCloud,
  deleteAutomationRuleFromCloud,
  saveAutomationExecutionToCloud,
  saveNotificationToCloud,
  deleteNotificationFromCloud,
  saveAuditLogToCloud,
  seedInitialFleetDataIfEmpty,
  syncUserProfile,
  testFirestoreConnection,
  updateUserDetails,
  updateUserRole,
} from './services/firestoreService';
import { migrationService } from './services/migrationService';
import { automationService } from './services/automationService';
import { startOfflineSyncListener } from './services/offlineSyncService';
import {
  exportFleetToXLSX,
  getSpreadsheetId,
  syncFleetToGoogleSheets,
} from './services/googleSheetsService';
import {
  dispatchNotification,
  getStoredNotificationSettings,
  saveStoredNotificationSettings,
  scanAndDispatchOilAlerts,
} from './services/notificationService';
import {
  syncFleetStateToServer,
  getStoredDailyEmailConfig,
  sendDailyEmailNow,
} from './services/dailyEmailService';
import {
  AreaItem,
  AutomationExecution,
  AutomationRule,
  AuditLog,
  AppNotification,
  BranchItem,
  Company,
  Driver,
  FuelRecord,
  LocationPlace,
  MaintenanceRecord,
  OperationTask,
  RegionItem,
  TabKey,
  TripRoute,
  UserNotificationPreferences,
  UserProfile,
  UserRole,
  UserStatus,
  Vehicle,
  VehicleDocument,
} from './types';
import { generateFleetAlerts } from './utils/alertEngine';
import { generateMonthlyReport } from './utils/reportEngine';

export default function App() {
  // 1. Data States (initialized from localStorage with fallback to rich initial data)
  const [vehicles, setVehicles] = useState<Vehicle[]>(() => {
    const saved = localStorage.getItem('fleet_vehicles');
    return saved ? JSON.parse(saved) : INITIAL_VEHICLES;
  });

  const [drivers, setDrivers] = useState<Driver[]>(() => {
    const saved = localStorage.getItem('fleet_drivers');
    return saved ? JSON.parse(saved) : INITIAL_DRIVERS;
  });

  const [trips, setTrips] = useState<TripRoute[]>(() => {
    const saved = localStorage.getItem('fleet_trips');
    return saved ? JSON.parse(saved) : INITIAL_TRIPS;
  });

  const [maintenance, setMaintenance] = useState<MaintenanceRecord[]>(() => {
    const saved = localStorage.getItem('fleet_maintenance');
    return saved ? JSON.parse(saved) : INITIAL_MAINTENANCE;
  });

  const [locations, setLocations] = useState<LocationPlace[]>(() => {
    try {
      const saved = localStorage.getItem('fleet_locations_v1');
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          return parsed.map((loc: LocationPlace) => {
            const initial = INITIAL_LOCATIONS.find((il) => il.id === loc.id || il.code === loc.code);
            const coords =
              loc.coordinates ||
              (loc.latitude && loc.longitude
                ? ([loc.latitude, loc.longitude] as [number, number])
                : initial?.coordinates);
            return {
              ...loc,
              coordinates: coords,
              latitude: loc.latitude ?? (coords ? coords[0] : initial?.latitude),
              longitude: loc.longitude ?? (coords ? coords[1] : initial?.longitude),
            };
          });
        }
      }
    } catch (e) {
      console.error(e);
    }
    return INITIAL_LOCATIONS;
  });

  const [fuelRecords, setFuelRecords] = useState<FuelRecord[]>(() => {
    try {
      const saved = localStorage.getItem('fleet_fuel_records_v1');
      if (saved) return JSON.parse(saved);
    } catch (e) {
      console.error(e);
    }
    return INITIAL_FUEL_RECORDS;
  });

  const availableRegions = useMemo(() => {
    return ['الإسكندرية', 'الساحل الشمالي', 'البحيرة'];
  }, []);

  // 2. Navigation & UI state (defaults to Sales Support Dashboard)
  const [activeTab, setActiveTab] = useState<TabKey>('sales');
  const [user, setUser] = useState<User | null>(null);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
  const [isOnlineCloud, setIsOnlineCloud] = useState(true);
  const [isLoggingIn, setIsLoggingIn] = useState(false);
  const [isSyncingSheets, setIsSyncingSheets] = useState(false);

  // Sync result modal state
  const [syncSuccessModalOpen, setSyncSuccessModalOpen] = useState(false);
  const [spreadsheetUrl, setSpreadsheetUrl] = useState<string | null>(null);

  // Modals state
  const [isTripModalOpen, setIsTripModalOpen] = useState(false);
  const [editingTrip, setEditingTrip] = useState<TripRoute | null>(null);
  const [presetTripPlace, setPresetTripPlace] = useState<{ name: string; region: string } | null>(
    null
  );

  const [isVehicleModalOpen, setIsVehicleModalOpen] = useState(false);
  const [editingVehicle, setEditingVehicle] = useState<Vehicle | null>(null);

  const [isDriverModalOpen, setIsDriverModalOpen] = useState(false);
  const [editingDriver, setEditingDriver] = useState<Driver | null>(null);

  const [isMaintModalOpen, setIsMaintModalOpen] = useState(false);
  const [editingMaint, setEditingMaint] = useState<MaintenanceRecord | null>(null);
  const [presetVehicleIdForMaint, setPresetVehicleIdForMaint] = useState<string | null>(null);

  const [isLocationModalOpen, setIsLocationModalOpen] = useState(false);
  const [editingLocation, setEditingLocation] = useState<LocationPlace | null>(null);

  const [isNotificationModalOpen, setIsNotificationModalOpen] = useState(false);
  const [isDailyEmailModalOpen, setIsDailyEmailModalOpen] = useState(false);
  const [isZipUploadModalOpen, setIsZipUploadModalOpen] = useState(false);
  const [activeToastBanner, setActiveToastBanner] = useState<{
    title: string;
    body: string;
    vehicleId?: string;
  } | null>(null);

  // Enterprise Multi-Company & Operations State
  const [companies, setCompanies] = useState<Company[]>(() => {
    const saved = localStorage.getItem('fleet_companies');
    return saved ? JSON.parse(saved) : DEFAULT_COMPANIES;
  });
  const [currentCompanyId, setCurrentCompanyId] = useState<string>(() => {
    return localStorage.getItem('fleet_current_company_id') || 'company-01';
  });
  const currentCompany = useMemo(() => {
    return companies.find((c) => c.id === currentCompanyId) || companies[0] || DEFAULT_COMPANIES[0];
  }, [companies, currentCompanyId]);

  const [tasks, setTasks] = useState<OperationTask[]>(() => {
    const saved = localStorage.getItem('fleet_tasks');
    return saved ? JSON.parse(saved) : INITIAL_OPERATION_TASKS;
  });

  const [vehicleDocuments, setVehicleDocuments] = useState<VehicleDocument[]>(() => {
    const saved = localStorage.getItem('fleet_vehicle_documents');
    return saved ? JSON.parse(saved) : INITIAL_VEHICLE_DOCUMENTS;
  });

  const [automationRules, setAutomationRules] = useState<AutomationRule[]>(() => {
    const saved = localStorage.getItem('fleet_automation_rules');
    return saved ? JSON.parse(saved) : INITIAL_AUTOMATION_RULES;
  });

  const [automationExecutions, setAutomationExecutions] = useState<AutomationExecution[]>(() => {
    const saved = localStorage.getItem('fleet_automation_executions');
    return saved ? JSON.parse(saved) : INITIAL_AUTOMATION_EXECUTIONS;
  });

  const [notifications, setNotifications] = useState<AppNotification[]>(() => {
    const saved = localStorage.getItem('fleet_notifications');
    return saved ? JSON.parse(saved) : INITIAL_NOTIFICATIONS;
  });

  const [notificationPrefs, setNotificationPrefs] = useState<UserNotificationPreferences>(() => {
    const saved = localStorage.getItem('fleet_notification_prefs');
    return saved
      ? JSON.parse(saved)
      : {
          emailNotifications: true,
          inAppAlerts: true,
          overdueTaskAlerts: true,
          maintenanceDueAlerts: true,
          documentExpiryAlerts: true,
          automationExecutionAlerts: true,
          maintenanceDueKmThreshold: 500,
          documentExpiryDaysThreshold: 30,
        };
  });

  const [auditLogs, setAuditLogs] = useState<AuditLog[]>(() => {
    const saved = localStorage.getItem('fleet_audit_logs');
    return saved ? JSON.parse(saved) : INITIAL_AUDIT_LOGS;
  });

  const [areas] = useState<AreaItem[]>(DEFAULT_AREAS);
  const [branches] = useState<BranchItem[]>(DEFAULT_BRANCHES);

  const regions: RegionItem[] = useMemo(() => {
    return DEFAULT_REGIONS.map((r, idx) => ({
      id: `reg-${idx + 1}`,
      companyId: currentCompany.id,
      name: r.name,
      nameAr: r.name,
      code: `REG-0${idx + 1}`,
      status: 'نشط',
      description: r.description,
      color: r.color,
      areasCount: 2,
      locationsCount: 6,
    }));
  }, [currentCompany.id]);

  // Role switching (allow previewing different roles or taking profile role)
  const [effectiveRole, setEffectiveRole] = useState<UserRole>('SUPER_ADMIN');

  useEffect(() => {
    if (userProfile?.role) {
      setEffectiveRole(userProfile.role);
    }
  }, [userProfile?.role]);

  const canEdit = useMemo(() => {
    const perms = ROLE_PERMISSIONS_MAP[effectiveRole] || [];
    return (
      perms.includes('tasks.edit') ||
      perms.includes('fleet.edit') ||
      perms.includes('sales.edit') ||
      effectiveRole === 'SUPER_ADMIN' ||
      effectiveRole === 'COMPANY_ADMIN' ||
      effectiveRole === 'admin'
    );
  }, [effectiveRole]);

  const canDelete = useMemo(() => {
    const perms = ROLE_PERMISSIONS_MAP[effectiveRole] || [];
    return (
      perms.includes('sales.delete') ||
      perms.includes('fleet.delete') ||
      effectiveRole === 'SUPER_ADMIN' ||
      effectiveRole === 'COMPANY_ADMIN' ||
      effectiveRole === 'OPERATIONS_MANAGER'
    );
  }, [effectiveRole]);

  const canManageUsers = useMemo(() => {
    const perms = ROLE_PERMISSIONS_MAP[effectiveRole] || [];
    return (
      perms.includes('users.manage') ||
      effectiveRole === 'SUPER_ADMIN' ||
      effectiveRole === 'COMPANY_ADMIN' ||
      effectiveRole === 'admin'
    );
  }, [effectiveRole]);

  // Dark mode
  const [darkMode, setDarkMode] = useState<boolean>(() => {
    return localStorage.getItem('fleet_theme') === 'dark';
  });

  useEffect(() => {
    if (darkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('fleet_theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('fleet_theme', 'light');
    }
  }, [darkMode]);

  // Sidebar & Modals
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState<boolean>(false);
  const [isMobileSidebarOpen, setIsMobileSidebarOpen] = useState<boolean>(false);
  const [isSearchOpen, setIsSearchOpen] = useState<boolean>(false);
  const [isLoginModalOpen, setIsLoginModalOpen] = useState<boolean>(false);

  // Global Ctrl+K Search Listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  // Toast & Safe In-App Confirmation Dialog State (replacing raw window.confirm)
  const [toasts, setToasts] = useState<ToastMessage[]>([]);
  const [confirmDialog, setConfirmDialog] = useState<{
    isOpen: boolean;
    title: string;
    message: string;
    confirmText?: string;
    danger?: boolean;
    onConfirm: () => void;
  }>({
    isOpen: false,
    title: '',
    message: '',
    onConfirm: () => {},
  });

  const showToast = (
    title: string,
    description?: string,
    type: 'success' | 'error' | 'info' = 'success'
  ) => {
    const id = `toast-${Date.now()}-${Math.random()}`;
    setToasts((prev) => [...prev, { id, title, description, type }]);
  };

  const handleDismissToast = (id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  };

  const openConfirm = (params: {
    title: string;
    message: string;
    confirmText?: string;
    danger?: boolean;
    onConfirm: () => void;
  }) => {
    setConfirmDialog({
      isOpen: true,
      ...params,
    });
  };

  // Selected Month for Reports
  const [selectedMonth, setSelectedMonth] = useState<string>('all');

  // Persist to local storage
  useEffect(() => {
    localStorage.setItem('fleet_vehicles', JSON.stringify(vehicles));
  }, [vehicles]);

  useEffect(() => {
    localStorage.setItem('fleet_drivers', JSON.stringify(drivers));
  }, [drivers]);

  useEffect(() => {
    localStorage.setItem('fleet_trips', JSON.stringify(trips));
  }, [trips]);

  useEffect(() => {
    localStorage.setItem('fleet_maintenance', JSON.stringify(maintenance));
  }, [maintenance]);

  useEffect(() => {
    localStorage.setItem('fleet_locations_v1', JSON.stringify(locations));
  }, [locations]);

  useEffect(() => {
    localStorage.setItem('fleet_fuel_records_v1', JSON.stringify(fuelRecords));
  }, [fuelRecords]);

  useEffect(() => {
    localStorage.setItem('fleet_companies', JSON.stringify(companies));
  }, [companies]);

  useEffect(() => {
    localStorage.setItem('fleet_current_company_id', currentCompanyId);
  }, [currentCompanyId]);

  useEffect(() => {
    localStorage.setItem('fleet_tasks', JSON.stringify(tasks));
  }, [tasks]);

  useEffect(() => {
    localStorage.setItem('fleet_vehicle_documents', JSON.stringify(vehicleDocuments));
  }, [vehicleDocuments]);

  useEffect(() => {
    localStorage.setItem('fleet_automation_rules', JSON.stringify(automationRules));
  }, [automationRules]);

  useEffect(() => {
    localStorage.setItem('fleet_automation_executions', JSON.stringify(automationExecutions));
  }, [automationExecutions]);

  useEffect(() => {
    localStorage.setItem('fleet_notifications', JSON.stringify(notifications));
  }, [notifications]);

  useEffect(() => {
    localStorage.setItem('fleet_notification_prefs', JSON.stringify(notificationPrefs));
  }, [notificationPrefs]);

  useEffect(() => {
    localStorage.setItem('fleet_audit_logs', JSON.stringify(auditLogs));
  }, [auditLogs]);

  // Online & Firestore initialization + Offline synchronization listener
  useEffect(() => {
    testFirestoreConnection().then((connected) => {
      setIsOnlineCloud(connected);
    });

    // Start offline sync listener (auto-flushes queued mutations when connection is restored)
    const cleanupOfflineSync = startOfflineSyncListener((syncedCount) => {
      showToast('مزامنة البيانات غير المتصلة', `تمت مزامنة ${syncedCount} من العمليات المؤجلة بنجاح مع السحابة`, 'success');
    });

    return () => {
      cleanupOfflineSync();
    };
  }, []);

  // Auth observer & User Profile Sync
  useEffect(() => {
    const unsubscribe = listenToAuthChanges(async (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        try {
          const profile = await syncUserProfile(currentUser);
          setUserProfile(profile);
          setIsOnlineCloud(true);
        } catch (err) {
          console.warn('Could not sync user profile:', err);
        }
      } else {
        setUserProfile(null);
      }
    });
    return () => unsubscribe();
  }, []);

  // Real-time synchronization of company fleet data, tasks, and automation rules
  useEffect(() => {
    if (!user) {
      setAllUsers([]);
      return;
    }

    const activeCompanyId = currentCompanyId || 'company-01';

    // Seed initial fleet data to cloud if collections are empty
    seedInitialFleetDataIfEmpty({
      vehicles,
      drivers,
      trips,
      maintenance,
      locations,
    });

    // Check and execute seamless multi-tenant migration of legacy root documents to company subcollection
    migrationService
      .migrateLegacyFleetDataToCompany(activeCompanyId)
      .then((status) => {
        if (status.migratedRecords > 0) {
          console.log(`[Migration] Successfully transferred ${status.migratedRecords} records to company ${activeCompanyId}`);
        }
      })
      .catch((err) => console.warn('Background migration check notice:', err));

    // Multi-tenant real-time subscriptions
    const unsubFleet = listenToCompanyFleetData(activeCompanyId, {
      onVehicles: (v) => setVehicles(v),
      onDrivers: (d) => setDrivers(d),
      onTrips: (t) => setTrips(t),
      onMaintenance: (m) => setMaintenance(m),
      onLocations: (l) => setLocations(l),
      onFuel: (f) => setFuelRecords(f),
    });

    const unsubTasks = listenToCompanyTasks(activeCompanyId, (taskList) => {
      if (taskList && taskList.length > 0) {
        setTasks(taskList);
      }
    });

    const unsubDocs = listenToCompanyVehicleDocuments(activeCompanyId, (docsList) => {
      if (docsList && docsList.length > 0) {
        setVehicleDocuments(docsList);
      }
    });

    const unsubRules = listenToCompanyAutomationRules(activeCompanyId, (rulesList) => {
      if (rulesList && rulesList.length > 0) {
        setAutomationRules(rulesList);
      }
    });

    const unsubExecs = listenToCompanyAutomationExecutions(activeCompanyId, (execsList) => {
      if (execsList && execsList.length > 0) {
        setAutomationExecutions(execsList);
      }
    });

    const unsubNotifs = listenToCompanyNotifications(activeCompanyId, (notifsList) => {
      if (notifsList && notifsList.length > 0) {
        setNotifications(notifsList);
      }
    });

    const unsubAudit = listenToCompanyAuditLogs(activeCompanyId, (logsList) => {
      if (logsList && logsList.length > 0) {
        setAuditLogs(logsList);
      }
    });

    const unsubUsers = listenToUsers((userList) => {
      setAllUsers(userList);
      const myProfile = userList.find((u) => u.uid === user.uid);
      if (myProfile) {
        setUserProfile(myProfile);
      }
    });

    return () => {
      unsubFleet();
      unsubTasks();
      unsubDocs();
      unsubRules();
      unsubExecs();
      unsubNotifs();
      unsubAudit();
      unsubUsers();
    };
  }, [user, currentCompanyId]);

  // Fleet Alerts Engine (calculates maintenance & license expiration alerts dynamically)
  const alerts = useMemo(() => {
    return generateFleetAlerts(vehicles, drivers, trips, maintenance);
  }, [vehicles, drivers, trips, maintenance]);

  // Available months for filtering reports
  const availableMonths = useMemo(() => {
    const set = new Set<string>();
    trips.forEach((t) => set.add(t.date.substring(0, 7)));
    maintenance.forEach((m) => set.add(m.date.substring(0, 7)));
    return Array.from(set).sort().reverse();
  }, [trips, maintenance]);

  // Generate monthly report data
  const reportData = useMemo(() => {
    return generateMonthlyReport(vehicles, trips, maintenance, selectedMonth);
  }, [vehicles, trips, maintenance, selectedMonth]);

  // Automated Oil Change Proximity Push Notification Scanner for Fleet Manager
  useEffect(() => {
    if (!vehicles || vehicles.length === 0) return;

    // Scan vehicles against oil change threshold and dispatch push notification to manager's phone
    const timer = setTimeout(() => {
      scanAndDispatchOilAlerts(
        vehicles,
        userProfile,
        (title, body, vehicleId) => {
          setActiveToastBanner({ title, body, vehicleId });
        },
        false // throttled automatic check
      );
    }, 1500);

    return () => clearTimeout(timer);
  }, [vehicles, userProfile]);

  // Push Notification Scheduler Effect (Daily reminders & periodic oil checks)
  useEffect(() => {
    const checkNotificationSchedule = () => {
      const settings = getStoredNotificationSettings();
      if (!settings.enabled) return;

      const now = new Date();
      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();
      const todayDateString = now.toISOString().split('T')[0];

      if (
        currentHour === settings.dailyReminderHour &&
        currentMinute === settings.dailyReminderMinute &&
        settings.lastFiredDate !== todayDateString
      ) {
        const title = '🚚 تذكير أسطول مصنع برج العرب';
        const body =
          'تذكير يومي: يرجى مراجعة المهام المسجلة، وإدخال بيانات الرحلات الجديدة وتحديث عدادات الشاحنات.';
        dispatchNotification(title, body, 'reminder', (t, b, vId) => {
          setActiveToastBanner({ title: t, body: b, vehicleId: vId });
        });
        saveStoredNotificationSettings({
          ...settings,
          lastFiredDate: todayDateString,
        });
      }

      // Also trigger oil check periodically in the background
      if (settings.oilAlertsEnabled && vehicles.length > 0) {
        scanAndDispatchOilAlerts(
          vehicles,
          userProfile,
          (t, b, vId) => {
            setActiveToastBanner({ title: t, body: b, vehicleId: vId });
          },
          false
        );
      }
    };

    const interval = setInterval(checkNotificationSchedule, 30000); // every 30s
    return () => clearInterval(interval);
  }, [vehicles, userProfile]);

  // Automated background sync of fleet state to server so background EOD cron can dispatch email
  useEffect(() => {
    const timer = setTimeout(() => {
      syncFleetStateToServer({
        vehicles,
        drivers,
        trips,
        maintenance,
        fuelRecords,
        alerts,
        monthlyReport: reportData,
      });
    }, 1500);
    return () => clearTimeout(timer);
  }, [vehicles, drivers, trips, maintenance, fuelRecords, alerts, reportData]);

  // Client-side End-of-Day auto-mailer checker (runs every 60s while app is open)
  useEffect(() => {
    const checkSchedule = async () => {
      const emailConfig = await getStoredDailyEmailConfig();
      if (!emailConfig.enabled) return;

      const now = new Date();
      const todayStr = now.toISOString().split('T')[0];
      if (emailConfig.lastSentDate === todayStr) return;

      // Throttle auto-attempts: if already attempted recently (within 30 mins) and failed, don't spam
      const lastAttemptTimestamp = sessionStorage.getItem('last_auto_email_attempt');
      if (lastAttemptTimestamp && Date.now() - Number(lastAttemptTimestamp) < 30 * 60 * 1000) {
        return;
      }

      const currentHour = now.getHours();
      const currentMinute = now.getMinutes();

      if (
        currentHour > emailConfig.scheduleHour ||
        (currentHour === emailConfig.scheduleHour && currentMinute >= emailConfig.scheduleMinute)
      ) {
        sessionStorage.setItem('last_auto_email_attempt', String(Date.now()));
        try {
          const res = await sendDailyEmailNow({
            vehicles,
            drivers,
            trips,
            maintenance,
            fuelRecords,
            alerts,
            monthlyReport: reportData,
          });
          if (res.success) {
            showToast(
              '📧 تقرير نهاية اليوم الآلي',
              `تم إرسال التقرير اليومي المجمع لجميع الشيتات بنجاح إلى: ${res.recipients.join(', ')}`,
              'success'
            );
          }
        } catch (err) {
          console.warn('Auto email dispatch attempt noted:', err);
        }
      }
    };

    checkSchedule();
    const interval = setInterval(checkSchedule, 60000);
    return () => clearInterval(interval);
  }, [vehicles, drivers, trips, maintenance, fuelRecords, alerts, reportData]);

  // ----------------------------------------------------
  // Auth & Google Sheets Handlers
  // ----------------------------------------------------
  const handleLogin = () => {
    setIsLoginModalOpen(true);
  };

  const handleLogout = async () => {
    try {
      await signOutUser();
      showToast('تم تسجيل الخروج', 'تم تسجيل الخروج من حسابك بنجاح');
      setIsLoginModalOpen(true);
    } catch (err: any) {
      console.error(err);
    }
  };

  const handleSyncToSheets = async () => {
    if (!user) {
      await handleLogin();
      return;
    }

    setIsSyncingSheets(true);
    try {
      let token = getStoredGoogleToken();
      if (!token) {
        token = await authorizeGoogleSheets();
      }

      const result = await syncFleetToGoogleSheets(
        {
          vehicles,
          drivers,
          trips,
          maintenance,
          fuelRecords,
          locations,
        },
        token
      );
      const url = result.spreadsheetUrl;
      setSpreadsheetUrl(url);
      setSyncSuccessModalOpen(true);
      showToast('تمت المزامنة بنجاح', 'تم تحديث شيتات Google Sheets بكافة البيانات');
    } catch (err: any) {
      console.error('Sync error:', err);
      const msg = err?.message || '';
      if (msg.includes('403') || msg.includes('access_denied') || err?.code === 'auth/popup-closed-by-user') {
        showToast(
          'تنبيه تصريح Google Sheets',
          'يتطلب ربط Google Sheets إضافة البريد كمختبر في Google Cloud، أو يمكنك استخدام زر (Excel) لتحميل الملف فوراً.',
          'info'
        );
      } else {
        showToast('تعذر المزامنة مع Google Sheets', msg || 'يرجى إعادة المحاولة', 'error');
      }
    } finally {
      setIsSyncingSheets(false);
    }
  };

  const handleExportLocal = () => {
    try {
      exportFleetToXLSX({
        vehicles,
        drivers,
        trips,
        maintenance,
        fuelRecords,
        locations,
      });
      showToast('تم تصدير ملف Excel', 'تم تحميل ملف .xlsx بنجاح على جهازك (7 شيتات متناسقة)');
    } catch (err: any) {
      console.error(err);
      showToast('خطأ في التصدير', 'تعذر حفظ ملف Excel', 'error');
    }
  };

  // ----------------------------------------------------
  // Trips Handlers (with auto calculations on vehicles & drivers and cloud sync)
  // ----------------------------------------------------
  const handleSaveTrip = (trip: TripRoute) => {
    setTrips((prev) => {
      const exists = prev.some((t) => t.id === trip.id);
      if (exists) {
        return prev.map((t) => (t.id === trip.id ? trip : t));
      }
      return [trip, ...prev];
    });

    // Save trip to Cloud Firestore
    saveTripToCloud(trip);

    // Auto update vehicle current odometer and status
    setVehicles((prev) =>
      prev.map((v) => {
        if (v.id === trip.vehicleId) {
          const newOdo = Math.max(v.currentOdometer, trip.endOdometer);
          let newStatus = v.status;
          if (trip.status === 'جارية حالياً') {
            newStatus = 'في خط سير';
          } else if (trip.status === 'مكتملة' && v.status === 'في خط سير') {
            newStatus = 'جاهزة للعمل';
          }
          const updatedVeh = {
            ...v,
            currentOdometer: newOdo,
            status: newStatus,
          };
          saveVehicleToCloud(updatedVeh);
          return updatedVeh;
        }
        return v;
      })
    );

    // Auto update driver status
    if (trip.driverId) {
      setDrivers((prev) =>
        prev.map((d) => {
          if (d.id === trip.driverId) {
            let newStatus = d.status;
            if (trip.status === 'جارية حالياً') {
              newStatus = 'في رحلة';
            } else if (trip.status === 'مكتملة' && d.status === 'في رحلة') {
              newStatus = 'متاح للعمل';
            }
            const updatedDriver = {
              ...d,
              status: newStatus,
            };
            saveDriverToCloud(updatedDriver);
            return updatedDriver;
          }
          return d;
        })
      );
    }

    showToast('تم حفظ خط السير', `تم تحديث العداد والمصروفات آلياً ومزامنته سحابياً لرحلة ${trip.routeName}`, 'success');
  };

  const handleDeleteTrip = (tripId: string) => {
    const trip = trips.find((t) => t.id === tripId);
    openConfirm({
      title: 'حذف خط السير من الشيت',
      message: `هل أنت متأكد من حذف رحلة "${
        trip?.routeName || trip?.tripCode || tripId
      }"؟ لن تتمكن من التراجع عن هذه العملية.`,
      confirmText: 'حذف الرحلة',
      danger: true,
      onConfirm: () => {
        setTrips((prev) => prev.filter((t) => t.id !== tripId));
        deleteTripFromCloud(tripId);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        showToast('تم حذف الرحلة', 'تم حذف السجل بنجاح ومزامنته سحابياً', 'info');
      },
    });
  };

  const handleDeleteMultipleTrips = (tripIds: string[]) => {
    openConfirm({
      title: 'حذف الرحلات المحددة',
      message: `هل أنت متأكد من حذف ${tripIds.length} رحلة دفعة واحدة من الشيت؟`,
      confirmText: `حذف ${tripIds.length} رحلة`,
      danger: true,
      onConfirm: () => {
        setTrips((prev) => prev.filter((t) => !tripIds.includes(t.id)));
        deleteMultipleTripsFromCloud(tripIds);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        showToast('تم الحذف المتعدد', `تم حذف ${tripIds.length} رحلة بنجاح سحابياً`, 'info');
      },
    });
  };

  const handleClearAllTrips = () => {
    openConfirm({
      title: 'مسح كافة الرحلات',
      message: 'هل أنت متأكد من مسح جميع بيانات شيت الرحلات بالكامل؟',
      confirmText: 'مسح كافة الرحلات',
      danger: true,
      onConfirm: () => {
        setTrips([]);
        clearAllTripsFromCloud();
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        showToast('تم مسح الشيت', 'تم تفريغ كافة سجلات الرحلات سحابياً', 'info');
      },
    });
  };

  const handleAddSampleTrip = () => {
    const sample = INITIAL_TRIPS[Math.floor(Math.random() * INITIAL_TRIPS.length)];
    if (sample) {
      const newTrip: TripRoute = {
        ...sample,
        id: `trip-sample-${Date.now()}`,
        tripCode: `SMP-${Math.floor(100 + Math.random() * 900)}`,
        date: new Date().toISOString().split('T')[0],
      };
      setTrips((prev) => [newTrip, ...prev]);
      saveTripToCloud(newTrip);
      showToast('إضافة رحلة نموذجية', `تمت إضافة رحلة خط سير (${newTrip.routeName}) بنجاح`, 'success');
    }
  };

  const handleCompleteTrip = (tripId: string) => {
    setTrips((prev) =>
      prev.map((t) => {
        if (t.id === tripId) {
          const completedTrip: TripRoute = { ...t, status: 'مكتملة' };
          saveTripToCloud(completedTrip);
          return completedTrip;
        }
        return t;
      })
    );
    showToast('تم إتمام الرحلة', 'تم تأكيد وصول الرحلة وتحديث الحالة إلى مكتملة', 'success');
  };

  // ----------------------------------------------------
  // Vehicles Handlers
  // ----------------------------------------------------
  const handleSaveVehicle = (veh: Vehicle) => {
    setVehicles((prev) => {
      const exists = prev.some((v) => v.id === veh.id);
      if (exists) {
        return prev.map((v) => (v.id === veh.id ? veh : v));
      }
      return [veh, ...prev];
    });
    saveVehicleToCloud(veh);
    showToast('تم حفظ بيانات السيارة', `تم تحديث ملف الشاحنة ${veh.plateNumber} سحابياً`, 'success');
  };

  const handleDeleteVehicle = (vehId: string) => {
    const veh = vehicles.find((v) => v.id === vehId);
    openConfirm({
      title: 'حذف السيارة من الأسطول',
      message: `هل أنت متأكد من حذف الشاحنة "${veh?.plateNumber || vehId}" من الأسطول؟`,
      confirmText: 'حذف السيارة',
      danger: true,
      onConfirm: () => {
        setVehicles((prev) => prev.filter((v) => v.id !== vehId));
        deleteVehicleFromCloud(vehId);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        showToast('تم حذف السيارة', 'تمت إزالة السيارة من الأسطول سحابياً', 'info');
      },
    });
  };

  // ----------------------------------------------------
  // Drivers Handlers
  // ----------------------------------------------------
  const handleSaveDriver = async (driver: Driver) => {
    setDrivers((prev) => {
      const exists = prev.some((d) => d.id === driver.id);
      if (exists) {
        return prev.map((d) => (d.id === driver.id ? driver : d));
      }
      return [driver, ...prev];
    });
    try {
      await saveDriverToCloud(driver);
      showToast('مزامنة سحابية ناجحة', `تم حفظ وتحديث بيانات السائق ${driver.name} في Firestore بنجاح`, 'success');
    } catch (err) {
      console.warn('Driver cloud save warning:', err);
      showToast('تم الحفظ', `تم حفظ بيانات السائق ${driver.name} وجاري مزامنتها سحابياً`, 'info');
    }
  };

  const handleDeleteDriver = (driverId: string) => {
    const driver = drivers.find((d) => d.id === driverId);
    openConfirm({
      title: 'حذف السائق من السجل',
      message: `هل أنت متأكد من حذف السائق "${
        driver?.name || driverId
      }"؟ لن يظهر في القوائم بعد الحذف.`,
      confirmText: 'حذف السائق',
      danger: true,
      onConfirm: () => {
        setDrivers((prev) => prev.filter((d) => d.id !== driverId));
        deleteDriverFromCloud(driverId);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        showToast('تم حذف السائق', 'تمت إزالة السائق من السجل سحابياً', 'info');
      },
    });
  };

  const handleDeleteMultipleDrivers = (driverIds: string[]) => {
    openConfirm({
      title: 'حذف السائقين المحددين',
      message: `هل أنت متأكد من حذف ${driverIds.length} سائق من السجل؟`,
      confirmText: `حذف ${driverIds.length} سائق`,
      danger: true,
      onConfirm: () => {
        setDrivers((prev) => prev.filter((d) => !driverIds.includes(d.id)));
        deleteMultipleDriversFromCloud(driverIds);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        showToast('تم الحذف المتعدد', `تم حذف ${driverIds.length} سائق بنجاح سحابياً`, 'info');
      },
    });
  };

  const handleClearAllDrivers = () => {
    openConfirm({
      title: 'مسح كافة السائقين',
      message: 'هل أنت متأكد من مسح جميع بيانات السائقين المسجلين؟',
      confirmText: 'مسح السائقين',
      danger: true,
      onConfirm: () => {
        setDrivers([]);
        clearAllDriversFromCloud();
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        showToast('مسح السجل', 'تم تفريغ سجل السائقين بالكامل سحابياً', 'info');
      },
    });
  };

  const handleAddSampleDriver = () => {
    const sample = INITIAL_DRIVERS[Math.floor(Math.random() * INITIAL_DRIVERS.length)];
    if (sample) {
      const newDriver: Driver = {
        ...sample,
        id: `drv-sample-${Date.now()}`,
        code: `D-${Math.floor(10 + Math.random() * 90)}`,
        name: `${sample.name} (إضافي)`,
      };
      setDrivers((prev) => [newDriver, ...prev]);
      saveDriverToCloud(newDriver);
      showToast('إضافة سائق نموذجي', `تمت إضافة السائق ${newDriver.name}`, 'success');
    }
  };

  // ----------------------------------------------------
  // Locations Handlers
  // ----------------------------------------------------
  const handleSaveLocation = (loc: LocationPlace) => {
    setLocations((prev) => {
      const exists = prev.some((l) => l.id === loc.id);
      if (exists) {
        return prev.map((l) => (l.id === loc.id ? loc : l));
      }
      return [loc, ...prev];
    });
    saveLocationToCloud(loc);
    showToast('تم حفظ المكان', `تم حفظ بيانات "${loc.name}" في قطاع ${loc.region} ومزامنته سحابياً`, 'success');
  };

  const handleDeleteLocation = (locationId: string) => {
    const loc = locations.find((l) => l.id === locationId);
    openConfirm({
      title: 'حذف المكان',
      message: `هل تريد حذف "${loc?.name || locationId}" من دليل الأماكن؟`,
      confirmText: 'حذف المكان',
      danger: true,
      onConfirm: () => {
        setLocations((prev) => prev.filter((l) => l.id !== locationId));
        deleteLocationFromCloud(locationId);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        showToast('تم حذف المكان', 'تمت إزالة المكان من الدليل سحابياً', 'info');
      },
    });
  };

  const handleResetDefaultLocations = () => {
    openConfirm({
      title: 'استعادة الأماكن الافتراضية',
      message:
        'هل تريد استعادة قائمة الأماكن والمستودعات القياسية لمصنع برج العرب والمناطق الثلاث؟',
      confirmText: 'استعادة الافتراضي',
      danger: false,
      onConfirm: () => {
        setLocations(INITIAL_LOCATIONS);
        INITIAL_LOCATIONS.forEach((l) => saveLocationToCloud(l));
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        showToast('تمت الاستعادة', 'تمت استعادة كافة الأماكن الافتراضية ومزامنتها سحابياً', 'success');
      },
    });
  };

  const handleOpenTripModalWithPlace = (placeName: string, region: string) => {
    setPresetTripPlace({ name: placeName, region });
    setEditingTrip(null);
    setIsTripModalOpen(true);
  };

  // ----------------------------------------------------
  // Maintenance Handlers
  // ----------------------------------------------------
  const handleSaveMaintenance = (
    maint: MaintenanceRecord,
    updateVehicleTarget?: { vehicleId: string; nextOilKm: number; currentKm: number }
  ) => {
    setMaintenance((prev) => {
      const exists = prev.some((m) => m.id === maint.id);
      if (exists) {
        return prev.map((m) => (m.id === maint.id ? maint : m));
      }
      return [maint, ...prev];
    });
    saveMaintenanceToCloud(maint);

    if (updateVehicleTarget) {
      setVehicles((prev) =>
        prev.map((v) => {
          if (v.id === updateVehicleTarget.vehicleId) {
            const updatedV = {
              ...v,
              lastOilChangeKm: updateVehicleTarget.currentKm,
              nextOilChangeKm: updateVehicleTarget.nextOilKm,
              currentOdometer: Math.max(v.currentOdometer, updateVehicleTarget.currentKm),
              status: v.status === 'في الصيانة' ? ('جاهزة للعمل' as const) : v.status,
            };
            saveVehicleToCloud(updatedV);
            return updatedV;
          }
          return v;
        })
      );
    }

    showToast('تم حفظ الصيانة', `تم تسجيل عملية الصيانة وتحديث عدادات الزيت الدورية سحابياً`, 'success');
  };

  const handleDeleteMaintenance = (maintId: string) => {
    openConfirm({
      title: 'حذف سجل الصيانة',
      message: 'هل أنت متأكد من حذف هذا السجل من شيت الصيانة؟',
      confirmText: 'حذف السجل',
      danger: true,
      onConfirm: () => {
        setMaintenance((prev) => prev.filter((m) => m.id !== maintId));
        deleteMaintenanceFromCloud(maintId);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        showToast('تم الحذف', 'تم حذف سجل الصيانة سحابياً', 'info');
      },
    });
  };

  // ----------------------------------------------------
  // Fuel Handlers
  // ----------------------------------------------------
  const handleAddFuel = (newFuel: FuelRecord) => {
    setFuelRecords((prev) => [newFuel, ...prev]);
    saveFuelToCloud(newFuel);
    showToast('تم تسجيل الوقود', 'تم حفظ السجل بنجاح في السحابة والقاعدة المحلية');
  };

  const handleDeleteFuel = (fuelId: string) => {
    openConfirm({
      title: 'حذف إيصال الوقود',
      message: 'هل أنت متأكد من حذف إيصال الوقود هذا؟',
      confirmText: 'حذف الإيصال',
      danger: true,
      onConfirm: () => {
        setFuelRecords((prev) => prev.filter((f) => f.id !== fuelId));
        deleteFuelFromCloud(fuelId);
        setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        showToast('تم حذف سجل الوقود', undefined, 'info');
      },
    });
  };

  // ----------------------------------------------------
  // User Management & Roles Handlers
  // ----------------------------------------------------
  const handleUpdateUserRole = async (targetUid: string, role: UserRole, status: UserStatus) => {
    try {
      await updateUserRole(targetUid, role, status);
      showToast('تم تحديث الحساب', 'تم تحديث دور وحالة المستخدم بنجاح في السحابة');
    } catch (err: any) {
      console.error(err);
      showToast('تعذر التحديث', err.message || 'فشلت عملية تحديث الصلاحيات', 'error');
    }
  };

  const handleDeleteUser = async (targetUid: string) => {
    try {
      await deleteUserAccount(targetUid);
      setAllUsers((prev) => prev.filter((u) => u.uid !== targetUid));
      showToast('تم حذف الحساب', 'تمت إزالة الحساب من فريق العمل بنجاح', 'info');
    } catch (err: any) {
      console.error(err);
      showToast('تعذر حذف الحساب', err.message || 'فشلت عملية الحذف', 'error');
    }
  };

  const handleAddUser = async (accountData: {
    email: string;
    displayName: string;
    role: UserRole;
    status?: UserStatus;
    jobTitle?: string;
    department?: string;
    assignedBranch?: string;
    phone?: string;
    assignedDriverId?: string;
    customPermissions?: string[];
  }) => {
    try {
      await createOrInviteUserAccount(accountData);
      showToast('تمت إضافة الحساب بنجاح', `تمت إضافة حساب ${accountData.displayName} وتعيين الصلاحيات`);
    } catch (err: any) {
      console.error(err);
      showToast('تعذر إضافة الحساب', err.message || 'فشلت عملية إضافة الحساب', 'error');
      throw err;
    }
  };

  const handleUpdateUserDetails = async (targetUid: string, updates: Partial<UserProfile>) => {
    try {
      await updateUserDetails(targetUid, updates);
      showToast('تم حفظ البيانات', 'تم تحديث بيانات ومسمى الحساب بنجاح في السحابة');
    } catch (err: any) {
      console.error(err);
      showToast('تعذر التحديث', err.message || 'فشلت عملية تحديث البيانات', 'error');
      throw err;
    }
  };

  const handleOpenMaintenanceForVehicle = (vehicleId: string) => {
    setEditingMaint(null);
    setPresetVehicleIdForMaint(vehicleId);
    setIsMaintModalOpen(true);
  };

  // ----------------------------------------------------
  // Operations Tasks Handlers
  // ----------------------------------------------------
  const handleCreateTask = async (taskData: Partial<OperationTask>) => {
    const codeNum = String(tasks.length + 1).padStart(3, '0');
    const newTask: OperationTask = {
      id: `task-${Date.now()}`,
      companyId: currentCompany.id,
      taskCode: `TASK-${codeNum}`,
      title: taskData.title || 'مهمة تشغيلية جديدة',
      date: taskData.date || new Date().toISOString().split('T')[0],
      regionId: taskData.regionId || 'reg-alexandria',
      regionName: taskData.regionName || 'الإسكندرية',
      locationId: taskData.locationId || locations[0]?.id || '',
      locationName: taskData.locationName || locations[0]?.name || 'مصنع برج العرب',
      vehicleId: taskData.vehicleId,
      vehiclePlate: taskData.vehiclePlate,
      driverId: taskData.driverId,
      driverName: taskData.driverName,
      priority: taskData.priority || 'NORMAL',
      startTime: taskData.startTime || '08:00',
      dueTime: taskData.dueTime || '12:00',
      status: 'PENDING',
      notes: taskData.notes,
      activityTimeline: [
        {
          id: `act-${Date.now()}`,
          timestamp: new Date().toISOString(),
          actor: userProfile?.displayName || 'مسؤول الحركة',
          action: 'إنشاء المهمة وجدولتها في نظام التشغيل',
          status: 'PENDING',
        },
      ],
      createdBy: userProfile?.displayName || 'أ. زكريا فهمي',
      createdAt: new Date().toISOString(),
    };
    setTasks((prev) => [newTask, ...prev]);
    saveTaskToCloud(newTask, currentCompany.id);

    // Trigger Automation Engine V3
    automationService.onTaskCreated(newTask).catch((e) => console.warn('Automation trigger error:', e));

    const audit: AuditLog = {
      id: `audit-${Date.now()}`,
      companyId: currentCompany.id,
      userId: user?.uid || 'user-01',
      userName: userProfile?.displayName || 'المستخدم',
      userRole: effectiveRole,
      action: 'CREATE_TASK',
      entity: 'OperationTask',
      entityId: newTask.id,
      newValue: { taskCode: newTask.taskCode, title: newTask.title },
      timestamp: new Date().toISOString(),
      details: `إنشاء المهمة التشغيلية ${newTask.taskCode}`,
    };
    setAuditLogs((prev) => [audit, ...prev]);
    saveAuditLogToCloud(audit, currentCompany.id);
    showToast('تم إنشاء المهمة', `تم تسجيل المهمة ${newTask.taskCode} بنجاح ومزامنتها سحابياً`, 'success');
  };

  const handleUpdateTask = async (updatedTask: OperationTask) => {
    setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
    saveTaskToCloud(updatedTask, currentCompany.id);

    // Automation Engine triggers for task lifecycle
    if (updatedTask.status === 'COMPLETED') {
      automationService.onTaskCompleted(updatedTask).catch((e) => console.warn('Automation trigger error:', e));
    } else if (updatedTask.status === 'IN_PROGRESS') {
      automationService.onTaskStarted(updatedTask).catch((e) => console.warn('Automation trigger error:', e));
    } else if (updatedTask.status === 'CANCELLED') {
      automationService.onTaskCancelled(updatedTask).catch((e) => console.warn('Automation trigger error:', e));
    }
    if (updatedTask.driverId) {
      automationService.onTaskAssigned(updatedTask, updatedTask.driverId, updatedTask.vehicleId).catch((e) => console.warn('Automation trigger error:', e));
    }

    const audit: AuditLog = {
      id: `audit-${Date.now()}`,
      companyId: currentCompany.id,
      userId: user?.uid || 'user-01',
      userName: userProfile?.displayName || 'المستخدم',
      userRole: effectiveRole,
      action: 'UPDATE_TASK',
      entity: 'OperationTask',
      entityId: updatedTask.id,
      newValue: { status: updatedTask.status, title: updatedTask.title },
      timestamp: new Date().toISOString(),
      details: `تحديث المهمة ${updatedTask.taskCode} إلى الحالة ${updatedTask.status}`,
    };
    setAuditLogs((prev) => [audit, ...prev]);
    saveAuditLogToCloud(audit, currentCompany.id);
    showToast('تم تحديث المهمة', `تم حفظ التغييرات على المهمة ${updatedTask.taskCode} سحابياً`, 'success');
  };

  const handleDeleteTask = async (taskId: string) => {
    const target = tasks.find((t) => t.id === taskId);
    setTasks((prev) => prev.filter((t) => t.id !== taskId));
    deleteTaskFromCloud(taskId, currentCompany.id);

    if (target) {
      const audit: AuditLog = {
        id: `audit-${Date.now()}`,
        companyId: currentCompany.id,
        userId: user?.uid || 'user-01',
        userName: userProfile?.displayName || 'المستخدم',
        userRole: effectiveRole,
        action: 'DELETE_TASK',
        entity: 'OperationTask',
        entityId: taskId,
        timestamp: new Date().toISOString(),
        details: `حذف المهمة ${target.taskCode}`,
      };
      setAuditLogs((prev) => [audit, ...prev]);
      saveAuditLogToCloud(audit, currentCompany.id);
    }
    showToast('تم حذف المهمة', 'تم حذف أمر التشغيل المحدد من السحابة', 'info');
  };

  const handleSendTaskInstantAlert = (task: OperationTask, customMessage?: string) => {
    const notif: AppNotification = {
      id: `notif-task-due-${task.id}-${Date.now()}`,
      companyId: currentCompany.id,
      type: 'TASK_OVERDUE',
      title: `🚨 تنبيه فوري للمسؤول: اقتراب موعد انتهاء المهمة ${task.taskCode}`,
      message:
        customMessage ||
        `المهمة "${task.title}" لدى السائق (${task.driverName || 'غير معين'}) أوشكت على انتهاء موعد تنفيذها المحدد (${task.dueTime || '14:00'}). يُرجى المتابعة الفورية والتنسيق.`,
      status: 'UNREAD',
      severity: 'urgent',
      entityType: 'task',
      entityId: task.id,
      createdAt: new Date().toISOString(),
    };

    setNotifications((prev) => [notif, ...prev]);
    saveNotificationToCloud(notif, currentCompany.id);

    const audit: AuditLog = {
      id: `audit-${Date.now()}`,
      companyId: currentCompany.id,
      userId: user?.uid || 'user-01',
      userName: userProfile?.displayName || 'مسؤول الحركة والعمليات',
      userRole: effectiveRole,
      action: 'تنبيه فوري للمسؤول (dueTime)',
      entity: 'OperationTask',
      entityId: task.id,
      timestamp: new Date().toISOString(),
      details: `إرسال تذكير ذكي وتنبيه فوري للمسؤول بشأن المهمة ${task.taskCode} لاقتراب موعد التسليم (${task.dueTime})`,
    };
    setAuditLogs((prev) => [audit, ...prev]);
    saveAuditLogToCloud(audit, currentCompany.id);

    showToast(
      '🚨 تم إرسال تنبيه فوري للمسؤول',
      `تم إخطار مسؤول الحركة بنجاح بشأن المهمة ${task.taskCode} وتوثيق التنبيه بمركز الإشعارات`,
      'error'
    );
  };

  // ----------------------------------------------------
  // Automation Handlers
  // ----------------------------------------------------
  const handleToggleRule = async (ruleId: string, enabled: boolean) => {
    const targetRule = automationRules.find((r) => r.id === ruleId);
    if (targetRule) {
      const updated = { ...targetRule, enabled };
      setAutomationRules((prev) =>
        prev.map((r) => (r.id === ruleId ? updated : r))
      );
      saveAutomationRuleToCloud(updated, currentCompany.id);
    }
    showToast(
      enabled ? 'تم تفعيل القاعدة' : 'تم تعطيل القاعدة',
      'تم تحديث حالة مشغل الأتمتة في السحابة بنجاح',
      'info'
    );
  };

  const handleCreateRule = async (ruleData: Partial<AutomationRule>) => {
    const newRule: AutomationRule = {
      id: `rule-${Date.now()}`,
      companyId: currentCompany.id,
      name: ruleData.name || 'قاعدة تشغيل ذكية',
      description: ruleData.description || '',
      trigger: ruleData.trigger || 'TASK_DELAYED',
      conditions: ruleData.conditions || [],
      actions: ruleData.actions || [
        { type: 'SEND_NOTIFICATION', parameters: { title: 'تنبيه أتمتة فليت أوبس' } },
      ],
      enabled: true,
      executionCount: 0,
      createdBy: userProfile?.displayName || 'أ. زكريا فهمي',
      createdAt: new Date().toISOString(),
    };
    setAutomationRules((prev) => [newRule, ...prev]);
    saveAutomationRuleToCloud(newRule, currentCompany.id);
    showToast('تمت إضافة قاعدة الأتمتة', `تم حفظ "${newRule.name}" في السحابة بنجاح`, 'success');
  };

  const handleSimulateExecution = async (ruleId: string) => {
    const rule = automationRules.find((r) => r.id === ruleId);
    if (!rule) return;

    try {
      // Execute rule on the authoritative server-side automation engine
      await automationService.executeRule(rule.id, { simulated: true });
    } catch (e) {
      console.warn('Simulate on server note:', e);
    }

    const exec: AutomationExecution = {
      id: `exec-${Date.now()}`,
      companyId: currentCompany.id,
      ruleId: rule.id,
      ruleName: rule.name,
      trigger: rule.trigger,
      triggeredBy: 'محاكاة يدوية لاختبار مشغل القاعدة',
      executionTime: new Date().toISOString(),
      status: 'SUCCESS',
      details: `تم تنفيذ شروط القاعدة بنجاح عبر محرك الأتمتة وإرسال التنبيهات للقنوات المحددة.`,
    };

    setAutomationExecutions((prev) => [exec, ...prev]);
    saveAutomationExecutionToCloud(exec, currentCompany.id);

    const updatedRule = {
      ...rule,
      executionCount: rule.executionCount + 1,
      lastExecutedAt: exec.executionTime,
    };
    setAutomationRules((prev) =>
      prev.map((r) => (r.id === ruleId ? updatedRule : r))
    );
    saveAutomationRuleToCloud(updatedRule, currentCompany.id);

    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      companyId: currentCompany.id,
      type: 'AUTOMATION_ALERT',
      title: `⚡ تشغيل قاعدة: ${rule.name}`,
      message: exec.details,
      status: 'UNREAD',
      severity: 'info',
      entityType: 'automation',
      entityId: rule.id,
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [notif, ...prev]);
    saveNotificationToCloud(notif, currentCompany.id);
    showToast('نجحت المحاكاة السحابية', `تم تنفيذ واختبار "${rule.name}" وتسجيل السجل سحابياً`, 'success');
  };

  const handleDeleteRule = async (ruleId: string) => {
    setAutomationRules((prev) => prev.filter((r) => r.id !== ruleId));
    await deleteAutomationRuleFromCloud(ruleId, currentCompany.id);
    showToast('تم حذف القاعدة', 'تم حذف قاعدة الأتمتة بنجاح من السحابة', 'info');
  };

  const handleRetryExecution = async (executionId: string) => {
    try {
      showToast('جاري إعادة المحاولة', 'يتم تشغيل محرك الأتمتة لإعادة محاولة تنفيذ الإجراءات...', 'info');
      const result = await automationService.retryExecution(executionId);
      const updatedExecs = await automationService.getExecutions();
      if (updatedExecs && updatedExecs.length > 0) {
        setAutomationExecutions(updatedExecs);
      }
      showToast('اكتملت المحاولة', result?.details || 'تم إعادة تشغيل قاعدة الأتمتة بنجاح', 'success');
    } catch (err: any) {
      showToast('فشل إعادة المحاولة', err?.message || 'تعذر إعادة محاولة التنفيذ', 'error');
    }
  };

  // ----------------------------------------------------
  // Notifications Handlers
  // ----------------------------------------------------
  const handleMarkNotifRead = (id: string) => {
    setNotifications((prev) =>
      prev.map((n) => {
        if (n.id === id) {
          const updated: AppNotification = { ...n, status: 'READ', readAt: new Date().toISOString() };
          saveNotificationToCloud(updated, currentCompany.id);
          return updated;
        }
        return n;
      })
    );
  };

  const handleMarkAllNotifsRead = () => {
    setNotifications((prev) =>
      prev.map((n) => {
        const updated: AppNotification = { ...n, status: 'READ', readAt: new Date().toISOString() };
        saveNotificationToCloud(updated, currentCompany.id);
        return updated;
      })
    );
    showToast('تم تحديد الكل كمقروء', 'تم تحديث جميع التنبيهات سحابياً إلى مقروءة', 'info');
  };

  const handleDeleteNotif = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id));
    deleteNotificationFromCloud(id, currentCompany.id);
  };

  const handleSaveNotificationPrefs = (prefs: UserNotificationPreferences) => {
    setNotificationPrefs(prefs);
    showToast('تم حفظ التفضيلات', 'تم تحديث قنوات وتفضيلات الإشعارات بنجاح', 'success');
  };

  const handleSendTestNotif = () => {
    const notif: AppNotification = {
      id: `notif-${Date.now()}`,
      companyId: currentCompany.id,
      type: 'SYSTEM_ALERT',
      title: '🔔 إشعار فحص النظام المباشر',
      message: 'نظام فليت أوبس يعمل بكفاءة كاملة والاتصال بالسحابة ومحرك القواعد متصل 100%',
      status: 'UNREAD',
      severity: 'info',
      createdAt: new Date().toISOString(),
    };
    setNotifications((prev) => [notif, ...prev]);
    saveNotificationToCloud(notif, currentCompany.id);
    showToast('تم إرسال إشعار تجريبي', 'تحقق من قائمة الإشعارات بالأعلى', 'success');
  };

  // ----------------------------------------------------
  // Company & Vehicle Document Handlers
  // ----------------------------------------------------
  const handleUpdateCompany = (updated: Partial<Company>) => {
    setCompanies((prev) =>
      prev.map((c) => (c.id === currentCompany.id ? { ...c, ...updated } : c))
    );
    showToast('تم حفظ بيانات الشركة', 'تم تحديث الملف المؤسسي للشركة بنجاح', 'success');
  };

  const handleAddDocument = (doc: Partial<VehicleDocument>) => {
    const newDoc: VehicleDocument = {
      id: `doc-${Date.now()}`,
      companyId: currentCompany.id,
      vehicleId: doc.vehicleId || vehicles[0]?.id || '',
      vehiclePlate: doc.vehiclePlate || vehicles[0]?.plateNumber || '',
      documentType: doc.documentType || 'LICENSE',
      title: doc.title || 'وثيقة مركبة جديدة',
      documentNumber: doc.documentNumber || `DOC-${Date.now().toString().slice(-4)}`,
      issueDate: doc.issueDate || new Date().toISOString().split('T')[0],
      expiryDate: doc.expiryDate || new Date(Date.now() + 365 * 86400000).toISOString().split('T')[0],
      status: 'VALID',
      issuer: doc.issuer || 'إدارة المرور',
      notes: doc.notes,
    };
    setVehicleDocuments((prev) => [newDoc, ...prev]);
    saveVehicleDocumentToCloud(newDoc, currentCompany.id);
    showToast('تمت إضافة الوثيقة', `تم تسجيل وثيقة ${newDoc.title} سحابياً بنجاح`, 'success');
  };

  const [isDownloadingZip, setIsDownloadingZip] = useState(false);

  const handleDownloadProjectZip = async () => {
    try {
      setIsDownloadingZip(true);
      showToast('جارٍ تجهيز الكود...', 'يتم الآن ضغط وتجهيز حزمة المشروع الكاملة بصيغة ZIP', 'info');
      const response = await fetch('/api/download-zip');
      if (!response.ok) {
        throw new Error('فشل الخادم في ضغط الملفات');
      }
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `fleetops-intelligence-${new Date().toISOString().split('T')[0]}.zip`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      showToast('تم التحميل بنجاح!', 'تم تنزيل أرشيف المشروع بصيغة ZIP بنجاح على جهازك', 'success');
    } catch (err) {
      console.error('Download error:', err);
      // Fallback
      window.location.href = '/api/download-zip';
    } finally {
      setIsDownloadingZip(false);
    }
  };

  const handleImportFleetDataFromZip = (data: ExtractedFleetData) => {
    if (data.vehicles && data.vehicles.length > 0) {
      setVehicles((prev) => {
        const merged = [...data.vehicles!];
        prev.forEach((p) => {
          if (!merged.some((m) => m.id === p.id)) merged.push(p);
        });
        return merged;
      });
      data.vehicles.forEach((v) => saveVehicleToCloud(v, currentCompany.id));
    }
    if (data.drivers && data.drivers.length > 0) {
      setDrivers((prev) => {
        const merged = [...data.drivers!];
        prev.forEach((p) => {
          if (!merged.some((m) => m.id === p.id)) merged.push(p);
        });
        return merged;
      });
      data.drivers.forEach((d) => saveDriverToCloud(d, currentCompany.id));
    }
    if (data.trips && data.trips.length > 0) {
      setTrips((prev) => {
        const merged = [...data.trips!];
        prev.forEach((p) => {
          if (!merged.some((m) => m.id === p.id)) merged.push(p);
        });
        return merged;
      });
      data.trips.forEach((t) => saveTripToCloud(t, currentCompany.id));
    }
    if (data.maintenance && data.maintenance.length > 0) {
      setMaintenance((prev) => {
        const merged = [...data.maintenance!];
        prev.forEach((p) => {
          if (!merged.some((m) => m.id === p.id)) merged.push(p);
        });
        return merged;
      });
      data.maintenance.forEach((m) => saveMaintenanceToCloud(m, currentCompany.id));
    }
    if (data.fuelRecords && data.fuelRecords.length > 0) {
      setFuelRecords((prev) => {
        const merged = [...data.fuelRecords!];
        prev.forEach((p) => {
          if (!merged.some((m) => m.id === p.id)) merged.push(p);
        });
        return merged;
      });
      data.fuelRecords.forEach((f) => saveFuelToCloud(f, currentCompany.id));
    }
    if (data.documents && data.documents.length > 0) {
      setVehicleDocuments((prev) => [...data.documents!, ...prev]);
      data.documents.forEach((doc) => saveVehicleDocumentToCloud(doc, currentCompany.id));
    }
    showToast('تم استيراد بيانات الأسطول', 'تم استيراد وحفظ البيانات بنجاح من أرشيف الـ ZIP', 'success');
  };

  const handleImportDocumentsFromZip = (docs: Partial<VehicleDocument>[]) => {
    docs.forEach((doc) => {
      handleAddDocument(doc);
    });
    showToast('تم استيراد الوثائق', `تم إضافة ${docs.length} وثيقة بنجاح من أرشيف الـ ZIP`, 'success');
  };

  return (
    <div
      className="min-h-screen bg-slate-900 text-slate-100 flex flex-row font-sans selection:bg-emerald-500 selection:text-slate-950 overflow-hidden"
      dir="rtl"
    >
      {/* Toast Notification Container */}
      <ToastContainer toasts={toasts} onDismiss={handleDismissToast} />

      {/* Push Notification In-App Toast Banner */}
      <NotificationToastBanner
        notification={activeToastBanner}
        onDismiss={() => setActiveToastBanner(null)}
        onOpenSettings={() => setIsNotificationModalOpen(true)}
        onOpenMaintenanceForVehicle={handleOpenMaintenanceForVehicle}
      />

      {/* Safe In-App Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText}
        danger={confirmDialog.danger ?? true}
        onConfirm={confirmDialog.onConfirm}
        onCancel={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
      />

      {/* Global Search Modal */}
      <GlobalSearchModal
        isOpen={isSearchOpen}
        onClose={() => setIsSearchOpen(false)}
        tasks={tasks}
        vehicles={vehicles}
        drivers={drivers}
        locations={locations}
        rules={automationRules}
        onSelectTask={(task) => {
          setActiveTab('operations');
          setIsSearchOpen(false);
        }}
        onSelectVehicle={(veh) => {
          setActiveTab('fleet');
          setIsSearchOpen(false);
        }}
        onSelectDriver={(drv) => {
          setActiveTab('people');
          setIsSearchOpen(false);
        }}
        onSelectLocation={(loc) => {
          setActiveTab('locations');
          setIsSearchOpen(false);
        }}
        onSelectRule={(rule) => {
          setActiveTab('automation');
          setIsSearchOpen(false);
        }}
      />

      {/* Sidebar Navigation (Desktop Collapsible) */}
      <div className="hidden lg:block shrink-0 h-screen sticky top-0">
        <Sidebar
          currentTab={activeTab}
          onSelectTab={(tab) => {
            setActiveTab(tab);
          }}
          unreadNotificationsCount={notifications.filter((n) => n.status === 'UNREAD').length}
          delayedTasksCount={tasks.filter((t) => t.status === 'DELAYED').length}
          urgentMaintenanceCount={maintenance.filter((m) => m.status === 'متأخرة').length}
          companyName={currentCompany.nameAr || currentCompany.name}
          effectiveRole={effectiveRole}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={() => setIsSidebarCollapsed((prev) => !prev)}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
          currentUser={user}
        />
      </div>

      {/* Mobile Sidebar Drawer */}
      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-950/70 backdrop-blur-xs"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative z-10 w-72 h-full">
            <Sidebar
              currentTab={activeTab}
              onSelectTab={(tab) => {
                setActiveTab(tab);
                setIsMobileSidebarOpen(false);
              }}
              unreadNotificationsCount={notifications.filter((n) => n.status === 'UNREAD').length}
              delayedTasksCount={tasks.filter((t) => t.status === 'DELAYED').length}
              urgentMaintenanceCount={maintenance.filter((m) => m.status === 'متأخرة').length}
              companyName={currentCompany.nameAr || currentCompany.name}
              effectiveRole={effectiveRole}
              isCollapsed={false}
              onToggleCollapse={() => setIsMobileSidebarOpen(false)}
              onOpenLoginModal={() => {
                setIsMobileSidebarOpen(false);
                setIsLoginModalOpen(true);
              }}
              currentUser={user}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0 h-screen overflow-y-auto">
        {/* Modern Enterprise Header */}
        <Header
          companies={companies}
          currentCompany={currentCompany}
          onSelectCompany={(c) => {
            setCurrentCompanyId(c.id);
            showToast('تم اختيار الشركة', `أنت الآن في نطاق: ${c.nameAr || c.name}`, 'info');
          }}
          availableRoles={[
            'SUPER_ADMIN',
            'COMPANY_ADMIN',
            'OPERATIONS_MANAGER',
            'SUPERVISOR',
            'DISPATCHER',
            'DRIVER',
            'VIEWER',
          ]}
          effectiveRole={effectiveRole}
          onChangeEffectiveRole={(r) => {
            setEffectiveRole(r);
            showToast('تغيير الصلاحية', `تم التبديل إلى دور: ${r}`, 'info');
          }}
          onOpenSearch={() => setIsSearchOpen(true)}
          darkMode={darkMode}
          onToggleDarkMode={() => setDarkMode((prev) => !prev)}
          notifications={notifications}
          onOpenNotificationCenter={() => setActiveTab('notifications')}
          onMarkNotificationRead={handleMarkNotifRead}
          userProfile={userProfile}
          onSignOut={handleLogout}
          onToggleMobileMenu={() => setIsMobileSidebarOpen((prev) => !prev)}
          onOpenLoginModal={() => setIsLoginModalOpen(true)}
        />

        {/* Quick Ribbon / Sub-Header */}
        <div className="bg-slate-800/80 border-b border-slate-700/60 px-4 sm:px-6 py-2.5 flex flex-wrap items-center justify-between gap-3 text-xs shrink-0">
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar">
            <button
              onClick={() => setActiveTab('dashboard')}
              className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                activeTab === 'dashboard'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              الرئيسية
            </button>
            <button
              onClick={() => setActiveTab('operations')}
              className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                activeTab === 'operations'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              العمليات والمهام
            </button>
            <button
              onClick={() => setActiveTab('fleet')}
              className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                activeTab === 'fleet'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              المركبات والصيانة
            </button>
            <button
              onClick={() => setActiveTab('people')}
              className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                activeTab === 'people'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              السائقين والكوادر
            </button>
            <button
              onClick={() => setActiveTab('locations')}
              className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                activeTab === 'locations'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              المواقع والفروع
            </button>
            <button
              onClick={() => setActiveTab('automation')}
              className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                activeTab === 'automation'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              محرك الأتمتة
            </button>
            <button
              onClick={() => setActiveTab('ai_center')}
              className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                activeTab === 'ai_center'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              مساعد العمليات AI
            </button>
            <button
              onClick={() => setActiveTab('reports')}
              className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                activeTab === 'reports'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              التقارير
            </button>
            <button
              onClick={() => setActiveTab('settings')}
              className={`px-3 py-1.5 rounded-lg font-medium transition whitespace-nowrap ${
                activeTab === 'settings'
                  ? 'bg-emerald-500 text-slate-950 font-bold shadow-xs'
                  : 'bg-slate-700/50 text-slate-300 hover:bg-slate-700'
              }`}
            >
              الإعدادات والصلاحيات
            </button>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={handleSyncToSheets}
              disabled={isSyncingSheets}
              className="px-2.5 py-1.5 rounded-lg bg-emerald-600/30 border border-emerald-500/40 text-emerald-300 hover:bg-emerald-600/40 flex items-center gap-1.5 font-medium transition disabled:opacity-50"
              title="مزامنة مع جداول جوجل شيتس"
            >
              {isSyncingSheets ? 'جارٍ المزامنة...' : 'مزامنة Google Sheets'}
            </button>
            <button
              onClick={handleExportLocal}
              className="px-2.5 py-1.5 rounded-lg bg-slate-700 hover:bg-slate-600 text-slate-200 flex items-center gap-1.5 font-medium transition"
              title="تصدير ملف إكسيل كامل"
            >
              تصدير Excel
            </button>
            <button
              onClick={() => setIsDailyEmailModalOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-blue-600/30 border border-blue-500/40 text-blue-300 hover:bg-blue-600/40 flex items-center gap-1.5 font-medium transition"
              title="تقرير الإيميل الصباحي"
            >
              إيميل العمليات
            </button>
            <button
              onClick={() => setIsZipUploadModalOpen(true)}
              className="px-3 py-1.5 rounded-lg bg-cyan-500/20 border border-cyan-500/40 text-cyan-300 hover:bg-cyan-500/30 flex items-center gap-1.5 font-bold transition shadow-xs cursor-pointer"
              title="رفع واستعراض أرشيف ملفات ZIP"
            >
              <UploadCloud className="w-3.5 h-3.5" />
              <span>رفع ملف (ZIP)</span>
            </button>
            <button
              onClick={handleDownloadProjectZip}
              disabled={isDownloadingZip}
              className="px-3 py-1.5 rounded-lg bg-amber-500/20 border border-amber-500/40 text-amber-300 hover:bg-amber-500/30 flex items-center gap-1.5 font-bold transition shadow-xs disabled:opacity-50"
              title="تحميل كود البرنامج كاملاً بصيغة ZIP"
            >
              <Download className={`w-3.5 h-3.5 ${isDownloadingZip ? 'animate-bounce' : ''}`} />
              <span>{isDownloadingZip ? 'جارٍ الضغط...' : 'تحميل البرنامج (ZIP)'}</span>
            </button>
            <button
              onClick={() => setIsLoginModalOpen(true)}
              className="px-2.5 py-1.5 rounded-lg bg-indigo-600/30 border border-indigo-500/40 text-indigo-300 hover:bg-indigo-600/40 flex items-center gap-1.5 font-medium transition cursor-pointer"
              title="إدارة الحسابات وتسجيل الدخول"
            >
              <KeyRound className="w-3.5 h-3.5" />
              <span>{user ? 'تبديل الحساب' : 'تسجيل الدخول'}</span>
            </button>
          </div>
        </div>

        {/* Content Container */}
        <main className="flex-1 w-full p-3 sm:p-6 pb-24 md:pb-8 space-y-4 sm:space-y-5">
          {/* Maintenance & Licenses Alert Banner */}
          <AlertBanner
            alerts={alerts}
            onViewMaintenanceTab={() => setActiveTab('fleet')}
            onQuickAction={handleOpenMaintenanceForVehicle}
          />

          {/* Current User Pending Notification Banner */}
          {user && userProfile && userProfile.status === 'pending' && userProfile.role !== 'SUPER_ADMIN' && (
            <div className="bg-amber-950/60 border border-amber-500/40 rounded-2xl p-4 flex items-start gap-3 shadow-lg">
              <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/30 text-amber-400 flex items-center justify-center shrink-0 mt-0.5">
                <Clock className="w-5 h-5 animate-pulse" />
              </div>
              <div>
                <h4 className="text-sm font-bold text-amber-200">حسابك معلق حالياً (بانتظار منح الإذن وتعيين المسؤولية)</h4>
                <p className="text-xs text-amber-300/80 mt-1 leading-relaxed">
                  مرحباً {userProfile.displayName || user.displayName}! تم تسجيل حسابك بنجاح وهو حالياً في وضع الاستعراض المعلق لحين قيام مدير النظام بمراجعة طلبك، منحه إذن العمل، وتعيين مسؤوليتك المحددة في الأسطول.
                </p>
              </div>
            </div>
          )}

          {/* Views Rendering */}
          <div>
            {activeTab === 'sales' && (
              <SalesDashboard
                onSwitchToFleet={() => setActiveTab('dashboard')}
                companyId={currentCompanyId}
                currentUser={{
                  name: userProfile?.displayName || user?.displayName || 'مسؤول المبيعات',
                  email: user?.email || undefined,
                  uid: user?.uid,
                  role: effectiveRole,
                }}
                canEdit={canEdit}
                canDelete={canDelete}
                isOnlineCloud={isOnlineCloud}
              />
            )}

            {activeTab === 'dashboard' && (
              <DashboardView
                vehicles={vehicles}
                trips={trips}
                drivers={drivers}
                maintenance={maintenance}
                alerts={alerts}
                monthlyReport={reportData}
                onNavigateTab={setActiveTab}
                onOpenNewTripModal={() => {
                  setEditingTrip(null);
                  setPresetTripPlace(null);
                  setIsTripModalOpen(true);
                }}
                onOpenNewDriverModal={() => {
                  setEditingDriver(null);
                  setIsDriverModalOpen(true);
                }}
                onOpenNewMaintModal={() => {
                  setEditingMaint(null);
                  setPresetVehicleIdForMaint(null);
                  setIsMaintModalOpen(true);
                }}
                onOpenMaintenanceModal={handleOpenMaintenanceForVehicle}
              />
            )}

            {activeTab === 'operations' && (
              <OperationsView
                tasks={tasks}
                vehicles={vehicles}
                drivers={drivers}
                locations={locations}
                regions={regions}
                trips={trips}
                onCreateTask={handleCreateTask}
                onUpdateTask={handleUpdateTask}
                onDeleteTask={handleDeleteTask}
                onOpenTripModal={() => {
                  setEditingTrip(null);
                  setPresetTripPlace(null);
                  setIsTripModalOpen(true);
                }}
                onEditTrip={(trip) => {
                  setEditingTrip(trip);
                  setIsTripModalOpen(true);
                }}
                onDeleteTrip={handleDeleteTrip}
                onOpenDriverMode={() => setActiveTab('driver_mode')}
                canEdit={canEdit}
                onSendInstantAlert={handleSendTaskInstantAlert}
              />
            )}

            {activeTab === 'fleet' && (
              <FleetView
                vehicles={vehicles}
                drivers={drivers}
                alerts={alerts}
                documents={vehicleDocuments}
                maintenance={maintenance}
                fuelRecords={fuelRecords}
                trips={trips}
                canEdit={canEdit}
                onOpenVehicleModal={() => {
                  setEditingVehicle(null);
                  setIsVehicleModalOpen(true);
                }}
                onEditVehicle={(veh) => {
                  setEditingVehicle(veh);
                  setIsVehicleModalOpen(true);
                }}
                onDeleteVehicle={handleDeleteVehicle}
                onOpenMaintenanceModal={() => {
                  setEditingMaint(null);
                  setPresetVehicleIdForMaint(null);
                  setIsMaintModalOpen(true);
                }}
                onEditMaintenance={(m) => {
                  setEditingMaint(m);
                  setPresetVehicleIdForMaint(m.vehicleId);
                  setIsMaintModalOpen(true);
                }}
                onDeleteMaintenance={handleDeleteMaintenance}
                onOpenFuelModal={() => {}}
                onEditFuel={() => {}}
                onDeleteFuel={handleDeleteFuel}
                onAddDocument={handleAddDocument}
                onUpdateVehicleStatus={(vehId, status) => {
                  setVehicles((prev) =>
                    prev.map((v) => (v.id === vehId ? { ...v, status } : v))
                  );
                }}
                onOpenZipUploadModal={() => setIsZipUploadModalOpen(true)}
              />
            )}

            {activeTab === 'people' && (
              <PeopleView
                drivers={drivers}
                vehicles={vehicles}
                canEdit={canEdit}
                onOpenDriverModal={() => {
                  setEditingDriver(null);
                  setIsDriverModalOpen(true);
                }}
                onEditDriver={(driver) => {
                  setEditingDriver(driver);
                  setIsDriverModalOpen(true);
                }}
                onDeleteDriver={handleDeleteDriver}
                onOpenDriverMode={() => setActiveTab('driver_mode')}
              />
            )}

            {activeTab === 'locations' && (
              <HierarchicalLocationsView
                locations={locations}
                regions={regions}
                areas={areas}
                branches={branches}
                canEdit={canEdit}
                onAddLocation={handleSaveLocation}
                onEditLocation={(loc) => {
                  setEditingLocation(loc);
                  setIsLocationModalOpen(true);
                }}
                onDeleteLocation={handleDeleteLocation}
              />
            )}

            {activeTab === 'automation' && (
              <AutomationView
                rules={automationRules}
                executions={automationExecutions}
                tasks={tasks}
                vehicles={vehicles}
                documents={vehicleDocuments}
                canEdit={canEdit}
                onToggleRule={handleToggleRule}
                onCreateRule={handleCreateRule}
                onSimulateExecution={handleSimulateExecution}
                onDeleteRule={handleDeleteRule}
                onRetryExecution={handleRetryExecution}
              />
            )}

            {activeTab === 'notifications' && (
              <NotificationsCenterView
                notifications={notifications}
                preferences={notificationPrefs}
                onMarkRead={handleMarkNotifRead}
                onMarkAllRead={handleMarkAllNotifsRead}
                onDeleteNotification={handleDeleteNotif}
                onSavePreferences={handleSaveNotificationPrefs}
                onSendTestNotification={handleSendTestNotif}
              />
            )}

            {activeTab === 'ai_center' && (
              <AICenterView
                tasks={tasks}
                vehicles={vehicles}
                drivers={drivers}
                locations={locations}
                maintenance={maintenance}
                rules={automationRules}
              />
            )}

            {activeTab === 'settings' && (
              <SettingsView
                currentCompany={currentCompany}
                auditLogs={auditLogs}
                userProfiles={allUsers}
                currentUserProfile={userProfile}
                effectiveRole={effectiveRole}
                canManageUsers={canManageUsers}
                onUpdateCompany={handleUpdateCompany}
                onUpdateUserRole={handleUpdateUserRole}
                onInviteUser={async (email, displayName, role) => {
                  await handleAddUser({ email, displayName, role });
                }}
                onDeleteUser={handleDeleteUser}
                onDownloadZip={handleDownloadProjectZip}
                isDownloadingZip={isDownloadingZip}
                onOpenZipUploadModal={() => setIsZipUploadModalOpen(true)}
              />
            )}

            {/* Direct & Legacy sheet views */}
            {activeTab === 'trips' && (
              <TripsSheetView
                trips={trips}
                vehicles={vehicles}
                drivers={drivers}
                onOpenNewTripModal={() => {
                  setEditingTrip(null);
                  setPresetTripPlace(null);
                  setIsTripModalOpen(true);
                }}
                onEditTrip={(trip) => {
                  setEditingTrip(trip);
                  setIsTripModalOpen(true);
                }}
                onDeleteTrip={handleDeleteTrip}
                onCompleteTrip={handleCompleteTrip}
                onDeleteMultipleTrips={handleDeleteMultipleTrips}
                onClearAllTrips={handleClearAllTrips}
                onAddSampleTrip={handleAddSampleTrip}
              />
            )}

            {activeTab === 'vehicles' && (
              <VehiclesSheetView
                vehicles={vehicles}
                drivers={drivers}
                alerts={alerts}
                onOpenNewVehicleModal={() => {
                  setEditingVehicle(null);
                  setIsVehicleModalOpen(true);
                }}
                onEditVehicle={(veh) => {
                  setEditingVehicle(veh);
                  setIsVehicleModalOpen(true);
                }}
                onDeleteVehicle={handleDeleteVehicle}
                onOpenMaintenanceModalForVehicle={handleOpenMaintenanceForVehicle}
              />
            )}

            {activeTab === 'drivers' && (
              <DriversSheetView
                drivers={drivers}
                vehicles={vehicles}
                onOpenNewDriverModal={() => {
                  setEditingDriver(null);
                  setIsDriverModalOpen(true);
                }}
                onEditDriver={(driver) => {
                  setEditingDriver(driver);
                  setIsDriverModalOpen(true);
                }}
                onDeleteDriver={handleDeleteDriver}
                onDeleteMultipleDrivers={handleDeleteMultipleDrivers}
                onClearAllDrivers={handleClearAllDrivers}
                onAddSampleDriver={handleAddSampleDriver}
              />
            )}

            {activeTab === 'maintenance' && (
              <MaintenanceSheetView
                maintenance={maintenance}
                vehicles={vehicles}
                alerts={alerts}
                onOpenNewMaintModal={() => {
                  setEditingMaint(null);
                  setPresetVehicleIdForMaint(null);
                  setIsMaintModalOpen(true);
                }}
                onEditMaint={(m) => {
                  setEditingMaint(m);
                  setPresetVehicleIdForMaint(m.vehicleId);
                  setIsMaintModalOpen(true);
                }}
                onDeleteMaint={handleDeleteMaintenance}
                onQuickServiceVehicle={handleOpenMaintenanceForVehicle}
              />
            )}

            {activeTab === 'fuel' && (
              <FuelSheetView
                fuelRecords={fuelRecords}
                vehicles={vehicles}
                drivers={drivers}
                onAddFuel={handleAddFuel}
                onDeleteFuel={handleDeleteFuel}
              />
            )}

            {activeTab === 'reports' && (
              <ReportsView
                trips={trips}
                vehicles={vehicles}
                drivers={drivers}
                maintenance={maintenance}
                fuelRecords={fuelRecords}
              />
            )}

            {activeTab === 'ai_assistant' && (
              <AIAssistantView
                vehicles={vehicles}
                drivers={drivers}
                trips={trips}
                maintenance={maintenance}
                fuelRecords={fuelRecords}
                onAddFuelRecord={handleAddFuel}
                onNavigateTab={(tab) => setActiveTab(tab)}
                onShowToast={showToast}
              />
            )}

            {activeTab === 'driver_mode' && (
              <DriverModeView
                trips={trips}
                vehicles={vehicles}
                drivers={drivers}
                isOnline={isOnlineCloud}
                onUpdateTrip={handleSaveTrip}
                onAddFuel={handleAddFuel}
                onUpdateVehicle={handleSaveVehicle}
              />
            )}

            {activeTab === 'users' && (
              <UsersManagementView
                currentUser={user}
                currentUserProfile={userProfile}
                users={allUsers}
                onUpdateUserRole={handleUpdateUserRole}
                onDeleteUser={handleDeleteUser}
                onGoogleLogin={handleLogin}
                onAddUser={handleAddUser}
                onUpdateUserDetails={handleUpdateUserDetails}
                drivers={drivers}
                showToast={showToast}
              />
            )}
          </div>
        </main>
      </div>

      {/* Modals */}
      <TripModal
        isOpen={isTripModalOpen}
        onClose={() => {
          setIsTripModalOpen(false);
          setPresetTripPlace(null);
        }}
        onSave={handleSaveTrip}
        editingTrip={editingTrip}
        vehicles={vehicles}
        drivers={drivers}
        locations={locations}
        presetPlace={presetTripPlace}
        onOpenNewDriverModal={() => {
          setEditingDriver(null);
          setIsDriverModalOpen(true);
        }}
      />

      <LocationModal
        isOpen={isLocationModalOpen}
        onClose={() => setIsLocationModalOpen(false)}
        onSave={handleSaveLocation}
        editingLocation={editingLocation}
        existingLocations={locations}
        availableRegions={availableRegions}
      />

      <VehicleModal
        isOpen={isVehicleModalOpen}
        onClose={() => setIsVehicleModalOpen(false)}
        onSave={handleSaveVehicle}
        editingVehicle={editingVehicle}
        drivers={drivers}
        onOpenNewDriverModal={() => {
          setEditingDriver(null);
          setIsDriverModalOpen(true);
        }}
      />

      <DriverModal
        isOpen={isDriverModalOpen}
        onClose={() => setIsDriverModalOpen(false)}
        onSave={handleSaveDriver}
        editingDriver={editingDriver}
        vehicles={vehicles}
      />

      <MaintenanceModal
        isOpen={isMaintModalOpen}
        onClose={() => setIsMaintModalOpen(false)}
        onSave={handleSaveMaintenance}
        editingMaint={editingMaint}
        vehicles={vehicles}
        presetVehicleId={presetVehicleIdForMaint}
      />

      <GoogleSheetsSyncModal
        isOpen={syncSuccessModalOpen}
        onClose={() => setSyncSuccessModalOpen(false)}
        spreadsheetUrl={spreadsheetUrl}
        syncedStats={{
          tripsCount: trips.length,
          vehiclesCount: vehicles.length,
          driversCount: drivers.length,
          maintenanceCount: maintenance.length,
          fuelCount: fuelRecords.length,
          locationsCount: locations.length,
        }}
      />

      <NotificationSettingsModal
        isOpen={isNotificationModalOpen}
        onClose={() => setIsNotificationModalOpen(false)}
        onTriggerBanner={(title, body, vehicleId) => setActiveToastBanner({ title, body, vehicleId })}
        vehicles={vehicles}
        userProfile={userProfile}
        onOpenMaintenanceModalForVehicle={handleOpenMaintenanceForVehicle}
      />

      <DailyEmailModal
        isOpen={isDailyEmailModalOpen}
        onClose={() => setIsDailyEmailModalOpen(false)}
        vehicles={vehicles}
        drivers={drivers}
        trips={trips}
        maintenance={maintenance}
        fuelRecords={fuelRecords}
        alerts={alerts}
        onShowToast={(title, message, type) =>
          showToast(title, message, type === 'error' ? 'error' : type === 'warning' ? 'info' : 'success')
        }
      />

      <ZipUploadModal
        isOpen={isZipUploadModalOpen}
        onClose={() => setIsZipUploadModalOpen(false)}
        vehicles={vehicles}
        currentCompanyId={currentCompany.id}
        onImportFleetData={handleImportFleetDataFromZip}
        onImportDocuments={handleImportDocumentsFromZip}
        onSuccessToast={(title, msg) => showToast(title, msg, 'success')}
      />

      {/* Professional Enterprise Login & Account Switcher Modal */}
      <LoginModal
        isOpen={isLoginModalOpen}
        onClose={() => setIsLoginModalOpen(false)}
        currentUser={user}
        userProfile={userProfile}
        effectiveRole={effectiveRole}
        onSelectRolePreview={(role) => {
          setEffectiveRole(role);
          showToast('تغيير الصلاحية', `تم التبديل إلى دور: ${role}`, 'info');
        }}
        onSuccessToast={(title, desc) => showToast(title, desc, 'success')}
        onErrorToast={(title, desc) => showToast(title, desc, 'error')}
      />

      {/* Offline Status Alert Banner */}
      <OfflineIndicator />

      {/* Mobile Sticky Bottom Navigation Bar for Smartphones */}
      <MobileBottomNav
        activeTab={activeTab}
        onTabChange={setActiveTab}
        urgentAlertsCount={alerts.filter((a) => a.severity === 'urgent').length}
      />
    </div>
  );
}
