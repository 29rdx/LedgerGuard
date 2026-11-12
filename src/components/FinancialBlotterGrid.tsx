'use client';

import React, { memo } from 'react';
import { AgGridReact } from 'ag-grid-react';
import { ColDef, SelectionChangedEvent } from 'ag-grid-community';
import { FinancialBlotterRow } from '@/types';
import { Coins } from 'lucide-react';

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
  return (
    <div className="liquid-glass rounded-2xl border border-white/20 dark:border-white/10 shadow-xl overflow-hidden specular-border">
      <div className="px-5 py-3.5 border-b border-white/10 dark:border-white/10 flex flex-wrap items-center justify-between gap-2 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-blue-500/10 border border-blue-500/20 text-cyan-400">
            <Coins className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold uppercase tracking-wider text-slate-800 dark:text-slate-200">
            Live Financial Blotter ({rowData.length} entries)
          </span>
        </div>

        <div className="flex items-center gap-3 text-[11px] font-mono text-slate-400">
          <span className="text-cyan-400 font-semibold">ag-grid-react 36.2</span>
          <span>·</span>
          <span>Multi-Row Selection</span>
          <span>·</span>
          <span>Floating Filters</span>
          <span>·</span>
          <span className="flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
            <span>SSE Real-Time Sync</span>
          </span>
        </div>
      </div>

      <div className="h-[520px] w-full ag-theme-alpine">
        <AgGridReact<FinancialBlotterRow>
          ref={gridRef}
          rowData={rowData}
          columnDefs={columnDefs}
          loading={loading}
          getRowId={(params) => params.data.id}
          defaultColDef={defaultColDef}
          rowSelection="multiple"
          onSelectionChanged={onSelectionChanged}
          animateRows={true}
          pagination={true}
          paginationPageSize={10}
        />
      </div>
    </div>
  );
});

export default FinancialBlotterGrid;

