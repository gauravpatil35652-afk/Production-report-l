/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { ProductionReport, DowntimeReason } from '../types';
import { DOWNTIME_LABELS, DOWNTIME_COLORS, getDensityByMaterial, getRetailPricePerKgByMaterial } from '../utils/calculations';
import { 
  FileSpreadsheet, 
  Search, 
  Trash2, 
  ChevronDown, 
  ChevronUp, 
  FileText, 
  Filter, 
  RefreshCcw, 
  Calendar, 
  PackageOpen,
  ArrowUpDown
} from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ReportListProps {
  reports: ProductionReport[];
  onDelete: (id: string) => void;
  onResetToDemo: () => void;
  onClearAll: () => void;
}

export const ReportList: React.FC<ReportListProps> = ({ 
  reports, 
  onDelete, 
  onResetToDemo,
  onClearAll 
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedLine, setSelectedLine] = useState<string>('all');
  const [selectedShift, setSelectedShift] = useState<string>('all');
  const [sortByDateDir, setSortByDateDir] = useState<'desc' | 'asc'>('desc');

  // Toggle expanded card row
  const toggleExpand = (id: string) => {
    setExpandedId(expandedId === id ? null : id);
  };

  // Extract unique lines for filter
  const linesList = Array.from(new Set(reports.map(r => r.lineId))).filter(Boolean);

  // Apply filters
  const filteredReports = reports.filter(report => {
    const matchesSearch = 
      report.supervisorName.toLowerCase().includes(searchQuery.toLowerCase()) || 
      report.lineId.toLowerCase().includes(searchQuery.toLowerCase());
    
    const matchesLine = selectedLine === 'all' || report.lineId === selectedLine;
    const matchesShift = selectedShift === 'all' || report.shift === selectedShift;

    return matchesSearch && matchesLine && matchesShift;
  });

  // Apply sorting (By Date)
  const sortedReports = [...filteredReports].sort((a, b) => {
    const timeA = new Date(a.date).getTime();
    const timeB = new Date(b.date).getTime();
    return sortByDateDir === 'desc' ? timeB - timeA : timeA - timeB;
  });

  // Calculate sheet area in square meters
  const getSheetArea = (length: number, width: number, qty: number) => {
    return Math.round(((length * width) / 1000000) * qty * 100) / 100;
  };

  // Export to CSV
  const exportToCSV = () => {
    if (reports.length === 0) return;
    
    const headers = [
      'ID', 'Date', 'Shift', 'Line', 'Supervisor', 
      'Sheet Material', 'Length(mm)', 'Width(mm)', 'Thickness(mm)', 'Quantity(pcs)', 'Area(m²)', 'Weight(kg)', 
      'DowntimeMins', 'Retail Value (INR)', 'Notes'
    ];

    const rows = reports.map(r => {
      const density = getDensityByMaterial(r.sheet);
      const wtKg = ((r.length * r.width * r.thickness * density) / 1000000) * r.qty;
      const rateINR = getRetailPricePerKgByMaterial(r.sheet);
      const valueINR = Math.round(wtKg * rateINR);
      return [
        r.id,
        r.date,
        r.shift,
        `"${r.lineId.replace(/"/g, '""')}"`,
        `"${r.supervisorName.replace(/"/g, '""')}"`,
        `"${(r.sheet || '').replace(/"/g, '""')}"`,
        r.length,
        r.width,
        r.thickness,
        r.qty,
        getSheetArea(r.length, r.width, r.qty),
        Math.round(wtKg * 100) / 100,
        r.downtimeEvents.reduce((sum, e) => sum + e.durationMinutes, 0),
        valueINR,
        `"${(r.notes || '').replace(/"/g, '""').replace(/\n/g, ' ')}"`
      ];
    });

    const csvContent = [
      headers.join(','),
      ...rows.map(e => e.join(','))
    ].join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', `daily_production_report_export_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="bg-white rounded-xl border border-zinc-100 shadow-sm overflow-hidden">
      {/* HEADER CONTROLS */}
      <div className="p-4 border-b border-zinc-100 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
        <div>
          <h2 className="text-sm font-semibold text-zinc-900">Historical Logbook</h2>
          <p className="text-xs text-zinc-500">Search and manage previous shift entries</p>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {/* Export CSV button */}
          <button
            onClick={exportToCSV}
            disabled={reports.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded-lg bg-emerald-50 text-emerald-700 hover:bg-emerald-100 border border-emerald-200 transition disabled:opacity-40 select-none cursor-pointer"
          >
            <FileSpreadsheet className="h-3.5 w-3.5" />
            Export CSV
          </button>

          {/* Reset button */}
          <button
            onClick={onResetToDemo}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-zinc-50 text-zinc-600 hover:bg-zinc-100 border border-zinc-200 transition select-none cursor-pointer"
            title="Restore default sample values"
          >
            <RefreshCcw className="h-3.5 w-3.5" />
            Reset Demo
          </button>

          {/* Clear database button */}
          <button
            onClick={onClearAll}
            disabled={reports.length === 0}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-rose-50 text-rose-700 hover:bg-rose-100 border border-rose-150 transition disabled:opacity-40 select-none cursor-pointer"
          >
            Clear logs
          </button>
        </div>
      </div>

      {/* FILTER CONTROLS HUB */}
      <div className="bg-zinc-50/50 p-4 border-b border-zinc-100 grid grid-cols-1 md:grid-cols-4 gap-3">
        {/* Search */}
        <div className="relative md:col-span-2">
          <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-zinc-400" />
          <input
            type="text"
            placeholder="Search Supervisor name or Line ID..."
            className="w-full text-xs rounded-lg border border-zinc-200 bg-white pl-9 pr-3 py-2 text-zinc-800 outline-none focus:border-zinc-900 focus:ring-1 focus:ring-zinc-900"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>

        {/* Line Filter */}
        <div>
          <select
            className="w-full text-xs rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-800 outline-none focus:border-zinc-900"
            value={selectedLine}
            onChange={(e) => setSelectedLine(e.target.value)}
          >
            <option value="all">All Lines (Filter)</option>
            {linesList.map(line => (
              <option key={line} value={line}>{line}</option>
            ))}
          </select>
        </div>

        {/* Shift Filter */}
        <div className="flex gap-2">
          <select
            className="flex-1 text-xs rounded-lg border border-zinc-200 bg-white px-3 py-2 text-zinc-800 outline-none focus:border-zinc-900"
            value={selectedShift}
            onChange={(e) => setSelectedShift(e.target.value)}
          >
            <option value="all">All Shifts</option>
            <option value="1st">1st Shift</option>
            <option value="2nd">2nd Shift</option>
            <option value="3rd">3rd Shift</option>
            <option value="day">Day Shift</option>
            <option value="night">Night Shift</option>
          </select>

          {/* Sort direction toggle */}
          <button
            onClick={() => setSortByDateDir(sortByDateDir === 'desc' ? 'asc' : 'desc')}
            className="p-2 border border-zinc-200 bg-white rounded-lg hover:bg-zinc-50 text-zinc-500 hover:text-zinc-900 transition flex items-center justify-center"
            title={sortByDateDir === 'desc' ? "Oldest First" : "Newest First"}
          >
            <ArrowUpDown className="h-3.5 w-3.5" />
          </button>
        </div>
      </div>

      {sortedReports.length === 0 ? (
        <div className="p-8 text-center bg-white space-y-3">
          <div className="mx-auto h-12 w-12 text-zinc-300 rounded-full bg-zinc-50 flex items-center justify-center">
            <PackageOpen className="h-6 w-6" />
          </div>
          <div>
            <h3 className="text-xs font-semibold text-zinc-800">No shift logs found</h3>
            <p className="text-xs text-zinc-500">Try modifying filters, search term, or record a new shift above.</p>
          </div>
        </div>
      ) : (
        /* ACCORDION LOG LIST */
        <div className="divide-y divide-zinc-100">
          {sortedReports.map((report) => {
            const isExpanded = expandedId === report.id;
            const totalDowntimeMins = report.downtimeEvents.reduce((sum, e) => sum + e.durationMinutes, 0);
            const areaSqM = getSheetArea(report.length, report.width, report.qty);
            const density = getDensityByMaterial(report.sheet);
            const weightKg = ((report.length * report.width * report.thickness * density) / 1000000) * report.qty;

            return (
              <div 
                key={report.id} 
                className={`transition-colors ${isExpanded ? 'bg-zinc-50/20' : 'hover:bg-zinc-50/40'}`}
              >
                {/* COMPACT VIEW ROW */}
                <div 
                  onClick={() => toggleExpand(report.id)}
                  className="p-4 flex flex-col sm:flex-row sm:items-center justify-between cursor-pointer select-none gap-2"
                >
                  <div className="min-w-0 space-y-1">
                    <div className="flex items-center space-x-2 flex-wrap gap-y-1">
                      <span className="font-mono text-xs font-semibold text-zinc-950">
                        {report.date}
                      </span>
                      <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded-full bg-zinc-100 text-zinc-650">
                        {report.shift.replace('_', ' ')}
                      </span>
                      <span className="text-xs font-medium text-zinc-500 truncate">
                        — {report.lineId}
                      </span>
                    </div>

                    <p className="text-xs text-zinc-500 truncate">
                      Sheet: <span className="font-semibold text-zinc-950">{report.sheet}</span>
                      <span className="text-zinc-350 mx-1.5">|</span>
                      Supervisor: <span className="font-medium text-zinc-700">{report.supervisorName}</span>
                    </p>
                  </div>

                  {/* MINI INDICATORS GRID */}
                  <div className="flex items-center justify-between sm:justify-end space-x-6 shrink-0 mt-2 sm:mt-0 pt-2 sm:pt-0 border-t border-zinc-100 sm:border-t-0">
                    <div className="text-left sm:text-right">
                      <p className="text-[10px] font-mono text-zinc-400">Dim (L×W×T)</p>
                      <p className="text-xs font-mono font-medium text-zinc-800">
                        {report.length}×{report.width}×<span className="font-semibold text-indigo-650">{report.thickness}</span> <span className="text-[9px] text-zinc-400">mm</span>
                      </p>
                    </div>

                    <div className="text-center">
                      <p className="text-[10px] font-mono text-zinc-400">Quantity</p>
                      <span className="text-xs font-bold text-zinc-850 bg-zinc-100/85 px-2 py-0.5 rounded-md">
                        {report.qty} <span className="text-[10px] font-normal text-zinc-500">pcs</span>
                      </span>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-mono text-zinc-400">Total Area</p>
                      <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full">
                        {areaSqM} m²
                      </span>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-mono text-zinc-400">Total Weight</p>
                      <span className="text-xs font-bold font-mono text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-full">
                        {weightKg >= 1000 ? `${(weightKg / 1000).toFixed(2)} t` : `${weightKg.toFixed(1)} kg`}
                      </span>
                    </div>

                    <div className="text-right">
                      <p className="text-[10px] font-mono text-zinc-400">Retail Value</p>
                      <span className="text-xs font-bold font-mono text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full whitespace-nowrap">
                        ₹{Math.round(weightKg * getRetailPricePerKgByMaterial(report.sheet)).toLocaleString('en-IN')}
                      </span>
                    </div>

                    <div className="text-zinc-400 hover:text-zinc-600 hidden sm:block">
                      {isExpanded ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
                    </div>
                  </div>
                </div>

                {/* EXPANDED DETAILED LOG VIEW (with motion) */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      className="overflow-hidden bg-zinc-50/50 border-t border-zinc-100 px-4 py-4 space-y-4"
                    >
                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Metrics Breakdown Block */}
                        <div className="bg-white p-3.5 rounded-xl border border-zinc-100 shadow-sm space-y-2.5">
                          <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest font-semibold">Sheet Spec Breakdown</p>
                          <div className="grid grid-cols-2 gap-2 text-xs">
                            <div className="col-span-2 pb-1 border-b border-zinc-100">
                              <p className="text-zinc-400 text-[10px]">Material Grade / Type:</p>
                              <p className="font-semibold text-zinc-900">{report.sheet}</p>
                            </div>
                            <div>
                              <p className="text-zinc-400">Thickness (T):</p>
                              <p className="font-semibold text-zinc-800">{report.thickness} mm</p>
                            </div>
                            <div>
                              <p className="text-zinc-400">Length × Width:</p>
                              <p className="font-semibold text-zinc-800">{report.length} × {report.width} mm</p>
                            </div>
                            <div>
                              <p className="text-zinc-400">Total Sheets:</p>
                              <p className="font-semibold text-zinc-800">{report.qty} pieces</p>
                            </div>
                             <div>
                              <p className="text-zinc-400">Surface Area:</p>
                              <span className="font-semibold font-mono text-emerald-700">{areaSqM} m²</span>
                            </div>
                            <div>
                              <p className="text-zinc-400">Calculated Weight:</p>
                              <span className="font-semibold font-mono text-indigo-700">
                                {weightKg >= 1000 ? `${(weightKg / 1000).toFixed(2)} t (${weightKg.toFixed(1)} kg)` : `${weightKg.toFixed(1)} kg`}
                              </span>
                            </div>
                            <div>
                              <p className="text-zinc-400">Retail Rate (IN):</p>
                              <p className="font-semibold text-zinc-800">₹{getRetailPricePerKgByMaterial(report.sheet).toFixed(2)} / kg</p>
                            </div>
                            <div>
                              <p className="text-emerald-700 font-semibold font-mono">Retail Value (IN):</p>
                              <span className="font-bold font-mono text-emerald-800">
                                ₹{Math.round(weightKg * getRetailPricePerKgByMaterial(report.sheet)).toLocaleString('en-IN')}
                              </span>
                            </div>
                            <div>
                              <p className="text-zinc-400">Total Downtime:</p>
                              <p className="font-semibold text-amber-600">{totalDowntimeMins} Minutes</p>
                            </div>
                          </div>
                        </div>

                        {/* Downtime Interruption Incidents Block */}
                        <div className="bg-white p-3.5 rounded-xl border border-zinc-100 shadow-sm space-y-2 md:col-span-2">
                          <p className="text-[10px] font-mono text-zinc-400 uppercase tracking-widest font-semibold mb-1">
                            Logged Incidents & Downtime Events ({report.downtimeEvents.length})
                          </p>
                          {report.downtimeEvents.length === 0 ? (
                            <p className="text-xs text-zinc-400 italic">No interruptions logged for this shift run.</p>
                          ) : (
                            <div className="space-y-1.5 max-h-[140px] overflow-y-auto">
                              {report.downtimeEvents.map((event) => (
                                <div key={event.id} className="flex items-start justify-between text-xs p-2 rounded-lg bg-zinc-50 border border-zinc-100 gap-2">
                                  <div className="space-y-0.5">
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                      <span className={`px-1.5 py-0.5 text-[9px] font-bold uppercase rounded ${DOWNTIME_COLORS[event.reason] || 'bg-zinc-200'}`}>
                                        {DOWNTIME_LABELS[event.reason] || event.reason}
                                      </span>
                                      <span className="font-semibold text-zinc-700">{event.durationMinutes} mins lost</span>
                                    </div>
                                    <p className="text-zinc-500 pr-2">{event.description}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>

                      {/* Supervisor notes block */}
                      {report.notes && (
                        <div className="bg-white p-3 rounded-xl border border-zinc-100 shadow-sm flex gap-2">
                          <FileText className="h-4 w-4 text-zinc-400 mt-0.5 shrink-0" />
                          <div>
                            <p className="text-[10px] font-mono text-zinc-450 uppercase tracking-wi font-semibold">Supervisor Feedback Notes</p>
                            <p className="text-xs text-zinc-600 mt-0.5 whitespace-pre-line leading-relaxed">{report.notes}</p>
                          </div>
                        </div>
                      )}

                      {/* Delete actions row */}
                      <div className="flex justify-end pt-1">
                        <button
                          onClick={() => onDelete(report.id)}
                          className="flex items-center gap-1 px-3 py-1.5 text-xs text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-lg border border-rose-100 transition shadow-sm font-semibold cursor-pointer"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                          Delete Log Entry
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
