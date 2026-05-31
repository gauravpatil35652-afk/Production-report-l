/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductionReport, ProductionStats, DowntimeReason } from '../types';

export const SHEET_DENSITIES: Record<string, number> = {
  'Mild Steel (MS-Grade D)': 7.85,
  'Stainless Steel (SS-304)': 7.93,
  'Stainless Steel (SS-316)': 8.00,
  'Aluminum 5052-H32': 2.68,
  'Aluminum 6061-T6': 2.70,
  'Copper C101': 8.96,
  'Galvanized Iron (GI-Zinc)': 7.85,
  'Cold Rolled Steel (CRS)': 7.85,
  'DP600 (Dual Phase Automotive Steel)': 7.85,
  'DP800 (High-Strength Automotive Steel)': 7.85,
  'CR4 (Cold Rolled Mild Steel)': 7.85,
  'Aluminum 6016-T4 (Automotive Panel)': 2.70,
  'Aluminum 5182 (Automotive Structure)': 2.65
};

export function getDensityByMaterial(material: string): number {
  const norm = (material || '').toLowerCase().trim();
  if (norm.includes('ss-304') || norm.includes('ss 304')) return 7.93;
  if (norm.includes('ss-316') || norm.includes('ss 316')) return 8.00;
  if (norm.includes('stainless')) return 7.93;
  if (norm.includes('dp600') || norm.includes('dp800') || norm.includes('dual phase')) return 7.85;
  if (norm.includes('cr4')) return 7.85;
  if (norm.includes('aluminum') || norm.includes('aluminium')) {
    if (norm.includes('5052')) return 2.68;
    if (norm.includes('6061')) return 2.70;
    if (norm.includes('6016')) return 2.70;
    if (norm.includes('5182')) return 2.65;
    return 2.70;
  }
  if (norm.includes('copper') || norm.includes('c101')) return 8.96;
  if (norm.includes('galvanized') || norm.includes('gi-zinc') || norm.includes('gi ')) return 7.85;
  if (norm.includes('mild steel') || norm.includes('ms-grade d') || norm.includes('ms ')) return 7.85;
  if (norm.includes('cold rolled') || norm.includes('crs')) return 7.85;
  
  // Custom lookup
  for (const [key, density] of Object.entries(SHEET_DENSITIES)) {
    if (norm.includes(key.toLowerCase())) {
      return density;
    }
  }
  
  return 7.85; // Default standard steel density
}

export const SHEET_RETAIL_PRICES_INR: Record<string, number> = {
  'DP600 (Dual Phase Automotive Steel)': 92.50,
  'DP800 (High-Strength Automotive Steel)': 108.00,
  'CR4 (Cold Rolled Mild Steel)': 76.50,
  'Aluminum 6016-T4 (Automotive Panel)': 285.00,
  'Aluminum 5182 (Automotive Structure)': 268.00,
  'Mild Steel (MS-Grade D)': 64.00,
  'Stainless Steel (SS-304)': 225.00,
  'Stainless Steel (SS-316)': 318.00,
  'Aluminum 5052-H32': 248.00,
  'Aluminum 6061-T6': 272.00,
  'Copper C101': 775.00,
  'Galvanized Iron (GI-Zinc)': 83.00,
  'Cold Rolled Steel (CRS)': 74.50
};

export function getRetailPricePerKgByMaterial(material: string): number {
  const norm = (material || '').toLowerCase().trim();
  if (norm.includes('ss-304') || norm.includes('ss 304')) return 225;
  if (norm.includes('ss-316') || norm.includes('ss 316')) return 318;
  if (norm.includes('stainless')) return 225;
  if (norm.includes('dp600') || norm.includes('dual phase 600') || norm.includes('dp 600')) return 92.50;
  if (norm.includes('dp800') || norm.includes('dual phase 800') || norm.includes('dp 800')) return 108.00;
  if (norm.includes('dual phase')) return 100;
  if (norm.includes('cr4')) return 76.50;
  if (norm.includes('6016')) return 285;
  if (norm.includes('5182')) return 268;
  if (norm.includes('aluminum 5052') || norm.includes('al 5052')) return 248;
  if (norm.includes('aluminum 6061') || norm.includes('al 6061')) return 272;
  if (norm.includes('aluminum') || norm.includes('aluminium')) return 255;
  if (norm.includes('copper') || norm.includes('c101')) return 775;
  if (norm.includes('galvanized') || norm.includes('gi-zinc') || norm.includes('gi ')) return 83;
  if (norm.includes('mild steel') || norm.includes('ms-grade d') || norm.includes('ms ')) return 64;
  if (norm.includes('cold rolled') || norm.includes('crs')) return 74.50;

  // Search in structured keys
  for (const [key, price] of Object.entries(SHEET_RETAIL_PRICES_INR)) {
    if (norm.includes(key.toLowerCase())) {
      return price;
    }
  }

  return 72.00; // Default standard metal retail price per kg in India (INR)
}

