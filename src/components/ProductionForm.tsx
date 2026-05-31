/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ProductionReport, ShiftType, DowntimeReason, DowntimeEvent } from '../types';
import { DOWNTIME_LABELS, getDensityByMaterial, getRetailPricePerKgByMaterial } from '../utils/calculations';
import { Calendar, User, ShieldAlert, Cpu, Plus, Trash2, Clock, Check, Scale } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ProductionFormProps {
  onSubmit: (report: Omit<ProductionReport, 'id' | 'createdAt'>) => void;
}

export const ProductionForm: React.FC<ProductionFormProps> = ({ onSubmit }) => {
  // Base states
  const [date, setDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [shift, setShift] = useState<ShiftType>('day');
  const [supervisorName, setSupervisorName] = useState<string>('');
  const [lineId, setLineId] = useState<string>('Shearing Machine Alpha');
  const [length, setLength] = useState<number | ''>('');
  const [width, setWidth] = useState<number | ''>('');
  const [thickness, setThickness] = useState<number | ''>('');
  const [qty, setQty] = useState<number | ''>('');
  const [sheet, setSheet] = useState<string>('Mild Steel (MS-Grade D)');
  const [notes, setNotes] = useState<string>('');

  // Downtime state
  const [downtimeEvents, setDowntimeEvents] = useState<Array<{
    reason: DowntimeReason;
    durationMinutes: number | '';
    description: string;
  }>>([]);

  // Toast / Status state
  const [successToast, setSuccessToast] = useState(false);
  const [errorText, setErrorText] = useState<string | null>(null);

  // Suggested values
  const commonLines = [
    'Laser Cutting Machine',
    'Laser',
    'Shearing Machine Alpha',
    'Laser Cutter Beta',
    'Laser Cutter Gamma',
    'Press Brake Alpha',
    'CNC Punch Press A',
    'Manual Guillotine Shears'
  ];

  const commonSheets = [
    'DP600 (Dual Phase Automotive Steel)',
    'DP800 (High-Strength Automotive Steel)',
    'CR4 (Cold Rolled Mild Steel)',
    'Aluminum 6016-T4 (Automotive Panel)',
    'Aluminum 5182 (Automotive Structure)',
    'Mild Steel (MS-Grade D)',
    'Stainless Steel (SS-304)',
    'Stainless Steel (SS-316)',
    'Aluminum 5052-H32',
    'Aluminum 6061-T6',
    'Copper C101',
    'Galvanized Iron (GI-Zinc)',
    'Cold Rolled Steel (CRS)'
  ];

  // Live computations
  const liveLength = Number(length) || 0;
  const liveWidth = Number(width) || 0;
  const liveQty = Number(qty) || 0;
  const liveThickness = Number(thickness) || 0;
  const liveDensity = getDensityByMaterial(sheet);

  const liveSingleArea = (liveLength * liveWidth) / 1000000;
  const liveTotalArea = liveSingleArea * liveQty;

  const liveSingleWeightKg = (liveLength * liveWidth * liveThickness * liveDensity) / 1000000;
  const liveTotalWeightKg = liveSingleWeightKg * liveQty;

  const livePricePerKg = getRetailPricePerKgByMaterial(sheet);
  const liveTotalValueINR = liveTotalWeightKg * livePricePerKg;

  // Add a downtime row
  const handleAddDowntime = () => {
    setDowntimeEvents([
      ...downtimeEvents,
      { reason: 'mechanical', durationMinutes: '', description: '' }
    ]);
  };

  // Remove a downtime row
  const handleRemoveDowntime = (index: number) => {
    setDowntimeEvents(downtimeEvents.filter((_, i) => i !== index));
  };

  // Update a downtime row
  const handleUpdateDowntime = (
    index: number, 
    field: 'reason' | 'durationMinutes' | 'description', 
    value: string | number
  ) => {
    const updated = [...downtimeEvents];
    if (field === 'durationMinutes') {
      updated[index][field] = value === '' ? '' : Number(value);
    } else if (field === 'reason') {
      updated[index][field] = value as DowntimeReason;
    } else {
      updated[index][field] = value as string;
    }
    setDowntimeEvents(updated);
  };

  // Submission handler
  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setErrorText(null);

    // Validation
    if (!date) return setErrorText('Date is a required field.');
    if (!supervisorName.trim()) return setErrorText('Supervisor Name is required.');
    if (!lineId.trim()) return setErrorText('Machine / Line ID is required.');
    
    if (length === '' || Number(length) < 1) {
      return setErrorText('Please specify a valid sheet length in mm.');
    }
    if (width === '' || Number(width) < 1) {
      return setErrorText('Please specify a valid sheet width in mm.');
    }
    if (thickness === '' || Number(thickness) <= 0) {
      return setErrorText('Please specify a valid thickness/gauge in mm.');
    }
    if (qty === '' || Number(qty) < 1) {
      return setErrorText('Please specify a valid quantity of sheets produced.');
    }
    if (!sheet.trim()) {
      return setErrorText('Please specify or select sheet material.');
    }

    // Validate any added downtime items
    for (let i = 0; i < downtimeEvents.length; i++) {
      const de = downtimeEvents[i];
      if (de.durationMinutes === '' || de.durationMinutes <= 0) {
        return setErrorText(`Downtime Event #${i + 1} has an invalid or empty duration.`);
      }
      if (!de.description.trim()) {
        return setErrorText(`Please provide a brief justification action for Downtime Event #${i + 1}.`);
      }
    }

    // Format downtime events correctly
    const formattedEvents: DowntimeEvent[] = downtimeEvents.map((de, idx) => ({
      id: `down-custom-${Date.now()}-${idx}`,
      durationMinutes: Number(de.durationMinutes),
      reason: de.reason,
      description: de.description
    }));

    // Submit
    onSubmit({
      date,
      shift,
      supervisorName: supervisorName.trim(),
      lineId: lineId.trim(),
      length: Number(length),
      width: Number(width),
      thickness: Number(thickness),
      qty: Number(qty),
      sheet: sheet.trim(),
      downtimeEvents: formattedEvents,
      notes: notes.trim() || undefined
    });

    // Reset Form fields elegantly (keep Date, Shift, Line, Supervisor, Sheet for fast entries!)
    setLength('');
    setWidth('');
    setThickness('');
    setQty('');
    setNotes('');
    setDowntimeEvents([]);

    // Show Success indicator
    setSuccessToast(true);
    setTimeout(() => setSuccessToast(false), 3000);
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
      <div className="border-b border-zinc-100 bg-zinc-50/50 p-4 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900 tracking-tight">Record Daily Production</h2>
          <p className="text-xs text-zinc-500">Log output levels, waste, metrics, and downtime</p>
        </div>
        <div className="flex h-2.5 w-2.5 items-center justify-center rounded-full bg-emerald-500 ring-4 ring-emerald-50"></div>
      </div>

      <form onSubmit={handleSubmit} className="p-5 space-y-6">
        {/* TOP LEVEL GENERAL INFO GRID */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 tracking-wide mb-1.5 flex items-center gap-1.5">
              <Calendar className="h-3.5 w-3.5 text-zinc-400" />
              Reporting Date <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              required
              className="w-full text-sm rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-800 outline-none transition focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              value={date}
              onChange={(e) => setDate(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 tracking-wide mb-1.5">
              Work Shift <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-5 gap-1 bg-zinc-100 p-1 rounded-lg">
              {(['1st', '2nd', '3rd', 'day', 'night'] as ShiftType[]).map((s) => (
                <button
                  type="button"
                  key={s}
                  onClick={() => setShift(s)}
                  className={`py-1 text-[10px] sm:text-xs font-medium rounded-md capitalize transition-all ${
                    shift === s 
                      ? 'bg-white text-zinc-900 shadow-sm font-semibold' 
                      : 'text-zinc-500 hover:text-zinc-900'
                  }`}
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-medium text-zinc-700 tracking-wide mb-1.5 flex items-center gap-1.5">
              <User className="h-3.5 w-3.5 text-zinc-400" />
              Supervisor Name <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              placeholder="e.g. Sarah Connor"
              className="w-full text-sm rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-800 outline-none transition focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              value={supervisorName}
              onChange={(e) => setSupervisorName(e.target.value)}
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-zinc-700 tracking-wide mb-1.5 flex items-center gap-1.5">
              <Cpu className="h-3.5 w-3.5 text-zinc-400" />
              Line / Machine name <span className="text-rose-500">*</span>
            </label>
            <input
              list="assembly-lines"
              type="text"
              required
              placeholder="e.g. Line Alpha"
              className="w-full text-sm rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-800 outline-none transition focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
              value={lineId}
              onChange={(e) => setLineId(e.target.value)}
            />
            <datalist id="assembly-lines">
              {commonLines.map((line) => (
                <option key={line} value={line} />
              ))}
            </datalist>
          </div>
        </div>

        {/* SHEET METRICS PORTION WITH LIVE HUD INSIGHTS */}
        <div className="border border-zinc-100 rounded-xl bg-zinc-50/40 p-4 space-y-4">
          <div>
            <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-widest mb-1.5">
              Sheet Specification & Material
            </h4>
            <p className="text-xs text-zinc-500 mb-3">Specify workpiece sizing, thickness, grade, and production quantity.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5">
            {/* Sheet Material Grade Select/Input */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-zinc-650 mb-1.5 flex items-center justify-between">
                <span>Sheet Material Grade <span className="text-rose-500">*</span></span>
                <span className="text-[10px] font-mono text-zinc-400">Datalist active</span>
              </label>
              <input
                list="sheet-materials"
                type="text"
                required
                placeholder="e.g. Mild Steel (MS-Grade D)"
                className="w-full text-sm rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-800 outline-none transition focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                value={sheet}
                onChange={(e) => setSheet(e.target.value)}
              />
              <datalist id="sheet-materials">
                {commonSheets.map((s) => (
                  <option key={s} value={s} />
                ))}
              </datalist>
            </div>

            {/* Thickness / Gauge */}
            <div>
              <label className="block text-xs font-medium text-zinc-650 mb-1.5">
                Thickness (mm) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                step="any"
                required
                min="0.01"
                placeholder="e.g. 1.5"
                className="w-full text-sm rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-800 outline-none transition focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 font-mono text-xs"
                value={thickness}
                onChange={(e) => setThickness(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>

            {/* Length */}
            <div>
              <label className="block text-xs font-medium text-zinc-650 mb-1.5">
                Length (mm) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="e.g. 2440"
                className="w-full text-sm rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-800 outline-none transition focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 font-mono text-xs"
                value={length}
                onChange={(e) => setLength(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>

            {/* Width */}
            <div>
              <label className="block text-xs font-medium text-zinc-650 mb-1.5">
                Width (mm) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="e.g. 1220"
                className="w-full text-sm rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-800 outline-none transition focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900 font-mono text-xs"
                value={width}
                onChange={(e) => setWidth(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-5 gap-3.5 pt-1">
            {/* Sheet Qty produced */}
            <div className="md:col-span-2">
              <label className="block text-xs font-medium text-zinc-650 mb-1.5">
                Quantity Produced (Sheets) <span className="text-rose-500">*</span>
              </label>
              <input
                type="number"
                required
                min="1"
                placeholder="e.g. 150 pieces"
                className="w-full text-sm rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-800 outline-none transition focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
                value={qty}
                onChange={(e) => setQty(e.target.value === '' ? '' : Number(e.target.value))}
              />
            </div>

            {/* Real-time calculated Weight HUD info panel with formula */}
            <div className="md:col-span-3">
              <div className="h-full bg-zinc-100/40 p-3.5 rounded-lg border border-zinc-200/50 space-y-2">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5">
                    <Scale className="h-4 w-4 text-emerald-600 animate-pulse" />
                    <p className="text-[10px] uppercase font-mono text-zinc-500 tracking-wider font-semibold">Live Weight Calculations</p>
                  </div>
                  <span className="text-[9px] font-mono font-medium text-zinc-400 bg-zinc-100 px-1.5 py-0.5 rounded">
                    Density: {liveDensity.toFixed(2)} g/cm³
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2 rounded border border-zinc-100 flex flex-col">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase">Per Sheet Weight</span>
                    <span className="font-semibold font-mono text-zinc-800">
                      {liveSingleWeightKg > 0 ? `${liveSingleWeightKg.toFixed(2)} kg` : '0.00 kg'}
                    </span>
                  </div>
                  <div className="bg-zinc-100/50 p-2 rounded border border-zinc-200/50 flex flex-col">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase">Total Batch Weight</span>
                    <span className="font-semibold font-mono text-zinc-800 text-zinc-700">
                      {liveTotalWeightKg >= 1000 
                        ? `${(liveTotalWeightKg / 1000).toFixed(3)} ton` 
                        : `${liveTotalWeightKg.toFixed(1)} kg`}
                    </span>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="bg-white p-2 rounded border border-zinc-100 flex flex-col">
                    <span className="text-[9px] font-mono text-zinc-400 uppercase">Retail Rate (IN)</span>
                    <span className="font-semibold font-mono text-zinc-850">
                      ₹{livePricePerKg.toFixed(2)} / kg
                    </span>
                  </div>
                  <div className="bg-emerald-50/50 p-2 rounded border border-emerald-100/80 flex flex-col">
                    <span className="text-[9px] font-mono text-emerald-600 font-semibold uppercase">Est. Retail Value</span>
                    <span className="font-bold font-mono text-emerald-700">
                      ₹{Math.round(liveTotalValueINR).toLocaleString('en-IN')}
                    </span>
                  </div>
                </div>

                {/* Mathematical Weight Formula */}
                <div className="text-[9px] font-mono text-zinc-400 leading-tight bg-zinc-100/60 p-2 rounded border border-zinc-200/45">
                  <span className="font-semibold text-zinc-500">Weight Formula:</span><br />
                  <span className="text-zinc-650 font-semibold">[Length(mm) × Width(mm) × Thickness(mm) × Density(g/cm³)] / 1M × Qty</span>
                </div>
              </div>
            </div>
          </div>
          
          {/* Helpful context gauge helper for sizing standard metal sheet guidelines */}
          {(liveLength > 0 && liveWidth > 0) && (
            <div className="text-[11px] text-zinc-500 bg-zinc-100/50 p-2.5 rounded-lg flex items-center justify-between">
              <span className="font-medium">Aspect Ratio: <span className="font-mono text-zinc-700">{(liveLength / liveWidth).toFixed(2)}:1</span></span>
              <span>Perimeter: <span className="font-mono text-zinc-700">{Math.round((liveLength * 2 + liveWidth * 2)).toLocaleString()} mm</span></span>
            </div>
          )}
        </div>

        {/* DYNAMIC DOWNTIME DURATION LOGS SECTION */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-1.5">
              <Clock className="h-4 w-4 text-zinc-500" />
              Incidental Downtime / Interruptions ({downtimeEvents.length})
            </h4>
            <button
              type="button"
              onClick={handleAddDowntime}
              className="flex items-center gap-1 px-2.5 py-1 text-xs font-medium text-zinc-600 bg-zinc-50 hover:bg-zinc-100 rounded-lg border border-zinc-200 transition"
            >
              <Plus className="h-3.5 w-3.5" />
              Add Event
            </button>
          </div>

          {downtimeEvents.length === 0 ? (
            <div className="text-center py-6 border border-dashed border-zinc-200 rounded-xl bg-zinc-50/50">
              <p className="text-xs text-zinc-500">No downtime occurred. Line experienced continuous run-time.</p>
            </div>
          ) : (
            <div className="space-y-3">
              <AnimatePresence initial={false}>
                {downtimeEvents.map((event, idx) => (
                  <motion.div
                    key={idx}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.95 }}
                    transition={{ duration: 0.15 }}
                    className="p-4 bg-zinc-50/60 border border-zinc-100 rounded-xl grid grid-cols-1 md:grid-cols-12 gap-3 items-end"
                  >
                    {/* Reason Column */}
                    <div className="md:col-span-3">
                      <label className="block text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">
                        Reason Code
                      </label>
                      <select
                        className="w-full text-xs rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-zinc-800 outline-none transition focus:border-zinc-900"
                        value={event.reason}
                        onChange={(e) => handleUpdateDowntime(idx, 'reason', e.target.value)}
                      >
                        {Object.entries(DOWNTIME_LABELS).map(([k, label]) => (
                          <option key={k} value={k}>{label}</option>
                        ))}
                      </select>
                    </div>

                    {/* Duration Column */}
                    <div className="md:col-span-2">
                      <label className="block text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">
                        Mins Lost
                      </label>
                      <input
                        type="number"
                        min="1"
                        required
                        placeholder="Minutes"
                        className="w-full text-xs rounded-lg border border-zinc-200 bg-white px-2 py-1.5 text-zinc-800 outline-none transition focus:border-zinc-900"
                        value={event.durationMinutes}
                        onChange={(e) => handleUpdateDowntime(idx, 'durationMinutes', e.target.value)}
                      />
                    </div>

                    {/* Description Column */}
                    <div className="md:col-span-6">
                      <label className="block text-[10px] font-semibold text-zinc-600 uppercase tracking-wider mb-1">
                        Justification & Corrective Actions took
                      </label>
                      <input
                        type="text"
                        required
                        placeholder="e.g. Robot failed nozzle. Serviced air filter."
                        className="w-full text-xs rounded-lg border border-zinc-200 bg-white px-2.5 py-1.5 text-zinc-800 outline-none transition focus:border-zinc-900"
                        value={event.description}
                        onChange={(e) => handleUpdateDowntime(idx, 'description', e.target.value)}
                      />
                    </div>

                    {/* Remove Action */}
                    <div className="md:col-span-1 flex justify-end">
                      <button
                        type="button"
                        onClick={() => handleRemoveDowntime(idx)}
                        className="p-1.5 text-zinc-400 hover:text-rose-600 transition p-1 hover:bg-rose-50 rounded"
                        title="Remove incident log"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>
                  </motion.div>
                ))}
              </AnimatePresence>
            </div>
          )}
        </div>

        {/* GENERAL SUPERVISOR COMMENTARY */}
        <div>
          <label className="block text-xs font-medium text-zinc-700 tracking-wide mb-1.5">
            General Commentary / Shift Handover Notes
          </label>
          <textarea
            rows={3}
            placeholder="Document shift notes, anomalies, maintenance handovers, material supply updates, etc."
            className="w-full text-sm rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-800 outline-none transition focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
            value={notes}
            onChange={(e) => setNotes(e.target.value)}
          />
        </div>

        {/* FEEDBACK LABELS (ERRORS & SUCCESS) */}
        {errorText && (
          <div className="p-3.5 bg-rose-50 border border-rose-100 rounded-lg flex items-start gap-2.5 text-xs text-rose-700 font-medium">
            <ShieldAlert className="h-4 w-4 shrink-0 mt-0.5" />
            <p>{errorText}</p>
          </div>
        )}

        {/* FORM CONTROLS */}
        <div className="flex items-center gap-3">
          <button
            type="submit"
            className="flex-1 select-none flex items-center justify-center gap-2 rounded-lg bg-zinc-900 hover:bg-zinc-800 active:bg-zinc-950 text-white font-medium text-sm py-2.5 shadow transition-all cursor-pointer"
          >
            Submit Daily Production Report
          </button>
        </div>
      </form>

      {/* SUCCESS TOAST WITH ANIMATION */}
      <AnimatePresence>
        {successToast && (
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            className="fixed bottom-5 right-5 z-50 bg-emerald-950 text-emerald-100 gap-2.5 border border-emerald-800 shadow-xl px-4 py-3 rounded-xl flex items-center"
          >
            <div className="p-1 rounded-full bg-emerald-500 text-emerald-950">
              <Check className="h-4 w-4 font-bold" />
            </div>
            <div>
              <p className="text-xs font-semibold">Report Successfully Lodged</p>
              <p className="text-[10px] text-emerald-400">Locally saved to production database</p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};
