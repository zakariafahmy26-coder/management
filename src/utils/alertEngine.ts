import { Driver, MaintenanceAlert, Vehicle } from '../types';

export function calculateFleetAlerts(
  vehicles: Vehicle[] = [],
  drivers: Driver[] = []
): MaintenanceAlert[] {
  const alerts: MaintenanceAlert[] = [];
  const today = new Date().toISOString().split('T')[0];

  (vehicles || []).forEach((veh) => {
    // 1. Oil change alert
    const remainingOilKm = veh.nextOilChangeKm - veh.currentOdometer;
    if (remainingOilKm <= 0) {
      alerts.push({
        id: `alert-oil-${veh.id}`,
        vehicleId: veh.id,
        vehiclePlate: veh.plateNumber,
        vehicleModel: veh.model,
        type: 'oil',
        title: 'تغيير زيت وفلتر متأخر وعاجل',
        message: `تجاوزت السيارة موعد تغيير الزيت بـ ${Math.abs(remainingOilKm).toLocaleString()} كم (العداد الحالي: ${veh.currentOdometer.toLocaleString()} كم).`,
        severity: 'urgent',
        metric: `متأخر بـ ${Math.abs(remainingOilKm).toLocaleString()} كم`,
        dueDetail: `الحد المستهدف كان: ${veh.nextOilChangeKm.toLocaleString()} كم`,
      });
    } else if (remainingOilKm <= 500) {
      alerts.push({
        id: `alert-oil-${veh.id}`,
        vehicleId: veh.id,
        vehiclePlate: veh.plateNumber,
        vehicleModel: veh.model,
        type: 'oil',
        title: 'موعد تغيير زيت وفلتر قريباً',
        message: `متبقي فقط ${remainingOilKm.toLocaleString()} كم على موعد تغيير الزيت القادم للسيارة.`,
        severity: 'warning',
        metric: `متبقي ${remainingOilKm.toLocaleString()} كم`,
        dueDetail: `مستحق عند: ${veh.nextOilChangeKm.toLocaleString()} كم`,
      });
    }

    // 2. Vehicle License Expiration
    if (veh.licenseExpiryDate) {
      const expiry = new Date(veh.licenseExpiryDate);
      const now = new Date(today);
      const diffTime = expiry.getTime() - now.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        alerts.push({
          id: `alert-lic-${veh.id}`,
          vehicleId: veh.id,
          vehiclePlate: veh.plateNumber,
          vehicleModel: veh.model,
          type: 'license',
          title: 'رخصة تسيير وفحص المركبة منتهية',
          message: `انتهت صلاحية رخصة تسيير السيارة بتاريخ ${veh.licenseExpiryDate} ومطلوب التجديد بالمرور.`,
          severity: 'urgent',
          metric: 'منتهية الصلاحية',
          dueDetail: `تاريخ الانتهاء: ${veh.licenseExpiryDate}`,
        });
      } else if (diffDays <= 30) {
        alerts.push({
          id: `alert-lic-${veh.id}`,
          vehicleId: veh.id,
          vehiclePlate: veh.plateNumber,
          vehicleModel: veh.model,
          type: 'license',
          title: 'تجديد رخصة التسيير قريباً',
          message: `متبقي ${diffDays} يوم فقط على انتهاء رخصة تسيير السيارة والفحص الفني.`,
          severity: 'warning',
          metric: `متبقي ${diffDays} يوم`,
          dueDetail: `تاريخ الانتهاء: ${veh.licenseExpiryDate}`,
        });
      }
    }

    // 3. Comprehensive Checkup
    if (veh.nextComprehensiveCheckDate) {
      const checkDate = new Date(veh.nextComprehensiveCheckDate);
      const now = new Date(today);
      const diffDays = Math.ceil((checkDate.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        alerts.push({
          id: `alert-comp-${veh.id}`,
          vehicleId: veh.id,
          vehiclePlate: veh.plateNumber,
          vehicleModel: veh.model,
          type: 'comprehensive',
          title: 'موعد فحص دوري شامل متأخر',
          message: `استحق موعد الفحص الدوري الشامل والصيانة الوقائية للسيارة بتاريخ ${veh.nextComprehensiveCheckDate}.`,
          severity: 'urgent',
          metric: 'متأخر',
          dueDetail: `الموعد المحدد: ${veh.nextComprehensiveCheckDate}`,
        });
      } else if (diffDays <= 14) {
        alerts.push({
          id: `alert-comp-${veh.id}`,
          vehicleId: veh.id,
          vehiclePlate: veh.plateNumber,
          vehicleModel: veh.model,
          type: 'comprehensive',
          title: 'موعد فحص دوري شامل وشيك',
          message: `يستحق الفحص الدوري الشامل للمركبة خلال ${diffDays} يوم.`,
          severity: 'warning',
          metric: `خلال ${diffDays} يوم`,
          dueDetail: `الموعد: ${veh.nextComprehensiveCheckDate}`,
        });
      }
    }
  });

  // 4. Driver License Expiration
  (drivers || []).forEach((driver) => {
    if (driver.licenseExpiryDate) {
      const expiry = new Date(driver.licenseExpiryDate);
      const now = new Date(today);
      const diffDays = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));

      if (diffDays <= 0) {
        alerts.push({
          id: `alert-dlic-${driver.id}`,
          vehicleId: driver.assignedVehicleId || '',
          vehiclePlate: 'سائق: ' + driver.name,
          vehicleModel: driver.licenseDegree,
          type: 'driver_license',
          title: 'رخصة قيادة السائق منتهية',
          message: `انتهت رخصة قيادة السائق ${driver.name} بتاريخ ${driver.licenseExpiryDate}. يرجى إيقافه عن خطوط السير حتى التجديد.`,
          severity: 'urgent',
          metric: 'منتهية',
          dueDetail: `تاريخ الانتهاء: ${driver.licenseExpiryDate}`,
        });
      } else if (diffDays <= 30) {
        alerts.push({
          id: `alert-dlic-${driver.id}`,
          vehicleId: driver.assignedVehicleId || '',
          vehiclePlate: 'سائق: ' + driver.name,
          vehicleModel: driver.licenseDegree,
          type: 'driver_license',
          title: 'تجديد رخصة قيادة السائق قريباً',
          message: `متبقي ${diffDays} يوم على انتهاء رخصة قيادة السائق ${driver.name} (${driver.licenseDegree}).`,
          severity: 'warning',
          metric: `متبقي ${diffDays} يوم`,
          dueDetail: `تاريخ الانتهاء: ${driver.licenseExpiryDate}`,
        });
      }
    }
  });

  // Sort urgent first, then warning
  return alerts.sort((a, b) => {
    if (a.severity === 'urgent' && b.severity !== 'urgent') return -1;
    if (a.severity !== 'urgent' && b.severity === 'urgent') return 1;
    return 0;
  });
}

// Alias with flexible arguments
export function generateFleetAlerts(
  vehicles: Vehicle[],
  drivers: Driver[],
  _trips?: any[],
  _maintenance?: any[]
): MaintenanceAlert[] {
  return calculateFleetAlerts(vehicles, drivers);
}