export function calculateStats(reports: ProductionReport[]): ProductionStats {
  if (reports.length === 0) {
    return {
      totalSheets: 0,
      totalAreaSqM: 0,
      averageThickness: 0,
      totalDowntimeMinutes: 0,
      totalReports: 0,
      totalWeightKg: 0,
      totalValueINR: 0
    };
  }

  let totalSheets = 0;
  let totalAreaSum = 0;
  let totalThicknessWeighted = 0;
  let totalDowntimeMinutes = 0;
  let totalWeightSum = 0;
  let totalValueSum = 0;

  reports.forEach(report => {
    const reportQty = report.qty || 0;
    totalSheets += reportQty;

    // Area of a single sheet = (length * width) in square mm
    // Convert to square meters = (length * width) / 1,000,000
    const areaSqM = ((report.length * report.width) / 1000000) * reportQty;
    totalAreaSum += areaSqM;

    totalThicknessWeighted += (report.thickness * reportQty);

    const downtimeSum = report.downtimeEvents.reduce((sum, e) => sum + e.durationMinutes, 0);
    totalDowntimeMinutes += downtimeSum;

    // Weight of single sheet = (length * width * thickness * density) / 1000000 in kg
    const density = getDensityByMaterial(report.sheet);
    const weightKg = ((report.length * report.width * report.thickness * density) / 1000000) * reportQty;
    totalWeightSum += weightKg;

    // Retail pricing calculation
    const pricePerKg = getRetailPricePerKgByMaterial(report.sheet);
    const reportValueINR = weightKg * pricePerKg;
    totalValueSum += reportValueINR;
  });

  const averageThickness = totalSheets > 0 ? (totalThicknessWeighted / totalSheets) : 0;

  return {
    totalSheets,
    totalAreaSqM: Math.round(totalAreaSum * 100) / 100,
    averageThickness: Math.round(averageThickness * 100) / 100,
    totalDowntimeMinutes,
    totalReports: reports.length,
    totalWeightKg: Math.round(totalWeightSum * 100) / 100,
    totalValueINR: Math.round(totalValueSum)
  };
}

export function getDowntimeBreakdown(reports: ProductionReport[]): Record<DowntimeReason, number> {
  const breakdown: Record<DowntimeReason, number> = {
    mechanical: 0,
    electrical: 0,
    material_shortage: 0,
    power_failure: 0,
    operator_break: 0,
    changeover: 0,
    other: 0
  };

  reports.forEach(report => {
    report.downtimeEvents.forEach(event => {
      if (breakdown[event.reason] !== undefined) {
        breakdown[event.reason] += event.durationMinutes;
      } else {
        breakdown.other += event.durationMinutes;
      }
    });
  });

  return breakdown;
}

export const DOWNTIME_LABELS: Record<DowntimeReason, string> = {
  mechanical: 'Mechanical Issue',
  electrical: 'Electrical Fault',
  material_shortage: 'Material Shortage',
  power_failure: 'Power Interruption',
  operator_break: 'Sanctioned Break',
  changeover: 'Line Changeover',
  other: 'Other/Unclassified'
};

export const DOWNTIME_COLORS: Record<DowntimeReason, string> = {
  mechanical: 'bg-amber-500 text-amber-950',
  electrical: 'bg-indigo-500 text-indigo-950',
  material_shortage: 'bg-red-500 text-red-950',
  power_failure: 'bg-rose-600 text-rose-50',
  operator_break: 'bg-emerald-500 text-emerald-950',
  changeover: 'bg-blue-500 text-blue-950',
  other: 'bg-zinc-500 text-zinc-950'
};
