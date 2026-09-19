import { MaintenanceRecord, MonthlyReportSummary, Region, RegionReport, TripRoute, Vehicle, VehicleExpenseReport } from '../types';

export function generateMonthlyExpenseReport(
  monthYear: string, // e.g. "2026-09" or "all"
  trips: TripRoute[],
  maintenanceList: MaintenanceRecord[],
  vehicles: Vehicle[]
): MonthlyReportSummary {
  // Filter trips by month if specified
  const filteredTrips = monthYear === 'all'
    ? trips
    : trips.filter((t) => t.date.startsWith(monthYear));

  // Filter maintenance records by month if specified
  const filteredMaintenance = monthYear === 'all'
    ? maintenanceList
    : maintenanceList.filter((m) => m.date.startsWith(monthYear));

  // Aggregate trip stats
  let totalDistanceKm = 0;
  let totalFuelLiters = 0;
  let totalFuelCost = 0;
  let totalTollAndOtherCost = 0;

  filteredTrips.forEach((trip) => {
    totalDistanceKm += trip.distanceKm;
    totalFuelLiters += trip.fuelLiters;
    totalFuelCost += trip.fuelTotalCost;
    totalTollAndOtherCost += (trip.tollTaxes || 0) + (trip.otherExpenses || 0);
  });

  // Aggregate maintenance costs
  let totalMaintenanceCost = 0;
  filteredMaintenance.forEach((m) => {
    totalMaintenanceCost += m.cost;
  });

  const grandTotalCost = totalFuelCost + totalMaintenanceCost + totalTollAndOtherCost;
  const avgCostPerKm = totalDistanceKm > 0 ? grandTotalCost / totalDistanceKm : 0;

  // Region Breakdown
  const regions: Region[] = [
    'الإسكندرية',
    'الساحل الشمالي',
    'البحيرة',
    'خط مشترك (إسكندرية - بحيرة)',
    'خط مشترك (إسكندرية - الساحل)',
  ];

  const regionBreakdown: RegionReport[] = regions.map((region) => {
    const regionTrips = filteredTrips.filter((t) => t.region === region);
    const tripCount = regionTrips.length;
    const distance = regionTrips.reduce((sum, t) => sum + t.distanceKm, 0);
    const fuel = regionTrips.reduce((sum, t) => sum + t.fuelTotalCost, 0);
    const tolls = regionTrips.reduce((sum, t) => sum + ((t.tollTaxes || 0) + (t.otherExpenses || 0)), 0);
    const cost = fuel + tolls;
    const costKm = distance > 0 ? cost / distance : 0;

    return {
      region,
      tripCount,
      totalDistanceKm: distance,
      fuelCost: fuel,
      tollCost: tolls,
      totalCost: cost,
      avgCostPerKm: costKm,
    };
  }).filter((r) => r.tripCount > 0);

  // Vehicle Breakdown
  const vehicleBreakdown: VehicleExpenseReport[] = vehicles.map((veh) => {
    const vehTrips = filteredTrips.filter((t) => t.vehicleId === veh.id);
    const vehMaint = filteredMaintenance.filter((m) => m.vehicleId === veh.id);

    const tripCount = vehTrips.length;
    const totalKm = vehTrips.reduce((sum, t) => sum + t.distanceKm, 0);
    const fuelLiters = vehTrips.reduce((sum, t) => sum + t.fuelLiters, 0);
    const fuelCost = vehTrips.reduce((sum, t) => sum + t.fuelTotalCost, 0);
    const tollsCost = vehTrips.reduce((sum, t) => sum + ((t.tollTaxes || 0) + (t.otherExpenses || 0)), 0);
    const maintenanceCost = vehMaint.reduce((sum, m) => sum + m.cost, 0);
    const totalCost = fuelCost + maintenanceCost + tollsCost;
    const costPerKm = totalKm > 0 ? totalCost / totalKm : 0;

    return {
      vehicleId: veh.id,
      plateNumber: veh.plateNumber,
      model: veh.model,
      tripCount,
      totalKm,
      fuelLiters,
      fuelCost,
      maintenanceCost,
      tollsCost,
      totalCost,
      costPerKm,
    };
  });

  return {
    monthYear,
    totalTrips: filteredTrips.length,
    totalDistanceKm,
    totalFuelLiters,
    totalFuelCost,
    totalMaintenanceCost,
    totalTollAndOtherCost,
    grandTotalCost,
    avgCostPerKm,
    regionBreakdown,
    vehicleBreakdown,
  };
}

export function getAvailableMonths(trips: TripRoute[], maintenance: MaintenanceRecord[]): string[] {
  const set = new Set<string>();
  trips.forEach((t) => {
    if (t.date && t.date.length >= 7) {
      set.add(t.date.substring(0, 7));
    }
  });
  maintenance.forEach((m) => {
    if (m.date && m.date.length >= 7) {
      set.add(m.date.substring(0, 7));
    }
  });

  const arr = Array.from(set).sort().reverse();
  if (arr.length === 0) {
    arr.push('2026-09');
  }
  return arr;
}

export function generateMonthlyReport(
  vehicles: Vehicle[],
  trips: TripRoute[],
  maintenance: MaintenanceRecord[],
  monthYear: string = 'all'
): MonthlyReportSummary {
  return generateMonthlyExpenseReport(monthYear, trips, maintenance, vehicles);
}

