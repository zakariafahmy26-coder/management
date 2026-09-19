export type MainRegion = 'الإسكندرية' | 'الساحل الشمالي' | 'البحيرة';

export type Region =
  | 'الإسكندرية'
  | 'الساحل الشمالي'
  | 'البحيرة'
  | 'خط مشترك (إسكندرية - بحيرة)'
  | 'خط مشترك (إسكندرية - الساحل)';

export type TabKey =
  | 'sales'
  | 'dashboard'
  | 'operations'
  | 'fleet'
  | 'people'
  | 'locations'
  | 'automation'
  | 'notifications'
  | 'reports'
  | 'ai_center'
  | 'settings'
  // Legacy / Direct sub-tabs for backward compatibility
  | 'ai_assistant'
  | 'trips'
  | 'vehicles'
  | 'drivers'
  | 'fuel'
  | 'maintenance'
  | 'driver_mode'
  | 'users';

// Multi-Company
export interface Company {
  id: string;
  name: string;
  nameAr?: string;
  code: string;
  industry: string;
  taxNumber?: string;
  commercialRegister?: string;
  phone?: string;
  email?: string;
  address?: string;
  active: boolean;
  createdAt: string;
}

// Role-Based Access Control
export type UserRole =
  | 'SUPER_ADMIN'
  | 'COMPANY_ADMIN'
  | 'OPERATIONS_MANAGER'
  | 'SUPERVISOR'
  | 'DISPATCHER'
  | 'FINANCE'
  | 'MAINTENANCE'
  | 'DRIVER'
  | 'VIEWER'
  // Lowercase aliases for backward compatibility
  | 'admin'
  | 'manager'
  | 'operation'
  | 'finance'
  | 'driver'
  | 'maintenance'
  | 'viewer';

export type Permission =
  | 'dashboard.view'
  | 'tasks.view'
  | 'tasks.create'
  | 'tasks.edit'
  | 'tasks.delete'
  | 'tasks.assign'
  | 'tasks.complete'
  | 'fleet.view'
  | 'fleet.create'
  | 'fleet.edit'
  | 'fleet.delete'
  | 'drivers.view'
  | 'drivers.create'
  | 'drivers.edit'
  | 'drivers.delete'
  | 'maintenance.view'
  | 'maintenance.create'
  | 'maintenance.edit'
  | 'fuel.view'
  | 'fuel.create'
  | 'fuel.edit'
  | 'locations.view'
  | 'locations.manage'
  | 'automation.view'
  | 'automation.create'
  | 'automation.edit'
  | 'automation.delete'
  | 'automation.execute'
  | 'notifications.view'
  | 'notifications.manage'
  | 'reports.view'
  | 'reports.export'
  | 'ai.use'
  | 'users.view'
  | 'users.manage'
  | 'settings.manage'
  | 'audit.view'
  | 'sales.view'
  | 'sales.create'
  | 'sales.edit'
  | 'sales.delete'
  | 'sales.export';

export type UserStatus = 'active' | 'pending' | 'suspended';

export interface UserProfile {
  uid: string;
  companyId?: string;
  email: string;
  displayName: string;
  name?: string;
  phone?: string;
  username?: string;
  photoURL?: string;
  role: UserRole;
  status: UserStatus;
  jobTitle?: string;
  department?: string;
  assignedBranch?: string;
  assignedDriverId?: string;
  customPermissions?: Permission[] | string[];
  createdAt: string;
  lastActive?: string;
  updatedAt?: string;
}

// Hierarchical Locations (Region -> Area -> Branch -> Location)
export interface RegionItem {
  id: string;
  companyId?: string;
  name: string;
  nameAr?: string;
  code?: string;
  status: 'نشط' | 'غير نشط' | 'active' | 'inactive';
  description?: string;
  color?: string;
  areasCount?: number;
  locationsCount?: number;
  createdAt?: string;
}

export interface AreaItem {
  id: string;
  companyId?: string;
  regionId: string;
  regionName: string;
  name: string;
  code: string;
  status: 'active' | 'inactive' | 'نشط' | 'غير نشط';
  branchesCount?: number;
  notes?: string;
}

export interface BranchItem {
  id: string;
  companyId?: string;
  areaId: string;
  areaName: string;
  regionId: string;
  regionName: string;
  name: string;
  code: string;
  manager?: string;
  phone?: string;
  address?: string;
  status: 'active' | 'inactive' | 'نشط' | 'غير نشط';
}

