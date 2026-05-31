import React, { useState, useEffect, useRef } from 'react';
import { ProductionReport } from '../types';
import { getDensityByMaterial, getRetailPricePerKgByMaterial } from '../utils/calculations';
import { 
  FileSpreadsheet, 
  ExternalLink, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle, 
  Key, 
  Download, 
  ToggleLeft, 
  ToggleRight,
  Info,
  Layers,
  HelpCircle
} from 'lucide-react';

interface GoogleSheetsSyncProps {
  reports: ProductionReport[];
  onUpdateReport?: (updated: ProductionReport) => void;
}

export const GoogleSheetsSync: React.FC<GoogleSheetsSyncProps> = ({ reports, onUpdateReport }) => {
  // Connection states
  const [accessToken, setAccessToken] = useState<string>(() => localStorage.getItem('gs_access_token') || '');
  const [spreadsheetId, setSpreadsheetId] = useState<string>(() => localStorage.getItem('gs_spreadsheet_id') || '');
  const [autoSync, setAutoSync] = useState<boolean>(() => localStorage.getItem('gs_auto_sync') === 'true');
  const [selectedCell, setSelectedCell] = useState<{ row: number; col: number } | null>(null);
  const [editValue, setEditValue] = useState<string>('');
  const [isCompact, setIsCompact] = useState<boolean>(() => localStorage.getItem('gs_compact_mode') === 'true');
  
  // Dynamic sync statuses
  const [syncing, setSyncing] = useState<boolean>(false);
  const [syncStatus, setSyncStatus] = useState<{
    success: boolean | null;
    message: string;
    timestamp?: string;
  }>({ success: null, message: 'Google Sheet integration not configured' });

  // Spreadsheet structure mapping
  const columns = [
    { label: 'A', title: 'ID', accessor: (r: ProductionReport) => r.id },
    { label: 'B', title: 'Date', accessor: (r: ProductionReport) => r.date, editable: true, field: 'date' },
    { label: 'C', title: 'Shift', accessor: (r: ProductionReport) => r.shift, editable: true, field: 'shift' },
    { label: 'D', title: 'Line / Machine', accessor: (r: ProductionReport) => r.lineId, editable: true, field: 'lineId' },
    { label: 'E', title: 'Supervisor', accessor: (r: ProductionReport) => r.supervisorName, editable: true, field: 'supervisorName' },
    { label: 'F', title: 'Material', accessor: (r: ProductionReport) => r.sheet, editable: true, field: 'sheet' },
    { label: 'G', title: 'Length (mm)', accessor: (r: ProductionReport) => r.length, editable: true, field: 'length', numeric: true },
    { label: 'H', title: 'Width (mm)', accessor: (r: ProductionReport) => r.width, editable: true, field: 'width', numeric: true },
    { label: 'I', title: 'Thickness (mm)', accessor: (r: ProductionReport) => r.thickness, editable: true, field: 'thickness', numeric: true },
    { label: 'J', title: 'Qty (pcs)', accessor: (r: ProductionReport) => r.qty, editable: true, field: 'qty', numeric: true },
    { 
      label: 'K', 
      title: 'Area (m²)', 
      accessor: (r: ProductionReport) => {
        const area = (r.length * r.width * r.qty) / 1000000;
        return area.toFixed(2);
      } 
    },
    { 
      label: 'L', 
      title: 'Weight (kg)', 
      accessor: (r: ProductionReport) => {
        const density = getDensityByMaterial(r.sheet);
        const weight = ((r.length * r.width * r.thickness * density) / 1000000) * r.qty;
        return weight.toFixed(1);
      } 
    },
    { 
      label: 'M', 
      title: 'Retail Value (INR)', 
      accessor: (r: ProductionReport) => {
        const density = getDensityByMaterial(r.sheet);
        const weight = ((r.length * r.width * r.thickness * density) / 1000000) * r.qty;
        const price = getRetailPricePerKgByMaterial(r.sheet);
        return Math.round(weight * price).toLocaleString('en-IN');
      } 
    },
    { label: 'N', title: 'Downtime (min)', accessor: (r: ProductionReport) => r.downtimeEvents.reduce((sum, e) => sum + e.durationMinutes, 0) }
  ];

  // Save integration config on change
  useEffect(() => {
    localStorage.setItem('gs_access_token', accessToken);
    localStorage.setItem('gs_spreadsheet_id', spreadsheetId);
    localStorage.setItem('gs_auto_sync', autoSync ? 'true' : 'false');
    localStorage.setItem('gs_compact_mode', isCompact ? 'true' : 'false');
  }, [accessToken, spreadsheetId, autoSync, isCompact]);

  // Handle auto-sync trigger when reports change
  const lastReportCount = useRef(reports.length);
  useEffect(() => {
    if (autoSync && accessToken && spreadsheetId && reports.length > lastReportCount.current) {
      const rec = reports[0]; // Fetch newest record
      if (rec) {
        appendRecordToSheet(rec, spreadsheetId, accessToken);
      }
    }
    lastReportCount.current = reports.length;
  }, [reports, autoSync, accessToken, spreadsheetId]);

  // Append a single record directly using standard REST call (Real Google Sheets integration)
  const appendRecordToSheet = async (report: ProductionReport, targetId: string, tok: string) => {
    try {
      const density = getDensityByMaterial(report.sheet);
      const area = (report.length * report.width * report.qty) / 1000000;
      const weight = ((report.length * report.width * report.thickness * density) / 1000000) * report.qty;
      const downtime = report.downtimeEvents.reduce((sum, e) => sum + e.durationMinutes, 0);
      const retailValue = Math.round(weight * getRetailPricePerKgByMaterial(report.sheet));

      const rowValues = [
        report.id,
        report.date,
        report.shift,
        report.lineId,
        report.supervisorName,
        report.sheet,
        report.length,
        report.width,
        report.thickness,
        report.qty,
        area,
        weight,
        retailValue,
        downtime,
        report.notes || ''
      ];

      const url = `https://sheets.googleapis.com/v4/spreadsheets/${targetId}/values/Sheet1!A:O:append?valueInputOption=USER_ENTERED`;
      const response = await fetch(url, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${tok}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [rowValues]
        })
      });

      if (!response.ok) {
        throw new Error(`HTTP Error ${response.status}: ${response.statusText}`);
      }

      setSyncStatus({
        success: true,
        message: `Auto-synced report "${report.id}" successfully!`,
        timestamp: new Date().toLocaleTimeString()
      });
    } catch (err: any) {
      console.error('Failed auto-syncing to Google Sheets:', err);
      setSyncStatus({
        success: false,
        message: `Auto-sync failed: ${err.message}. Check Access Token.`,
        timestamp: new Date().toLocaleTimeString()
      });
    }
  };

  // Create a brand-new Spreadsheet on the user's Google Drive and setup structure
  const handleCreateNewSheet = async () => {
    if (!accessToken) {
      setSyncStatus({
        success: false,
        message: 'Google Sheets OAuth token is required to create a sheet.'
      });
      return;
    }

    setSyncing(true);
    setSyncStatus({ success: null, message: 'Creating Google Sheet...' });

    try {
      // 1. Create Spreadsheet
      const sheetInitResponse = await fetch('https://sheets.googleapis.com/v4/spreadsheets', {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          properties: {
            title: `Factory Daily Production reports - Excel Live Sync`
          }
        })
      });

      if (!sheetInitResponse.ok) {
        throw new Error(`Failed to initialize spreadsheet: ${sheetInitResponse.statusText}`);
      }

      const sheetData = await sheetInitResponse.json();
      const generatedId = sheetData.spreadsheetId;
      setSpreadsheetId(generatedId);

      // 2. Setup Headers
      const headers = [
        'Report ID',
        'Date',
        'Shift',
        'Machine Line',
        'Supervisor',
        'Sheet Material',
        'Length(mm)',
        'Width(mm)',
        'Thickness(mm)',
        'Quantity(pcs)',
        'Calculated Area(m²)',
        'Material Weight(kg)',
        'Retail Value(INR)',
        'Total Downtime(mins)',
        'Operational Notes'
      ];

      const headerUrl = `https://sheets.googleapis.com/v4/spreadsheets/${generatedId}/values/Sheet1!A1:O1?valueInputOption=USER_ENTERED`;
      const headerResponse = await fetch(headerUrl, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          values: [headers]
        })
      });

      if (!headerResponse.ok) {
        throw new Error(`Failed to write column headers: ${headerResponse.statusText}`);
      }

      // If we have existing logs, push them to the freshly made spreadsheet
      if (reports.length > 0) {
        const rows = reports.map(r => {
          const density = getDensityByMaterial(r.sheet);
          const area = (r.length * r.width * r.qty) / 1000000;
          const weight = ((r.length * r.width * r.thickness * density) / 1000000) * r.qty;
          const retailValue = Math.round(weight * getRetailPricePerKgByMaterial(r.sheet));
          const downtime = r.downtimeEvents.reduce((sum, e) => sum + e.durationMinutes, 0);
          return [
            r.id,
            r.date,
            r.shift,
            r.lineId,
            r.supervisorName,
            r.sheet,
            r.length,
            r.width,
            r.thickness,
            r.qty,
            area,
            weight,
            retailValue,
            downtime,
            r.notes || ''
          ];
        });

        const rowsUrl = `https://sheets.googleapis.com/v4/spreadsheets/${generatedId}/values/Sheet1!A2:O${reports.length + 1}?valueInputOption=USER_ENTERED`;
        await fetch(rowsUrl, {
          method: 'PUT',
          headers: {
            'Authorization': `Bearer ${accessToken}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            values: rows
          })
        });
      }

      setSyncStatus({
        success: true,
        message: `Spreadsheet created and fully synchronized!`,
        timestamp: new Date().toLocaleTimeString()
      });

    } catch (error: any) {
      console.error('Google Sheets creation errored:', error);
      setSyncStatus({
        success: false,
        message: `Creation failed: ${error.message}. Is the Token expired?`,
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setSyncing(false);
    }
  };

  // Push all existing logs to the typed spreadsheet ID
  const handlePushAllData = async () => {
    if (!accessToken || !spreadsheetId) {
      setSyncStatus({
        success: false,
        message: 'Provide both your Access Token and target Spreadsheet ID to Sync.'
      });
      return;
    }

    if (!window.confirm('Sync with Google Sheets: This will overwrite sheet records or append starting on Sheet1!A1. OK to execute?')) {
      return;
    }

    setSyncing(true);
    setSyncStatus({ success: null, message: 'Pushing operation data to GSheets...' });

    try {
      const headers = [
        'Report ID',
        'Date',
        'Shift',
        'Machine Line',
        'Supervisor',
        'Sheet Material',
        'Length(mm)',
        'Width(mm)',
        'Thickness(mm)',
        'Quantity(pcs)',
        'Calculated Area(m²)',
        'Material Weight(kg)',
        'Retail Value(INR)',
        'Total Downtime(mins)',
        'Operational Notes'
      ];

      const rows = reports.map(r => {
        const density = getDensityByMaterial(r.sheet);
        const area = (r.length * r.width * r.qty) / 1000000;
        const weight = ((r.length * r.width * r.thickness * density) / 1000000) * r.qty;
        const retailValue = Math.round(weight * getRetailPricePerKgByMaterial(r.sheet));
        const downtime = r.downtimeEvents.reduce((sum, e) => sum + e.durationMinutes, 0);
        return [
          r.id,
          r.date,
          r.shift,
          r.lineId,
          r.supervisorName,
          r.sheet,
          r.length,
          r.width,
          r.thickness,
          r.qty,
          area,
          weight,
          retailValue,
          downtime,
          r.notes || ''
        ];
      });

      // Push headers and rows in one batch query
      const url = `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/Sheet1!A1?valueInputOption=USER_ENTERED`;
      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${accessToken}`,
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({
          range: 'Sheet1!A1',
          majorDimension: 'ROWS',
          values: [headers, ...rows]
        })
      });

      if (!response.ok) {
        throw new Error(`Failed to write spreadsheet data: ${response.statusText}`);
      }

      setSyncStatus({
        success: true,
        message: `Exported ${reports.length} records successfully!`,
        timestamp: new Date().toLocaleTimeString()
      });

    } catch (e: any) {
      console.error('Exporting error:', e);
      setSyncStatus({
        success: false,
        message: `Sync failed: ${e.message}`,
        timestamp: new Date().toLocaleTimeString()
      });
    } finally {
      setSyncing(false);
    }
  };

  // Local Excel formula simulation (Live SUM/AVERAGE column indicators)
  const calculateColumnSum = (colIndex: number) => {
    let sum = 0;
    reports.forEach(r => {
      const accessor = columns[colIndex].accessor;
      const raw = accessor(r);
      const parsed = parseFloat(raw.toString().replace(/,/g, ''));
      if (!isNaN(parsed)) {
        sum += parsed;
      }
    });
    return sum;
  };

  const calculateColumnAvg = (colIndex: number) => {
    const sum = calculateColumnSum(colIndex);
    return reports.length > 0 ? (sum / reports.length) : 0;
  };

  // Dynamic GSI token instructions popup
  const showTokenHelp = () => {
    alert(
      "How to acquire your Google OAuth token:\n" +
      "1. Accept the OAuth request prompts in the browser sidebar.\n" +
      "2. Go to the active user profile or session properties to inspect the synced authentication token.\n" +
      "3. You can paste an OAuth Access Token directly here to instantly connect with Google Sheets. This acts as a manual fallback if cross-origin iframe cookie limits prevent automatic login popup scripts from executing."
    );
  };

  // Render a cell click event for live editing (Google Sheets UX)
  const handleCellClick = (rowIndex: number, colIndex: number, currentVal: any) => {
    const col = columns[colIndex];
    if (col.editable) {
      setSelectedCell({ row: rowIndex, col: colIndex });
      setEditValue(currentVal.toString());
    } else {
      setSelectedCell(null);
    }
  };

  // Save the in-cell edited property immediately
  const handleCellSave = () => {
    if (!selectedCell || !onUpdateReport) return;
    const { row, col } = selectedCell;
    const report = reports[row];
    const column = columns[col];
    
    if (report && column.field) {
      let finalVal: any = editValue;
      if (column.numeric) {
        finalVal = editValue === '' ? '' : Number(editValue);
      }
      
      const updatedReport: ProductionReport = {
        ...report,
        [column.field]: finalVal
      };
      
      onUpdateReport(updatedReport);
    }
    
    setSelectedCell(null);
  };

  return (
    <div id="google-sheets-xel-view" className="bg-white rounded-xl border border-zinc-200/80 shadow-sm overflow-hidden bounce-in">
      
      {/* BRANDING TOP BAR */}
      <div className="bg-[#107c41] p-4 text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 border-b border-zinc-200">
        <div className="flex items-center space-x-3">
          <div className="p-2 bg-white/10 rounded-lg">
            <FileSpreadsheet className="h-5.5 w-5.5 text-white animate-pulse" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-[10px] uppercase font-mono tracking-widest text-[#a8f0cc] font-semibold">Live Integrations</span>
              <span className="text-[9px] bg-white/20 text-white px-1.5 py-0.2 rounded font-semibold font-mono">Google Sheets API v4</span>
            </div>
            <h2 className="text-sm font-bold tracking-tight">Daily Production Excel & Live Sheet Sync</h2>
          </div>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          {/* Grid View Mode Toggle Switch */}
          <div 
            onClick={() => setIsCompact(!isCompact)}
            className="flex items-center gap-2 bg-white/10 hover:bg-white/15 px-2.5 py-1.5 rounded-lg cursor-pointer select-none transition-all active:scale-95"
            title={isCompact ? "Switch to Standard Mode" : "Switch to Compact Mode"}
          >
            <span className="text-[10px] uppercase font-mono tracking-wider text-[#a8f0cc] font-bold">Grid Scale:</span>
            <div className="flex items-center gap-1 text-[11px] font-semibold">
              {isCompact ? (
                <>
                  <ToggleRight className="h-4 w-4 text-emerald-300" />
                  <span>Compact</span>
                </>
              ) : (
                <>
                  <ToggleLeft className="h-4 w-4 text-white/60" />
                  <span>Standard</span>
                </>
              )}
            </div>
          </div>

          {spreadsheetId && (
            <a 
              href={`https://docs.google.com/spreadsheets/d/${spreadsheetId}`} 
              target="_blank" 
              rel="noreferrer"
              className="text-xs bg-white/20 hover:bg-white/35 transition px-3 py-1.5 rounded-lg font-medium flex items-center gap-1"
            >
              <ExternalLink className="h-3 w-3" />
              <span>Open Sheet</span>
            </a>
          )}
        </div>
      </div>

      {/* SYNC SETTINGS & CONTROLS CONTROL DECK */}
      <div className="p-4 bg-zinc-50 border-b border-zinc-200 grid grid-cols-1 md:grid-cols-12 gap-4 items-center">
        
        {/* Token and Settings Inputs */}
        <div className="md:col-span-8 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
          <div>
            <label className="block text-[10px] font-mono font-bold text-zinc-500 uppercase mb-1 flex items-center justify-between">
              <span>GSheets Access Token</span>
              <button 
                type="button" 
                onClick={showTokenHelp}
                className="text-emerald-700 hover:underline flex items-center gap-0.5"
              >
                <HelpCircle className="h-3 w-3" /> Get Token
              </button>
            </label>
            <div className="relative">
              <input
                type="password"
                placeholder="Google OAuth access token..."
                className="w-full text-xs rounded-lg border border-zinc-200 bg-white pl-8 pr-3 py-1.5 text-zinc-800 outline-none focus:border-[#107c41] transition"
                value={accessToken}
                onChange={(e) => setAccessToken(e.target.value)}
              />
              <Key className="absolute left-2.5 top-2 h-3.5 w-3.5 text-zinc-400" />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-mono font-bold text-zinc-500 uppercase mb-1">Target Spreadsheet ID</label>
            <input
              type="text"
              placeholder="e.g. 1AhGvPX6s-dF9Hk7..."
              className="w-full text-xs rounded-lg border border-zinc-200 bg-white px-3 py-1.5 text-zinc-800 outline-none focus:border-[#107c41] transition"
              value={spreadsheetId}
              onChange={(e) => setSpreadsheetId(e.target.value)}
            />
          </div>
        </div>

        {/* Integration Buttons */}
        <div className="md:col-span-4 flex flex-col sm:flex-row gap-2 shrink-0 md:justify-end">
          <button
            type="button"
            disabled={syncing}
            onClick={spreadsheetId ? handlePushAllData : handleCreateNewSheet}
            className={`text-xs font-semibold px-3 py-2 rounded-lg flex items-center justify-center gap-1.5 text-white active:scale-98 transition ${
              spreadsheetId 
                ? 'bg-[#107c41] hover:bg-[#0a5c30]' 
                : 'bg-emerald-600 hover:bg-emerald-700'
            }`}
          >
            {syncing ? (
              <RefreshCw className="h-3.5 w-3.5 animate-spin" />
            ) : (
              <RefreshCw className="h-3.5 w-3.5" />
            )}
            <span>{spreadsheetId ? 'Force Push All' : 'Create & Sync Sheet'}</span>
          </button>

          <button
            type="button"
            onClick={() => setAutoSync(!autoSync)}
            className={`text-xs font-semibold py-2 px-3 border rounded-lg flex items-center justify-center gap-1.5 transition ${
              autoSync 
                ? 'bg-emerald-50 text-emerald-800 border-emerald-250' 
                : 'bg-white text-zinc-650 border-zinc-200 hover:bg-zinc-50'
            }`}
          >
            {autoSync ? (
              <ToggleRight className="h-4 w-4 text-emerald-600" />
            ) : (
              <ToggleLeft className="h-4 w-4 text-zinc-400" />
            )}
            <span>Auto-Sync</span>
          </button>
        </div>
      </div>

      {/* FEEDBACK STATUS BAR */}
      <div className="bg-zinc-100/50 border-b border-zinc-200/80 px-4 py-2 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-[11px]">
        <div className="flex items-center gap-2">
          {syncStatus.success === true && <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600 shrink-0" />}
          {syncStatus.success === false && <AlertCircle className="h-3.5 w-3.5 text-rose-500 shrink-0" />}
          {syncStatus.success === null && <RefreshCw className="h-3.5 w-3.5 text-amber-500 animate-spin shrink-0" />}
          <span className="font-mono text-zinc-600 tracking-tight">{syncStatus.message}</span>
        </div>
        {syncStatus.timestamp && (
          <span className="text-[10px] font-mono text-zinc-400 shrink-0">
            updated: {syncStatus.timestamp}
          </span>
        )}
      </div>

      {/* FORMULA BAR & LIVE CELL EDITOR */}
      <div className="bg-white border-b border-zinc-200 px-3 py-1.5 flex items-center gap-2">
        <div className="text-[11px] font-mono font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded">
          {selectedCell ? `${String.fromCharCode(65 + selectedCell.col)}${selectedCell.row + 1}` : 'fx'}
        </div>
        <div className="h-4 w-[1px] bg-zinc-200"></div>
        <div className="flex-1">
          {selectedCell ? (
            <div className="flex items-center gap-1 w-full">
              <input
                type="text"
                className="w-full text-xs font-mono px-2 py-0.5 border border-[#107c41] outline-none rounded"
                value={editValue}
                onChange={(e) => setEditValue(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') handleCellSave();
                  if (e.key === 'Escape') setSelectedCell(null);
                }}
                autoFocus
              />
              <button 
                type="button" 
                onClick={handleCellSave}
                className="text-[10px] bg-[#107c41] text-white px-2 py-0.5 rounded font-mono font-semibold"
              >
                SAVE
              </button>
            </div>
          ) : (
            <div className="text-xs text-zinc-400 font-mono italic">
              Click any editable cell (B through J) in the grid to input values directly
            </div>
          )}
        </div>
      </div>

      {/* THE LIVE EXCEL-STYLE SHEET GRID */}
      <div className="overflow-x-auto max-w-full">
        <table className="w-full text-left border-collapse select-none">
          <thead>
            {/* COLUMN LETTER LABELS */}
            <tr className="bg-zinc-100 text-zinc-500 font-mono text-[10px] border-b border-zinc-200">
              <th className={`w-10 bg-zinc-200 text-center border-r border-zinc-300 font-bold ${isCompact ? 'py-0.5 text-[9px]' : 'py-1'}`}></th>
              {columns.map((col, idx) => (
                <th key={idx} className={`border-r border-zinc-200 text-center font-bold px-2 ${isCompact ? 'py-0.5 text-[9px]' : 'py-1'}`}>
                  {col.label}
                </th>
              ))}
            </tr>
            {/* COLUMN TITLE LABELS */}
            <tr className="bg-zinc-50 text-zinc-700 font-mono text-[10px] border-b border-zinc-200 uppercase tracking-wider">
              <th className={`w-10 bg-zinc-100 border-r border-zinc-200 text-center ${isCompact ? 'py-1 text-[9px]' : 'py-1.5'}`}>#</th>
              {columns.map((col, idx) => (
                <th 
                  key={idx} 
                  className={`border-r border-zinc-250 font-semibold whitespace-nowrap ${
                    isCompact ? 'py-1 px-1.5 text-[9px]' : 'py-2 px-3 text-[10px]'
                  }`}
                >
                  {col.title}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className={`font-mono text-zinc-800 ${isCompact ? 'text-[11px]' : 'text-xs'}`}>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={columns.length + 1} className="p-8 text-center text-zinc-400 font-sans italic bg-zinc-50/20">
                  No factory logs recorded yet. Add logs in the daily production form to populate your Google Sheet.
                </td>
              </tr>
            ) : (
              reports.map((report, rIdx) => (
                <tr 
                  key={report.id} 
                  className={`border-b border-zinc-150 hover:bg-[#eaf4ec]/60 transition-colors ${
                    rIdx % 2 === 0 ? 'bg-white' : 'bg-zinc-50/20'
                  }`}
                >
                  {/* ROW INDEX HEADER */}
                  <td className={`bg-zinc-50 text-zinc-400 font-bold border-r border-zinc-200 text-center ${
                    isCompact ? 'py-1 text-[10px]' : 'py-2.5'
                  }`}>
                    {rIdx + 1}
                  </td>
                  
                  {/* DATA CELLS */}
                  {columns.map((col, cIdx) => {
                    const cellVal = col.accessor(report);
                    const isSelected = selectedCell?.row === rIdx && selectedCell?.col === cIdx;
                    return (
                      <td 
                        key={cIdx} 
                        onClick={() => handleCellClick(rIdx, cIdx, cellVal)}
                        className={`border-r border-zinc-150 truncate cursor-cell transition-all ${
                          isCompact ? 'px-1.5 py-1 text-[10px] max-w-[120px]' : 'px-3 py-2 max-w-[200px]'
                        } ${
                          col.editable ? 'hover:bg-amber-50 hover:border-amber-300' : ''
                        } ${
                          isSelected ? 'bg-amber-100 border-2 border-amber-500 font-semibold text-zinc-950' : ''
                        }`}
                        title={col.editable ? 'Click to edit' : cellVal.toString()}
                      >
                        {cellVal}
                      </td>
                    );
                  })}
                </tr>
              ))
            )}

            {/* SHEET BOTTOM FORMULA SUMMARY ROW */}
            {reports.length > 0 && (
              <>
                {/* SUM OVERVIEW */}
                <tr className={`bg-zinc-100 font-bold border-t border-zinc-300 text-[#107c41] ${isCompact ? 'text-[10px]' : 'text-[11px]'}`}>
                  <td className={`bg-zinc-200 border-r border-zinc-300 text-center ${isCompact ? 'py-1' : 'py-2'}`}>Σ</td>
                  <td colSpan={6} className={`font-sans italic text-zinc-500 border-r border-zinc-150 ${isCompact ? 'px-1.5 py-1' : 'px-3 py-1.5'}`}>
                    Live Formula: =SUM(G:J, L:M)
                  </td>
                  <td className={`${isCompact ? 'px-1.5' : 'px-3'} border-r border-zinc-150`}>{calculateColumnSum(6).toLocaleString()}</td> {/* Length */}
                  <td className={`${isCompact ? 'px-1.5' : 'px-3'} border-r border-zinc-150`}>{calculateColumnSum(7).toLocaleString()}</td> {/* Width */}
                  <td className={`${isCompact ? 'px-1.5' : 'px-3'} border-r border-zinc-150`}>-</td> {/* Thickness */}
                  <td className={`${isCompact ? 'px-1.5' : 'px-3'} border-r border-zinc-150 text-emerald-800`}>{calculateColumnSum(9).toLocaleString()}</td> {/* Qty */}
                  <td className={`${isCompact ? 'px-1.5' : 'px-3'} border-r border-zinc-150`}>
                    {reports.reduce((sum, r) => sum + ((r.length * r.width * r.qty) / 1000000), 0).toFixed(2)}
                  </td> {/* Area */}
                  <td className={`${isCompact ? 'px-1.5' : 'px-3'} border-r border-zinc-150 text-indigo-800`}>
                    {reports.reduce((sum, r) => {
                      const d = getDensityByMaterial(r.sheet);
                      return sum + (((r.length * r.width * r.thickness * d) / 1000000) * r.qty);
                    }, 0).toFixed(1)}
                  </td> {/* Weight */}
                  <td className={`${isCompact ? 'px-1.5' : 'px-3'} border-r border-zinc-150 text-emerald-800`}>
                    ₹{reports.reduce((sum, r) => {
                      const d = getDensityByMaterial(r.sheet);
                      const weight = (((r.length * r.width * r.thickness * d) / 1000000) * r.qty);
                      return sum + Math.round(weight * getRetailPricePerKgByMaterial(r.sheet));
                    }, 0).toLocaleString('en-IN')}
                  </td> {/* Retail Value */}
                  <td className={`${isCompact ? 'px-1.5' : 'px-3'} border-r border-zinc-150 text-amber-800`}>
                    {reports.reduce((sum, r) => sum + r.downtimeEvents.reduce((s, e) => s + e.durationMinutes, 0), 0)}
                  </td> {/* Downtime */}
                </tr>

                {/* AVERAGE OVERVIEW */}
                <tr className={`bg-zinc-100 font-bold border-b border-zinc-300 text-indigo-700 ${isCompact ? 'text-[10px]' : 'text-[11px]'}`}>
                  <td className={`bg-zinc-200 border-r border-zinc-300 text-center ${isCompact ? 'py-1' : 'py-2'}`}>μ</td>
                  <td colSpan={6} className={`font-sans italic text-zinc-500 border-r border-zinc-150 ${isCompact ? 'px-1.5 py-1' : 'px-3 py-1.5'}`}>
                    Live Formula: =AVERAGE(G:J, L:M)
                  </td>
                  <td className={`${isCompact ? 'px-1.5' : 'px-3'} border-r border-zinc-150`}>{calculateColumnAvg(6).toFixed(1)}</td> {/* Length */}
                  <td className={`${isCompact ? 'px-1.5' : 'px-3'} border-r border-zinc-150`}>{calculateColumnAvg(7).toFixed(1)}</td> {/* Width */}
                  <td className={`${isCompact ? 'px-1.5' : 'px-3'} border-r border-zinc-150`}>{calculateColumnAvg(8).toFixed(2)}</td> {/* Thickness */}
                  <td className={`${isCompact ? 'px-1.5' : 'px-3'} border-r border-zinc-150`}>{calculateColumnAvg(9).toFixed(1)}</td> {/* Qty */}
                  <td className={`${isCompact ? 'px-1.5' : 'px-3'} border-r border-zinc-150`}>
                    {(reports.reduce((sum, r) => sum + ((r.length * r.width * r.qty) / 1000000), 0) / reports.length).toFixed(3)}
                  </td> {/* Area */}
                  <td className={`${isCompact ? 'px-1.5' : 'px-3'} border-r border-zinc-150`}>
                    {(reports.reduce((sum, r) => {
                      const d = getDensityByMaterial(r.sheet);
                      return sum + (((r.length * r.width * r.thickness * d) / 1000000) * r.qty);
                    }, 0) / reports.length).toFixed(1)}
                  </td> {/* Weight */}
                  <td className={`${isCompact ? 'px-1.5' : 'px-3'} border-r border-zinc-150 text-indigo-700`}>
                    ₹{(reports.reduce((sum, r) => {
                      const d = getDensityByMaterial(r.sheet);
                      const weight = (((r.length * r.width * r.thickness * d) / 1000000) * r.qty);
                      return sum + Math.round(weight * getRetailPricePerKgByMaterial(r.sheet));
                    }, 0) / reports.length).toLocaleString('en-IN', { maximumFractionDigits: 0 })}
                  </td> {/* Retail Value Avg */}
                  <td className={`${isCompact ? 'px-1.5' : 'px-3'} border-r border-zinc-150`}>
                    {(reports.reduce((sum, r) => sum + r.downtimeEvents.reduce((s, e) => s + e.durationMinutes, 0), 0) / reports.length).toFixed(1)}
                  </td> {/* Downtime */}
                </tr>
              </>
            )}
          </tbody>
        </table>
      </div>

      {/* FOOTER LEGEND */}
      <div className="bg-zinc-50 p-3.5 border-t border-zinc-200 text-2xs text-zinc-500 flex flex-col sm:flex-row justify-between gap-2.5">
        <div className="flex items-center gap-1">
          <Info className="h-3.5 w-3.5 text-zinc-400 shrink-0" />
          <span>Double-click or click on numerical metrics within column boundaries or shift states to run instant cell level overrides.</span>
        </div>
        <span className="font-mono text-zinc-400">Sheet Tab: [Sheet1]</span>
      </div>
    </div>
  );
};
