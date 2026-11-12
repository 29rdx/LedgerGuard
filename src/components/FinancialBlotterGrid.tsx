'use client';

import React, { memo, useMemo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import {
  ColDef,
  SelectionChangedEvent,
  ModuleRegistry,
  AllCommunityModule,
  ValidationModule,
  RowSelectionOptions,
} from 'ag-grid-community';
import { FinancialBlotterRow } from '@/types';
import { Coins } from 'lucide-react';

// Register all AG Grid community modules (selection, pagination, filters, row models) and validation
ModuleRegistry.registerModules([AllCommunityModule, ValidationModule]);

export function BlotterSkeleton() {
  return (
    <div className="bg-white dark:bg-[#11131A] border border-slate-200 dark:border-[#1E2230] rounded-lg shadow-xs overflow-hidden">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-[#1E2230] flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
        <div className="h-4 w-48 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
        <div className="h-4 w-64 bg-slate-200 dark:bg-slate-800 rounded animate-pulse" />
      </div>
      <div className="h-[520px] w-full p-4 flex flex-col justify-between animate-pulse">
        <div className="h-9 bg-slate-100 dark:bg-slate-800/80 rounded w-full mb-2" />
        <div className="space-y-2 flex-1">
          {Array.from({ length: 9 }).map((_, i) => (
            <div
              key={i}
              className="h-10 bg-slate-50 dark:bg-slate-900/60 rounded border border-slate-100 dark:border-slate-800/40 w-full"
            />
          ))}
        </div>
        <div className="h-8 bg-slate-100 dark:bg-slate-800/80 rounded w-full mt-2" />
      </div>
    </div>
  );
}

interface FinancialBlotterGridProps {
  gridRef: React.RefObject<AgGridReact<FinancialBlotterRow> | null>;
  rowData: FinancialBlotterRow[];
  columnDefs: ColDef<FinancialBlotterRow>[];
  loading: boolean;
  onSelectionChanged: (event: SelectionChangedEvent<FinancialBlotterRow>) => void;
  defaultColDef: ColDef;
}

export const FinancialBlotterGrid = memo(function FinancialBlotterGrid({
  gridRef,
  rowData,
  columnDefs,
  loading,
  onSelectionChanged,
  defaultColDef,
}: FinancialBlotterGridProps) {
  const rowSelection = useMemo<RowSelectionOptions<FinancialBlotterRow>>(
    () => ({
      mode: 'multiRow',
      checkboxes: true,
      headerCheckbox: true,
      enableClickSelection: false,
    }),
    []
  );

  return (
    <div className="liquid-ice-card rounded-2xl border border-sky-400/25 dark:border-sky-500/20 shadow-2xl overflow-hidden ice-specular-border backdrop-blur-3xl">
      <div className="px-5 py-3.5 border-b border-sky-400/20 dark:border-sky-500/15 flex flex-wrap items-center justify-between gap-2 bg-white/30 dark:bg-sky-950/30 backdrop-blur-xl">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-xl bg-sky-500/15 border border-sky-400/30 text-sky-400 shadow-[0_0_12px_rgba(56,189,248,0.25)]">
            <Coins className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-sky-100">
            Live Financial Blotter ({rowData.length} entries)
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-sky-700 dark:text-sky-300/70">
          <span className="text-sky-400 font-semibold">ag-grid-react 36.2</span>
          <span>·</span>
          <span>Multi-Row Selection</span>
          <span>·</span>
          <span>Floating Filters</span>
          <span>·</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse shadow-[0_0_6px_rgba(52,211,153,0.9)]" />
            <span>SSE Real-Time Sync</span>
          </span>
        </div>
      </div>

      <div className="h-[520px] w-full ag-theme-alpine">
        <AgGridReact<FinancialBlotterRow>
          theme="legacy"
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          loading={loading}
          getRowId={(params) => params.data.id}
          defaultColDef={defaultColDef}
          rowSelection={rowSelection}
          onSelectionChanged={onSelectionChanged}
          animateRows={true}
          pagination={true}
          paginationPageSize={10}
          paginationPageSizeSelector={[10, 25, 50, 100]}
        />
      </div>
    </div>
  );
});

export default FinancialBlotterGrid;

