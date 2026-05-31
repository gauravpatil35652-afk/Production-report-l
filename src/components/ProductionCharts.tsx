/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useMemo } from 'react';
import { ProductionReport, DowntimeReason } from '../types';
import { getDowntimeBreakdown, DOWNTIME_LABELS } from '../utils/calculations';
import { BarChart3, TrendingUp, Info, Calendar } from 'lucide-react';

interface ProductionChartsProps {
  reports: ProductionReport[];
}

export const ProductionCharts: React.FC<ProductionChartsProps> = ({ reports }) => {
  const [activeTrendIndex, setActiveTrendIndex] = useState<number | null>(null);

  // Parse chronological reports
  const chronologicalReports = useMemo(() => {
    return [...reports].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime());
  }, [reports]);

  // Calculations for Downtime Breakdown
  const downtimeBreakdown = useMemo(() => {
    const raw = getDowntimeBreakdown(reports);
    const sorted = Object.entries(raw)
      .map(([reason, minutes]) => ({
        reason: reason as DowntimeReason,
        label: DOWNTIME_LABELS[reason as DowntimeReason] || reason,
        minutes
      }))
      .sort((a, b) => b.minutes - a.minutes);
    
    const totalMinutes = sorted.reduce((sum, item) => sum + item.minutes, 0);

    return {
      items: sorted,
      totalMinutes
    };
  }, [reports]);

  // Days of the week constant helper
  const DAYS_OF_WEEK = useMemo(() => ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'], []);

  // Downtime by day of week calculation
  const downtimeByDayOfWeek = useMemo(() => {
    const minutesByDay = [0, 0, 0, 0, 0, 0, 0]; // Sun to Sat
    
    reports.forEach(r => {
      if (!r.date) return;
      const parts = r.date.split('-');
      if (parts.length === 3) {
        const year = parseInt(parts[0], 10);
        const month = parseInt(parts[1], 10) - 1;
        const day = parseInt(parts[2], 10);
        const dateObj = new Date(year, month, day);
        const dayIndex = dateObj.getDay();
        
        const sumDowntime = r.downtimeEvents.reduce((sum, e) => sum + e.durationMinutes, 0);
        if (!isNaN(dayIndex) && dayIndex >= 0 && dayIndex < 7) {
          minutesByDay[dayIndex] += sumDowntime;
        }
      }
    });

    const maxMinutes = Math.max(...minutesByDay, 1);

    return minutesByDay.map((minutes, idx) => ({
      dayIndex: idx,
      name: DAYS_OF_WEEK[idx],
      shortName: DAYS_OF_WEEK[idx].substring(0, 3),
      minutes,
      percentageOfMax: (minutes / maxMinutes) * 100
    }));
  }, [reports, DAYS_OF_WEEK]);

  // Scaled coordinates calculation for Trend Line Chart
  const trendChartData = useMemo(() => {
    if (chronologicalReports.length === 0) return null;

    const padding = { top: 20, right: 20, bottom: 40, left: 50 };
    const width = 600;
    const height = 240;

    const chartWidth = width - padding.left - padding.right;
    const chartHeight = height - padding.top - padding.bottom;

    // Find min & max for scale comparison
    let maxVal = 50;
    let minVal = 0;

    chronologicalReports.forEach(r => {
      const rArea = ((r.length * r.width) / 1000000) * r.qty;
      const highest = Math.max(r.qty, rArea);
      const lowest = Math.min(r.qty, rArea);
      if (highest > maxVal) maxVal = highest;
      if (lowest < minVal) minVal = lowest;
    });

    // Add breathing room
    maxVal = Math.ceil(maxVal * 1.15);
    const valRange = maxVal - minVal || 100;

    const points = chronologicalReports.map((r, index) => {
      const xRatio = chronologicalReports.length > 1 ? index / (chronologicalReports.length - 1) : 0.5;
      const x = padding.left + xRatio * chartWidth;
      const rArea = ((r.length * r.width) / 1000000) * r.qty;

      const yQty = padding.top + chartHeight - ((r.qty - minVal) / valRange) * chartHeight;
      const yArea = padding.top + chartHeight - ((rArea - minVal) / valRange) * chartHeight;

      return {
        x,
        yQty,
        yArea,
        area: rArea,
        report: r
      };
    });

    return {
      width,
      height,
      padding,
      chartWidth,
      chartHeight,
      minVal,
      maxVal,
      points
    };
  }, [chronologicalReports]);

  // Loading state
  if (reports.length === 0) {
    return (
      <div className="bg-white rounded-xl border border-zinc-100 shadow-sm p-6 text-center space-y-2">
        <p className="text-sm font-medium text-zinc-850">No charts loaded</p>
        <p className="text-xs text-zinc-450">Please add or load report entries to visualize analytics.</p>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 mb-6">
      {/* CHART 1: CHRONOLOGICAL TREND LINES */}
      <div className="bg-white rounded-xl border border-zinc-100 shadow-sm p-5 lg:col-span-12 flex flex-col justify-between">
        <div className="flex items-center justify-between border-b border-zinc-50 pb-3 mb-4">
          <div className="space-y-0.5">
            <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-1.5">
              <TrendingUp className="h-4 w-4 text-zinc-500" />
              Sheet Production & Area Trend
            </h3>
            <p className="text-[11px] text-zinc-500">Total pieces produced versus total surface area</p>
          </div>
          <div className="flex gap-4 text-[10px] font-semibold uppercase tracking-wider">
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded bg-zinc-300"></span>
              <span className="text-zinc-500">Sheets Produced (pcs)</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span className="inline-block h-2.5 w-2.5 rounded bg-emerald-600"></span>
              <span className="text-emerald-700">Surface Area (m²)</span>
            </div>
          </div>
        </div>

        {trendChartData ? (
          <div className="relative">
            {/* SVG Plot */}
            <svg 
              viewBox={`0 0 ${trendChartData.width} ${trendChartData.height}`}
              className="w-full h-auto overflow-visible select-none"
            >
              {/* Grid Lines */}
              {[0, 0.25, 0.5, 0.75, 1].map((ratio, idx) => {
                const y = trendChartData.padding.top + ratio * trendChartData.chartHeight;
                const value = Math.round(trendChartData.maxVal - ratio * (trendChartData.maxVal - trendChartData.minVal));
                return (
                  <g key={idx}>
                    <line 
                      x1={trendChartData.padding.left} 
                      x2={trendChartData.width - trendChartData.padding.right} 
                      y1={y} 
                      y2={y} 
                      stroke="#f4f4f5" 
                      strokeWidth={1}
                    />
                    <text 
                      x={trendChartData.padding.left - 10} 
                      y={y + 4} 
                      fontSize={10} 
                      fontFamily="monospace" 
                      fill="#71717a" 
                      textAnchor="end"
                    >
                      {value}
                    </text>
                  </g>
                );
              })}

              {/* X Axis Labels */}
              {trendChartData.points.map((pt, idx) => {
                const maxLabels = 8;
                const skipFactor = Math.ceil(trendChartData.points.length / maxLabels);
                if (idx % skipFactor !== 0 && idx !== trendChartData.points.length - 1) return null;

                const textDate = pt.report.date.split('-').slice(1).join('/'); // MM/DD
                return (
                  <text
                    key={idx}
                    x={pt.x}
                    y={trendChartData.height - trendChartData.padding.bottom + 18}
                    fontSize={10}
                    fontFamily="monospace"
                    fill="#71717a"
                    textAnchor="middle"
                  >
                    {textDate}
                  </text>
                );
              })}

              {/* PLOTTED PATHS (sheet qty & surface area) */}
              {/* Qty Line */}
              <path
                d={trendChartData.points.reduce((path, pt, idx) => {
                  return path + `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.yQty}`;
                }, '')}
                fill="none"
                stroke="#d4d4d8"
                strokeWidth={2}
                strokeDasharray="4 4"
              />

              {/* Area Line */}
              <path
                d={trendChartData.points.reduce((path, pt, idx) => {
                  return path + `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.yArea}`;
                }, '') + 
                ` L ${trendChartData.points[trendChartData.points.length - 1].x} ${trendChartData.height - trendChartData.padding.bottom}` + 
                ` L ${trendChartData.points[0].x} ${trendChartData.height - trendChartData.padding.bottom} Z`}
                fill="url(#trendAreaGrad)"
                opacity={0.06}
              />
              <path
                d={trendChartData.points.reduce((path, pt, idx) => {
                  return path + `${idx === 0 ? 'M' : 'L'} ${pt.x} ${pt.yArea}`;
                }, '')}
                fill="none"
                stroke="#10b981"
                strokeWidth={3}
              />

              {/* Interactive Tooltip Sensor Zones */}
              {trendChartData.points.map((pt, idx) => {
                const isActive = activeTrendIndex === idx;
                return (
                  <g 
                    key={idx}
                    onMouseEnter={() => setActiveTrendIndex(idx)}
                    onMouseLeave={() => setActiveTrendIndex(null)}
                    className="cursor-pointer"
                  >
                    {/* Vertical guideline */}
                    {isActive && (
                      <line
                        x1={pt.x}
                        x2={pt.x}
                        y1={trendChartData.padding.top}
                        y2={trendChartData.height - trendChartData.padding.bottom}
                        stroke="#71717a"
                        strokeDasharray="2 2"
                        strokeWidth={1}
                      />
                    )}

                    {/* Qty Point marker */}
                    <circle 
                      cx={pt.x} 
                      cy={pt.yQty} 
                      r={isActive ? 5 : 3.5} 
                      fill="#ffffff" 
                      stroke="#d4d4d8" 
                      strokeWidth={isActive ? 2.5 : 1.5}
                    />

                    {/* Area Point marker */}
                    <circle 
                      cx={pt.x} 
                      cy={pt.yArea} 
                      r={isActive ? 6 : 4} 
                      fill="#10b981" 
                      stroke="#ffffff" 
                      strokeWidth={isActive ? 2.5 : 1.5}
                    />

                    {/* Broad invisible interaction columns */}
                    <rect
                      x={pt.x - 20}
                      y={trendChartData.padding.top}
                      width={40}
                      height={trendChartData.chartHeight}
                      fill="transparent"
                    />
                  </g>
                );
              })}

              {/* Gradient Definitions */}
              <defs>
                <linearGradient id="trendAreaGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#10b981" />
                  <stop offset="100%" stopColor="#10b981" stopOpacity="0" />
                </linearGradient>
              </defs>
            </svg>

            {/* Float Tooltip Overlay */}
            <div className={`mt-3 p-3 bg-zinc-900 text-zinc-100 rounded-xl border border-zinc-800 transition shadow-lg ${
              activeTrendIndex !== null ? 'opacity-100 scale-100' : 'opacity-0 scale-95 pointer-events-none'
            }`}>
              {activeTrendIndex !== null && trendChartData.points[activeTrendIndex] && (
                <div className="flex flex-col sm:flex-row sm:items-center justify-between text-xs font-mono gap-2">
                  <div className="flex items-center gap-3">
                    <div>
                      <span className="text-zinc-500 font-bold">DATE:</span>{' '}
                      <span className="text-white font-bold">{trendChartData.points[activeTrendIndex].report.date}</span>
                    </div>
                    <div>
                      <span className="text-zinc-500 font-bold">MATERIAL:</span>{' '}
                      <span className="text-amber-400 font-bold">
                        {trendChartData.points[activeTrendIndex].report.sheet}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div>
                      <span className="text-zinc-500">QUANTITY:</span>{' '}
                      <span className="text-zinc-350 font-bold">{trendChartData.points[activeTrendIndex].report.qty} sheets</span>
                    </div>
                    <div>
                      <span className="text-zinc-500">SURFACE AREA:</span>{' '}
                      <span className="text-emerald-400 font-bold">{trendChartData.points[activeTrendIndex].area.toFixed(2)} m²</span>
                    </div>
                  </div>
                </div>
              )}
            </div>
            
            <div className="flex items-center gap-1.5 justify-center mt-3 text-[10px] text-zinc-400">
              <Info className="h-3 w-3" />
              <span>Hover over values on the plot lines to view active metrics.</span>
            </div>
          </div>
        ) : (
          <div className="h-44 flex items-center justify-center text-xs text-zinc-400">
            Trend charts will be drawn when data is recorded.
          </div>
        )}
      </div>

      {/* CHART 2: DOWNTIME LOSS CATEGORY DISTRIBUTION */}
      <div className="bg-white rounded-xl border border-zinc-100 shadow-sm p-5 lg:col-span-6 flex flex-col justify-between">
        <div className="border-b border-zinc-50 pb-3 mb-4 space-y-0.5">
          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-1.5">
            <BarChart3 className="h-4 w-4 text-zinc-500" />
            Downtime Incidents Breakdowns
          </h3>
          <p className="text-[11px] text-zinc-500">Lost Operational Minutes by Reason Code</p>
        </div>

        {downtimeBreakdown.totalMinutes === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8 text-center bg-zinc-50/50 rounded-xl border border-dashed border-zinc-100">
            <p className="text-xs font-semibold text-zinc-700">Excellent Operations Runtime!</p>
            <p className="text-[10px] text-zinc-450 mt-1 max-w-[180px]">
              0 downtime minutes logged across reporting timelines. Keep it up!
            </p>
          </div>
        ) : (
          <div className="space-y-4 flex-1">
            <div className="space-y-3">
              {downtimeBreakdown.items.map((item, idx) => {
                // Convert to percentage of total lost time
                const percent = downtimeBreakdown.totalMinutes > 0 
                  ? Math.round((item.minutes / downtimeBreakdown.totalMinutes) * 100) 
                  : 0;

                if (item.minutes === 0) return null;

                return (
                  <div key={item.reason} className="space-y-1">
                    <div className="flex items-center justify-between text-xs">
                      <span className="font-semibold text-zinc-800">{item.label}</span>
                      <span className="font-mono text-zinc-500 text-[11px]">
                        {item.minutes}m <span className="text-zinc-400">({percent}%)</span>
                      </span>
                    </div>
                    {/* Visual Bar line */}
                    <div className="h-2 w-full bg-zinc-100 rounded-full overflow-hidden">
                      <div 
                        className={`h-full rounded-full transition-all duration-300 ${
                          idx === 0 
                            ? 'bg-rose-600' 
                            : idx === 1 
                              ? 'bg-amber-500' 
                              : idx === 2 
                                ? 'bg-orange-500' 
                                : 'bg-zinc-400'
                        }`}
                        style={{ width: `${percent}%` }}
                      ></div>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Total downtime footer */}
            <div className="pt-3 border-t border-zinc-100 text-right mt-auto">
              <p className="text-[10px] font-mono text-zinc-400 uppercase">CUMULATIVE RUNTIME LOSS</p>
              <h4 className="text-lg font-bold text-zinc-950">
                {downtimeBreakdown.totalMinutes} <span className="text-xs text-zinc-500 font-semibold">Minutes Lost</span>
              </h4>
            </div>
          </div>
        )}
      </div>

      {/* CHART 3: DOWNTIME BY DAY OF THE WEEK */}
      <div id="downtime-by-day-chart" className="bg-white rounded-xl border border-zinc-100 shadow-sm p-5 lg:col-span-6 flex flex-col justify-between animate-fade-in">
        <div className="border-b border-zinc-50 pb-3 mb-4 space-y-0.5">
          <h3 className="text-xs font-bold text-zinc-900 uppercase tracking-widest flex items-center gap-1.5">
            <Calendar className="h-4 w-4 text-zinc-500" />
            Downtime by Day of the Week
          </h3>
          <p className="text-[11px] text-zinc-500">Distribution of lost minutes to identify maintenance windows</p>
        </div>

        {downtimeBreakdown.totalMinutes === 0 ? (
          <div className="flex-1 flex flex-col items-center justify-center py-8 text-center bg-zinc-50/50 rounded-xl border border-dashed border-zinc-100">
            <p className="text-xs font-semibold text-zinc-700">Excellent Operations Runtime!</p>
            <p className="text-[10px] text-zinc-450 mt-1 max-w-[180px]">
              0 downtime minutes logged across reporting timelines. Keep it up!
            </p>
          </div>
        ) : (
          <div className="flex-1 flex flex-col justify-between">
            <div className="flex items-end justify-between gap-1.5 mt-4 h-36 px-2">
              {downtimeByDayOfWeek.map((day) => {
                const isDowntimeDay = day.minutes > 0;
                return (
                  <div key={day.dayIndex} className="flex-1 flex flex-col items-center gap-2 group relative">
                    {/* Tooltip on Hover */}
                    <div className="absolute bottom-full mb-2 bg-zinc-900 text-zinc-50 text-[10px] py-1 px-1.5 rounded opacity-0 group-hover:opacity-100 transition-opacity whitespace-nowrap pointer-events-none shadow-md z-30 font-mono">
                      {day.name}: <span className="font-bold text-amber-400">{day.minutes}m</span>
                    </div>

                    {/* The Visual Bar */}
                    <div className="w-full bg-zinc-50 hover:bg-zinc-100/50 rounded-t-md flex items-end h-24 overflow-hidden border border-zinc-200/45 transition">
                      <div 
                        className={`w-full transition-all duration-550 rounded-t-sm ${
                          isDowntimeDay 
                            ? 'bg-amber-500 group-hover:bg-amber-600' 
                            : 'bg-zinc-200'
                        }`}
                        style={{ height: `${day.percentageOfMax}%` }}
                      />
                    </div>

                    {/* Day shortname */}
                    <span className={`text-[10px] font-mono font-semibold ${isDowntimeDay ? 'text-zinc-700' : 'text-zinc-400'}`}>
                      {day.shortName}
                    </span>
                  </div>
                );
              })}
            </div>

            {/* Top downtime day notice helper */}
            <div className="pt-3 border-t border-zinc-100 text-right mt-6 flex items-center justify-between text-[10px]">
              <span className="text-zinc-400 font-mono italic">Hover columns to see details</span>
              <div>
                <span className="font-mono text-zinc-400 uppercase">PEAK MAINTENANCE DAY: </span>
                <span className="font-bold text-amber-600 font-mono text-xs">
                  {(() => {
                    const sorted = [...downtimeByDayOfWeek].sort((a, b) => b.minutes - a.minutes);
                    return sorted[0].minutes > 0 ? `${sorted[0].name} (${sorted[0].minutes}m)` : 'None';
                  })()}
                </span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
