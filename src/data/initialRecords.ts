/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { ProductionReport } from '../types';

export const INITIAL_REPORTS: ProductionReport[] = [
  {
    id: 'rep-2026-05-31-03',
    date: '2026-05-31',
    shift: 'day',
    lineId: 'Laser Cutting Machine',
    supervisorName: 'Marcus Vance',
    length: 1800,
    width: 1100,
    thickness: 1.2,
    qty: 320,
    sheet: 'DP600 (Dual Phase Automotive Steel)',
    downtimeEvents: [
      {
        id: 'down-auto-1',
        durationMinutes: 12,
        reason: 'changeover',
        description: 'Nozzle calibration for high precision automotive stamping contours'
      }
    ],
    notes: 'Clean cutting run. Stamping blank sheet dimensions are exact, optimized for high precision robotic assembly lanes.',
    createdAt: '2026-05-31T14:45:00.000Z'
  },
  {
    id: 'rep-2026-05-31-02',
    date: '2026-05-31',
    shift: 'night',
    lineId: 'Laser',
    supervisorName: 'Elena Rostova',
    length: 2200,
    width: 1000,
    thickness: 1.0,
    qty: 250,
    sheet: 'Aluminum 6016-T4 (Automotive Panel)',
    downtimeEvents: [
      {
        id: 'down-auto-2',
        durationMinutes: 40,
        reason: 'mechanical',
        description: 'Auto-loader raw aluminum sheet pallet feed adjustments'
      }
    ],
    notes: 'Inner panel hood blanks successfully cut. Increased nitrogen pressure by 5% to reduce edge burrs on soft high-grade aluminum sheets.',
    createdAt: '2026-05-31T03:10:00.000Z'
  },
  {
    id: 'rep-2026-05-27-01',
    date: '2026-05-27',
    shift: 'day',
    lineId: 'Shearing Machine Alpha',
    supervisorName: 'John Miller',
    length: 2440,
    width: 1220,
    thickness: 1.5,
    qty: 120,
    sheet: 'Stainless Steel (SS-304)',
    downtimeEvents: [
      {
        id: 'down-1',
        durationMinutes: 25,
        reason: 'mechanical',
        description: 'Feeder belt jam on CNC shears'
      }
    ],
    notes: 'Overall smooth run. Minor conveyor belt jam on feeder CNC shears solved quickly by maintenance team.',
    createdAt: '2026-05-27T18:00:00.000Z'
  },
  {
    id: 'rep-2026-05-28-01',
    date: '2026-05-28',
    shift: 'night',
    lineId: 'Press Brake Beta',
    supervisorName: 'Sarah Connor',
    length: 2000,
    width: 1000,
    thickness: 2.0,
    qty: 85,
    sheet: 'Aluminum 5052-H32',
    downtimeEvents: [
      {
        id: 'down-2',
        durationMinutes: 45,
        reason: 'electrical',
        description: 'Robot welder sensor fault'
      },
      {
        id: 'down-3',
        durationMinutes: 20,
        reason: 'material_shortage',
        description: 'Delay in raw aluminum stock delivery'
      }
    ],
    notes: 'Slightly higher rejection rate due to calibration issues on press-arm. Solved at shift end.',
    createdAt: '2026-05-28T06:15:00.000Z'
  },
  {
    id: 'rep-2026-05-29-01',
    date: '2026-05-29',
    shift: 'day',
    lineId: 'Shearing Machine Alpha',
    supervisorName: 'Michael Chang',
    length: 3000,
    width: 1500,
    thickness: 3.0,
    qty: 150,
    sheet: 'Mild Steel (MS-Grade D)',
    downtimeEvents: [],
    notes: 'Excellent performance! Exceeded target outputs on our day shift with negligible plate alignment failures.',
    createdAt: '2026-05-29T18:30:00.000Z'
  }
];