export type LocationCategory =
  | 'مصنع'
  | 'مستودع ومخزن'
  | 'ميناء بحري'
  | 'ميناء'
  | 'فرع وتوزيع'
  | 'عميل رئيسي'
  | 'أخرى'
  | 'Factory'
  | 'Warehouse'
  | 'Port'
  | 'Branch'
  | 'Client';

export interface LocationPlace {
  id: string;
  companyId?: string;
  name: string; // e.g. مصنع برج العرب
  code: string; // e.g. LOC-ALX-01
  region: MainRegion | string; // e.g. الإسكندرية
  regionId?: string; // foreign key to Region
  areaId?: string;
  areaName?: string;
  branchId?: string;
  branchName?: string;
  category: LocationCategory;
  address?: string;
  contactPerson?: string;
  contactPhone?: string;
  status?: 'نشط' | 'مؤقت' | 'active' | 'inactive';
  notes?: string;
  coordinates?: [number, number];
  latitude?: number;
  longitude?: number;
}

// Daily Operations & Tasks
export type TaskStatus =
  | 'PENDING'
  | 'ASSIGNED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'DELAYED'
  | 'CANCELLED';

export type TaskPriority = 'LOW' | 'NORMAL' | 'HIGH' | 'CRITICAL';

export interface TaskActivityLog {
  id: string;
  timestamp: string;
  actor: string;
  action: string;
  notes?: string;
  status?: TaskStatus;
}

export interface OperationTask {
  id: string;
  companyId: string;
  taskCode: string;
  title: string;
  date: string; // YYYY-MM-DD
  regionId: string;
  regionName: string;
  areaId?: string;
  areaName?: string;
  locationId: string;
  locationName: string;
  vehicleId?: string;
  vehiclePlate?: string;
  driverId?: string;
  driverName?: string;
  priority: TaskPriority;
  startTime?: string;
  dueTime?: string;
  completedTime?: string;
  status: TaskStatus;
  delayMinutes?: number;
  notes?: string;
  attachments?: string[];
  checklist?: { id: string; text: string; completed: boolean }[];
  activityTimeline: TaskActivityLog[];
  createdBy?: string;
  createdAt: string;
  updatedAt?: string;
}

// Fleet & Vehicles
export type VehicleStatus =
  | 'AVAILABLE'
  | 'ASSIGNED'
  | 'MAINTENANCE'
  | 'OUT_OF_SERVICE'
  // Arabic aliases
  | 'جاهزة للعمل'
  | 'في خط سير'
  | 'في الصيانة'
  | 'خارج الخدمة'
  | 'متاح'
  | 'في رحلة';

export type FuelType = 'سولار' | 'بنزين 92' | 'بنزين 95' | 'غاز طبيعي' | 'Diesel' | 'Gasoline';

export interface VehicleDocument {
  id: string;
  companyId: string;
  vehicleId: string;
  vehiclePlate: string;
  documentType: 'LICENSE' | 'INSURANCE' | 'PERIODIC_INSPECTION' | 'INSPECTION' | 'ENVIRONMENTAL_PERMIT' | 'COMMERCIAL_REGISTRATION';
  title: string;
  documentNumber: string;
  issueDate: string;
  expiryDate: string;
  status: 'VALID' | 'EXPIRING_SOON' | 'EXPIRED';
  issuer: string;
  issuingAuthority?: string;
  reminderDaysBefore?: number;
  notes?: string;
  fileUrl?: string;
}

export interface Vehicle {
  id: string;
  companyId?: string;
  plateNumber: string; // e.g. س ف ر 8923
  code: string; // e.g. V-01
  brand?: string; // e.g. شيفروليه, إيسوزو, مرسيدس
  model: string; // e.g. شيفروليه جامبو 7000
  vehicleType?: string; // نوع المركبة: شاحنة / نقل / مبرد / ميكروباص / Heavy Truck / Box Truck / Refrigerated
  year: number;
  fuelType: FuelType;
  tankCapacity: number; // liters
  avgConsumptionPer100Km: number; // L/100km
  currentOdometer: number; // km
  assignedDriverId?: string;
  assignedDriverName?: string;
  region?: string;
  regionId?: string;
  status: VehicleStatus;
  licenseExpiryDate: string; // YYYY-MM-DD
  insuranceExpiryDate?: string; // YYYY-MM-DD
  inspectionExpiryDate?: string;
  lastMaintenanceDate?: string;
  nextMaintenanceDate?: string;
  oilChangeIntervalKm: number; // e.g. 5000 or 10000
  lastOilChangeKm: number;
  nextOilChangeKm: number;
  nextOilChangeOdometer?: number;
  lastComprehensiveCheckDate: string;
  nextComprehensiveCheckDate: string;
  documents?: VehicleDocument[];
  notes?: string;
}

