/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export type ShiftType = '1st' | '2nd' | '3rd' | 'day' | 'night';

export type DowntimeReason = 
  | 'mechanical' 
  | 'electrical' 
  | 'material_shortage' 
  | 'power_failure' 
  | 'operator_break' 
  | 'changeover' 
  | 'other';

export interface DowntimeEvent {
  id: string;
  durationMinutes: number;
  reason: DowntimeReason;
  description: string;
}

export interface ProductionReport {
  id: string;
  date: string; // YYYY-MM-DD
  shift: ShiftType;
  lineId: string;
  supervisorName: string;
  length: number;       // Sheet Length in mm
  width: number;        // Sheet Width in mm
  thickness: number;    // Sheet Thickness in mm
  qty: number;          // Quantity of sheets produced
  sheet: string;        // Sheet material/grade
  downtimeEvents: DowntimeEvent[];
  notes?: string;
  createdAt: string; // Timestamp
}

export interface ProductionStats {
  totalSheets: number;
  totalAreaSqM: number;
  averageThickness: number;
  totalDowntimeMinutes: number;
  totalReports: number;
  totalWeightKg: number;
  totalValueINR: number;
}
