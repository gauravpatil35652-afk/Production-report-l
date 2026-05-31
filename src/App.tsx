/**
 * @license
 * SPDX-License-Identifier: Apache-2.5
 */

import React, { useState, useEffect } from 'react';
import { ProductionReport } from './types';
import { INITIAL_REPORTS } from './data/initialRecords';
import { DashboardStats } from './components/DashboardStats';
import { ProductionForm } from './components/ProductionForm';
import { ReportList } from './components/ReportList';
import { ProductionCharts } from './components/ProductionCharts';
import { GoogleSheetsSync } from './components/GoogleSheetsSync';
import { FileText, ClipboardList, ShieldAlert, CheckCircle, Database, FileSpreadsheet } from 'lucide-react';

export default function App() {
  const [activeTab, setActiveTab] = useState<'logbook' | 'sheets'>('logbook');

  // Sync state with localStorage
  const [reports, setReports] = useState<ProductionReport[]>(() => {
    const stored = localStorage.getItem('daily_production_reports_v1');
    if (stored) {
      try {
        const parsed = JSON.parse(stored);
        // Schema transition safeguard: ensure parsed items conform to sheet production fields
        if (Array.isArray(parsed) && parsed.length > 0 && !('sheet' in parsed[0])) {
          console.warn('Stale production record fields detected. Purging cache with updated sheets structure.');
          localStorage.setItem('daily_production_reports_v1', JSON.stringify(INITIAL_REPORTS));
          return INITIAL_REPORTS;
        }
        return parsed;
      } catch (err) {
        console.error('Failed to parse cached production reports:', err);
      }
    }
    return INITIAL_REPORTS;
  });

  // Save changes on update
  useEffect(() => {
    localStorage.setItem('daily_production_reports_v1', JSON.stringify(reports));
  }, [reports]);

  // Handler: Add a submitted report log
  const handleAddReport = (newRecord: Omit<ProductionReport, 'id' | 'createdAt'>) => {
    const report: ProductionReport = {
      ...newRecord,
      id: `rep-${Date.now()}`,
      createdAt: new Date().toISOString()
    };
    
    // Prepends to list so it instantly displays at the top of lists sorted newest first
    setReports((prev) => [report, ...prev]);
  };

  // Handler: Delete specific log entry
  const handleDeleteReport = (id: string) => {
    if (window.confirm('Are you sure you want to permanently delete this report entry?')) {
      setReports((prev) => prev.filter((r) => r.id !== id));
    }
  };

  // Handler: Edit cell overriding update
  const handleUpdateReport = (updated: ProductionReport) => {
    setReports((prev) => prev.map((r) => r.id === updated.id ? updated : r));
  };

  // Handler: Reset local storage back to starting high-quality sample demo logs
  const handleResetToDemo = () => {
    if (window.confirm('Restore system default sample data? This will overwrite recent modifications.')) {
      setReports(INITIAL_REPORTS);
    }
  };

  // Handler: Clear entire database
  const handleClearAll = () => {
    if (window.confirm('CRITICAL WARNING: This will permanently purge ALL recorded shift logs. Proceed?')) {
      setReports([]);
    }
  };

  return (
    <div id="app-root" className="min-h-screen bg-zinc-50/50 pb-12 font-sans selection:bg-zinc-900 selection:text-white">
      {/* HEADER BAR */}
      <header className="border-b border-zinc-100 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <div className="flex items-center space-x-3">
            <div className="p-2.5 bg-zinc-900 text-white rounded-xl">
              <ClipboardList className="h-6 w-6" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-zinc-950">
                Daily Production Report
              </h1>
              <p className="text-xs text-zinc-500">
                Operational Logbook & Analytical Performance Dashboard
              </p>
            </div>
          </div>

          {/* Supervisor Status tag */}
          <div className="flex items-center space-x-2 shrink-0">
            <span className="flex h-2 w-2 rounded-full bg-emerald-500 ring-4 ring-emerald-50"></span>
            <span className="text-xs font-semibold text-zinc-650 bg-zinc-50 px-2.5 py-1 rounded-full border border-zinc-150">
              Active Logger Session
            </span>
          </div>
        </div>
      </header>

      {/* PRIMARY CONTAINER AREA */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6 space-y-6">
        
        {/* STATS DECK */}
        <DashboardStats reports={reports} />

        {/* ANALYTICS VISUALIZERS PANEL */}
        <ProductionCharts reports={reports} />

        {/* LOG OUTLET SWITCHER TABS */}
        <div className="flex border-b border-zinc-200 gap-1 mt-8">
          <button 
            onClick={() => setActiveTab('logbook')} 
            className={`px-4 py-2 border-b-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              activeTab === 'logbook' 
                ? 'border-zinc-900 text-zinc-950 font-bold' 
                : 'border-transparent text-zinc-400 hover:text-zinc-650'
            }`}
          >
            <Database className="h-4 w-4" />
            <span>Operational Logbook</span>
          </button>
          
          <button 
            onClick={() => setActiveTab('sheets')} 
            className={`px-4 py-2 border-b-2 text-xs font-semibold uppercase tracking-wider flex items-center gap-1.5 transition-all ${
              activeTab === 'sheets' 
                ? 'border-[#107c41] text-[#107c41] font-bold' 
                : 'border-transparent text-zinc-400 hover:text-zinc-650'
            }`}
          >
            <FileSpreadsheet className="h-4 w-4" />
            <span>Google Sheets Live Grid</span>
          </button>
        </div>

        {/* LOG BOOK AND FORM SECTION */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
          {activeTab === 'sheets' ? (
            <div className="col-span-12">
              <GoogleSheetsSync reports={reports} onUpdateReport={handleUpdateReport} />
            </div>
          ) : (
            <>
              {/* Left: Historical logs listing and management (cols - 7) */}
              <div className="lg:col-span-7">
                <ReportList 
                  reports={reports} 
                  onDelete={handleDeleteReport} 
                  onResetToDemo={handleResetToDemo}
                  onClearAll={handleClearAll}
                />
              </div>

              {/* Right: Submission Form (cols - 5) */}
              <div className="lg:col-span-5">
                <ProductionForm onSubmit={handleAddReport} />
              </div>
            </>
          )}
        </div>
      </main>

      {/* SUBTLE FOOTER */}
      <footer className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-12 py-6 border-t border-zinc-150 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs font-mono text-zinc-400">
        <div>
          © 2026 Daily Production Report. Local Storage Enabled.
        </div>
        <div>
          Built with React & High-Contrast Swiss Typography
        </div>
      </footer>
    </div>
  );
}