export type DriverStatus = 'متاح للعمل' | 'في رحلة' | 'إجازة' | 'غير متاح' | 'AVAILABLE' | 'ON_TRIP' | 'ON_LEAVE' | 'UNAVAILABLE';
export type LicenseDegree = 'درجة أولى' | 'درجة ثانية' | 'درجة ثالثة' | 'خاصة' | 'معدات ثقيلة' | 'First Class' | 'Second Class' | 'Third Class';
export type DriverShift = 'وردية صباحية' | 'وردية مسائية' | 'وردية ليلية' | 'تشغيل مرن';
export type OperatingZone = 'الإسكندرية' | 'الساحل الشمالي' | 'البحيرة' | 'جميع المحاور';

export interface DriverPerformanceStats {
  completedTrips: number;
  completedTasks: number;
  delayedTasks: number;
  onTimePercentage: number;
  completionPercentage: number;
  incidentCount: number;
  performanceScore: number; // 0 - 100
}

export interface Driver {
  id: string;
  companyId?: string;
  employeeId?: string;
  code: string; // e.g. D-01
  name: string;
  phone: string;
  nationalId: string;
  licenseDegree: LicenseDegree;
  licenseNumber?: string;
  licenseExpiryDate: string; // YYYY-MM-DD
  licenseIssueDate?: string; // YYYY-MM-DD
  licenseIssuePlace?: string; // e.g. مرور برج العرب / مرور محرم بك
  regionId?: string;
  regionName?: string;
  operatingZone?: OperatingZone | string;
  shift?: DriverShift | string;
  status: DriverStatus;
  assignedVehicleId?: string;
  assignedVehiclePlate?: string;
  bloodType?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  address?: string;
  dateOfJoining?: string;
  medicalFitnessNotes?: string;
  totalCompletedTrips?: number;
  salaryOrDailyRate?: string | number;
  rating: number; // 1-5
  performance?: DriverPerformanceStats;
  photoURL?: string; // Driver personal picture
  notes?: string;
}

// Automation Rules & Executions
export type AutomationTrigger =
  | 'TASK_CREATED'
  | 'TASK_ASSIGNED'
  | 'TASK_STARTED'
  | 'TASK_COMPLETED'
  | 'TASK_OVERDUE'
  | 'TASK_DELAYED'
  | 'TASK_CANCELLED'
  | 'VEHICLE_MAINTENANCE_DUE'
  | 'MAINTENANCE_DUE'
  | 'VEHICLE_DOCUMENT_EXPIRING'
  | 'DOCUMENT_EXPIRING'
  | 'DRIVER_LICENSE_EXPIRING'
  | 'DAILY_SCHEDULE'
  | 'WEEKLY_SCHEDULE'
  | 'MONTHLY_SCHEDULE';

export type AutomationOperator =
  | 'equals'
  | 'not equals'
  | 'greater than'
  | 'less than'
  | 'contains'
  | 'in list'
  | 'date before'
  | 'date after';

export type AutomationActionType =
  | 'CREATE_ALERT'
  | 'SEND_NOTIFICATION'
  | 'SEND_EMAIL'
  | 'CREATE_TASK'
  | 'UPDATE_TASK'
  | 'ASSIGN_DRIVER'
  | 'ASSIGN_VEHICLE'
  | 'ESCALATE_TO_MANAGER'
  | 'GENERATE_REPORT'
  | 'UPDATE_VEHICLE_STATUS'
  | 'ASSIGN_TASK'
  | 'NOTIFY_MANAGER'
  | 'CREATE_NOTIFICATION'
  | 'ASSIGN_BACKUP_DRIVER'
  | 'CHANGE_STATUS'
  | 'SEND_MONTHLY_REPORT';

export interface AutomationCondition {
  field: string;
  operator: AutomationOperator;
  value: string | number;
}

export interface AutomationAction {
  type: AutomationActionType;
  parameters?: Record<string, any>;
  params?: Record<string, any>;
  target?: string;
}

export interface AutomationScheduleConfig {
  scheduleHour?: number; // 0-23
  scheduleMinute?: number; // 0-59
  dayOfWeek?: number; // 0 (Sunday) to 6 (Saturday)
  dayOfMonth?: number; // 1-31
  timezone?: string;
}

export interface AutomationRule {
  id: string;
  companyId: string;
  name: string;
  description: string;
  trigger: AutomationTrigger;
  conditions: AutomationCondition[];
  actions: AutomationAction[];
  enabled: boolean;
  executionCount: number;
  lastExecutedAt?: string;
  scheduleConfig?: AutomationScheduleConfig;
  deduplicationWindowMinutes?: number;
  createdBy: string;
  createdAt: string;
  updatedAt?: string;
}

export type AutomationExecutionStatus =
  | 'RUNNING'
  | 'SUCCESS'
  | 'PARTIAL_SUCCESS'
  | 'FAILED'
  | 'SKIPPED';

export interface AutomationActionResult {
  actionType: string;
  status: 'SUCCESS' | 'FAILED' | 'SKIPPED';
  output?: any;
  error?: string;
  executedAt: string;
}

export interface AutomationExecution {
  id: string;
  companyId: string;
  ruleId: string;
  ruleName: string;
  trigger: AutomationTrigger;
  triggeredBy: string;
  executionTime: string;
  status: AutomationExecutionStatus;
  details: string;
  actionResults?: AutomationActionResult[] | any[];
  error?: string;
  errorDetails?: string; // backwards compatibility
  retryCount?: number;
  completedAt?: string;
  affectedEntityId?: string;
  idempotencyKey?: string;
}

// Safe Migration Status
export interface MigrationStatus {
  companyId: string;
  isMigrated: boolean;
  migratedAt?: string;
  recordsMigrated: {
    vehicles: number;
    drivers: number;
    tasks: number;
    trips: number;
    maintenance: number;
    locations: number;
    fuel: number;
    notifications: number;
    auditLogs: number;
  };
  errors?: string[];
}

// Local Offline Mutation Queue Item
export interface OfflineMutationItem {
  operationId: string;
  companyId: string;
  collection: string;
  documentId: string;
  operationType: 'create' | 'update' | 'delete';
  payload: any;
  timestamp: number;
  retryCount: number;
  conflictStatus: 'none' | 'conflict_detected' | 'resolved';
  error?: string;
}

// Notifications Center
export type NotificationType =
  | 'TASK_NEW'
  | 'TASK_ASSIGNED'
  | 'TASK_OVERDUE'
  | 'MAINTENANCE_DUE'
  | 'DOCUMENT_EXPIRING'
  | 'AUTOMATION_ALERT'
  | 'SYSTEM_ALERT';

export type NotificationStatus = 'UNREAD' | 'READ';

export interface AppNotification {
  id: string;
  companyId: string;
  userId?: string;
  type: NotificationType;
  title: string;
  message: string;
  status: NotificationStatus;
  severity: 'info' | 'warning' | 'urgent';
  entityType?: string;
  entityId?: string;
  createdAt: string;
  readAt?: string;
}

export interface UserNotificationPreferences {
  emailNotifications: boolean;
  inAppAlerts: boolean;
  overdueTaskAlerts: boolean;
  maintenanceDueAlerts: boolean;
  documentExpiryAlerts: boolean;
  automationExecutionAlerts: boolean;
  maintenanceDueKmThreshold: number; // e.g. 500 km
  documentExpiryDaysThreshold: number; // e.g. 30 days
  emailAlerts?: boolean;
  notifyOnTaskDelay?: boolean;
  oilAlertThresholdKm?: number;
  documentAlertDays?: number;
}

// Audit Logs
export interface AuditLog {
  id: string;
  companyId: string;
  userId: string;
  userName: string;
  userRole: string;
  action: string;
  entity: string;
  entityId: string;
  oldValue?: any;
  newValue?: any;
  timestamp: string;
  details?: string;
}

// AI Copilot
export interface AICopilotResponse {
  reply: string;
  structured?: {
    facts: string[];
    calculations: string[];
    predictions: string[];
    recommendations: string[];
  };
}

export interface AIConversation {
  id: string;
  companyId: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
}

export interface AIMessage {
  id: string;
  conversationId: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
  structured?: {
    facts?: string[];
    calculations?: string[];
    predictions?: string[];
    recommendations?: string[];
  };
}

export type TripStatus =
  | 'جارية'
  | 'مكتملة'
  | 'معلقة'
  | 'ملغاة'
  | 'جارية حالياً'
  | 'مجدولة'
  | 'متأخرة';

export interface TripRoute {
  id: string;
  companyId?: string;
  tripCode: string; // e.g. TRIP-102
  tripNumber?: string;
  date: string; // YYYY-MM-DD
  startTime?: string; // e.g. "08:00"
  endTime?: string; // e.g. "12:30"
  region: Region;
  regionId?: string;
  locationId?: string;
  routeName: string; // e.g. برج العرب -> سموحة -> العجمي
  startLocation?: string; // e.g. مصنع برج العرب
  destination?: string; // e.g. المنتزه
  destinationStops: string[]; // e.g. ["مخزن العامرية", "فرع سموحة", "توكيل العجمي"]
  vehicleId: string;
  driverId: string;
  startOdometer: number;
  endOdometer: number;
  distanceKm: number;
  fuelLiters: number;
  fuelPricePerLiter: number;
  fuelTotalCost: number;
  tollTaxes: number; // كارتات وبوابات
  tollCost?: number; // alias for tollTaxes
  otherExpenses: number; // إكراميات وخدمات
  tripCostTotal: number;
  status: TripStatus;
  cargoType?: string; // e.g. بضائع مجمدة / كراتين مواد خام
  odometerPhoto?: string; // صورة عداد البداية أو النهاية
  deliverySignature?: string; // صورة التوقيع الرقمي لتسليم الحمولة بصيغة Base64 Data URL
  signerName?: string; // اسم الموقع (السائق أو مستلم الحمولة)
  signedAt?: string; // توقيت التوقيع الرقمي ISO string
  notes?: string;
  startCoords?: [number, number];
  endCoords?: [number, number];
  syncStatus?: 'synced' | 'pending';
}

export type MaintenanceType =
  | 'تغيير زيت'
  | 'فلاتر'
  | 'فرامل'
  | 'إطارات'
  | 'بطارية'
  | 'صيانة دورية'
  | 'أعطال'
  | 'أخرى'
  | 'تغيير زيت وفلتر'
  | 'إطارات وترصيص'
  | 'تيل فرامل وتيل هواء'
  | 'سيور وفلاتر دورية'
  | 'صيانة كهرباء وبطارية'
  | 'تغيير بطارية ودينامو'
  | 'عمرة وفحص دوري شامل'
  | 'تجديد فحص ورخصة';

export type MaintenanceStatus = 'مكتملة' | 'مجدولة' | 'متأخرة';

export interface MaintenanceRecord {
  id: string;
  companyId?: string;
  recordCode: string; // e.g. M-201
  vehicleId: string;
  maintenanceType: MaintenanceType;
  date: string;
  odometerAtService: number;
  nextDueOdometer: number;
  nextMaintenanceOdometer?: number;
  nextDueDate?: string;
  nextMaintenanceDate?: string;
  cost: number;
  totalCost?: number; // alias for cost
  workshopName: string; // مركز الصيانة أو الورشة
  invoiceNumber?: string;
  status: MaintenanceStatus;
  notes?: string;
  syncStatus?: 'synced' | 'pending';
}

export interface FuelRecord {
  id: string;
  companyId?: string;
  date: string;
  vehicleId: string;
  driverId?: string;
  quantity: number; // باللترات
  price: number; // سعر اللتر
  totalCost: number; // التكلفة الإجمالية
  odometer: number; // قراءة العداد عند التموين
  station: string; // اسم المحطة (مثل: وطنية، موبيل، شل)
  receiptImage?: string; // صورة فاتورة/إيصال الوقود
  notes?: string;
  createdAt?: string;
  syncStatus?: 'synced' | 'pending';
}

export interface ExpenseRecord {
  id: string;
  companyId?: string;
  date: string;
  vehicleId: string;
  category: 'كارتات وبوابات' | 'غسيل وتشحيم' | 'مبيت وإعاشة' | 'مواقف ومخالفات' | 'أخرى';
  amount: number;
  description: string;
  receiptImage?: string;
  notes?: string;
  createdAt?: string;
  syncStatus?: 'synced' | 'pending';
}

export type AlertSeverity = 'urgent' | 'warning' | 'normal';

export interface MaintenanceAlert {
  id: string;
  vehicleId: string;
  vehiclePlate: string;
  vehicleModel: string;
  type: 'oil' | 'license' | 'driver_license' | 'comprehensive' | 'insurance' | 'maintenance_due' | 'delayed_trip';
  title: string;
  message: string;
  severity: AlertSeverity;
  metric: string; // e.g. "متبقي 120 كم" or "متأخر بـ 350 كم"
  dueDetail: string;
}

export interface RegionReport {
  region: Region;
  tripCount: number;
  totalDistanceKm: number;
  fuelCost: number;
  tollCost: number;
  totalCost: number;
  avgCostPerKm: number;
}

export interface VehicleExpenseReport {
  vehicleId: string;
  plateNumber: string;
  model: string;
  tripCount: number;
  totalKm: number;
  fuelLiters: number;
  fuelCost: number;
  maintenanceCost: number;
  tollsCost: number;
  totalCost: number;
  costPerKm: number;
}

export interface MonthlyReportSummary {
  id?: string;
  month?: string;
  monthYear: string; // e.g. "2026-09"
  totalTrips: number;
  totalDistanceKm: number;
  totalFuelLiters?: number;
  totalFuelCost: number;
  totalMaintenanceCost: number;
  totalTollAndOtherCost: number;
  grandTotalCost: number;
  avgCostPerKm: number;
  regionBreakdown?: RegionReport[];
  regionsSummary?: any[];
  vehicleBreakdown?: VehicleExpenseReport[];
  vehicleSummary?: any[];
}

export type AppPlatform = 'web' | 'pwa' | 'android' | 'windows';

export interface DailyEmailConfig {
  enabled: boolean;
  status?: 'active' | 'inactive';
  scheduleHour: number; // 0-23, default 17 (5:00 PM)
  scheduleMinute: number; // 0-59, default 0
  recipients: string[]; // default configured recipient or ['operations@company.com']
  ccRecipients?: string[];
  includeAISummary: boolean;
  lastSentDate?: string; // YYYY-MM-DD
  lastSentTimestamp?: string;
  smtpHost?: string;
  smtpPort?: number;
  smtpUser?: string;
  smtpPass?: string;
  // Monthly Report Automation Schedule
  monthlyReportEnabled?: boolean; // Scheduled monthly report on 1st of every month
  monthlyReportDayOfMonth?: number; // 1-31, default 1
  monthlyReportHour?: number; // 0-23, default 8 (08:00 AM)
  monthlyReportMinute?: number; // 0-59, default 0
  sendToAllManagers?: boolean; // send automatically to all registered managers
  lastMonthlyReportSentMonth?: string; // YYYY-MM
  lastMonthlyReportSentTimestamp?: string;
}

export interface DailyEmailLog {
  id: string;
  timestamp: string;
  date: string;
  recipients: string[];
  subject: string;
  status: 'sent' | 'failed' | 'simulated';
  previewUrl?: string;
  summaryStats: {
    totalTrips: number;
    activeVehicles: number;
    oilAlertsCount: number;
    totalFuelCost: number;
    totalMaintenanceCost: number;
    totalDailyExpenses: number;
  };
  errorMessage?: string;
}

export interface ZipArchiveEntry {
  path: string;
  name: string;
  size: number;
  uncompressedSize?: number;
  isDirectory: boolean;
  date?: string;
  extension?: string;
  category?: 'image' | 'document' | 'data' | 'code' | 'other';
  previewUrl?: string;
}

export interface ZipUploadResult {
  archiveId: string;
  fileName: string;
  fileSize: number;
  totalFiles: number;
  uncompressedSize: number;
  entries: ZipArchiveEntry[];
  detectedType: 'fleet_backup' | 'documents_archive' | 'source_code' | 'mixed_archive';
  storedPath?: string;
  downloadUrl?: string;
  uploadedAt: string;
}

