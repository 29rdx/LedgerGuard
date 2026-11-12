'use client';

import { useState } from 'react';
import {
  TrendingUp,
  PieChart,
  ShieldAlert,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  Activity,
  ArrowUpRight,
  Sparkles,
} from 'lucide-react';

interface VelocityPoint {
  day: string;
  amount: number;
  holds: number;
}

const VELOCITY_DATA: VelocityPoint[] = [
  { day: 'Day 1', amount: 14500, holds: 18000 },
  { day: 'Day 5', amount: 28200, holds: 22400 },
  { day: 'Day 10', amount: 45800, holds: 31000 },
  { day: 'Day 15', amount: 72400, holds: 38500 },
  { day: 'Day 20', amount: 112000, holds: 41200 },
  { day: 'Day 25', amount: 154800, holds: 36000 },
  { day: 'Day 30', amount: 184500, holds: 42350 },
];

export function TreasuryInsightsSkeleton() {
  return (
    <div className="bg-white dark:bg-[#11131A] border border-slate-200 dark:border-[#1E2230] rounded-lg shadow-xs overflow-hidden animate-pulse">
      <div className="px-4 py-3 border-b border-slate-200 dark:border-[#1E2230] flex items-center justify-between bg-slate-50/50 dark:bg-slate-900/40">
        <div className="h-4 w-56 bg-slate-200 dark:bg-slate-800 rounded" />
        <div className="h-4 w-24 bg-slate-200 dark:bg-slate-800 rounded" />
      </div>
      <div className="p-4 grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 h-44 bg-slate-100 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-800/60" />
        <div className="h-44 bg-slate-100 dark:bg-slate-900/60 rounded border border-slate-200 dark:border-slate-800/60" />
      </div>
    </div>
  );
}

export function TreasuryInsights() {
  const [isExpanded, setIsExpanded] = useState(true);
  const [activePoint, setActivePoint] = useState<VelocityPoint | null>(null);

  // SVG dimensions for Line Chart
  const width = 500;
  const height = 140;
  const padding = 20;

  const maxAmount = 200000;
  const points = VELOCITY_DATA.map((d, index) => {
    const x = padding + (index / (VELOCITY_DATA.length - 1)) * (width - 2 * padding);
    const y = height - padding - (d.amount / maxAmount) * (height - 2 * padding);
    return { x, y, ...d };
  });

  const pathD = points.reduce(
    (acc, p, i) => `${acc} ${i === 0 ? 'M' : 'L'} ${p.x} ${p.y}`,
    ''
  );

  const areaD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  return (
    <div className="mb-6 liquid-glass rounded-2xl border border-white/20 dark:border-white/10 shadow-xl overflow-hidden specular-border">
      {/* Header Banner */}
      <div className="px-5 py-3.5 flex items-center justify-between border-b border-white/10 dark:border-white/10 bg-white/40 dark:bg-slate-900/40 backdrop-blur-md">
        <div className="flex items-center gap-2.5">
          <div className="p-1.5 rounded-lg bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">
            <Activity className="w-4 h-4 text-emerald-400" />
          </div>
          <div>
            <h3 className="text-xs font-bold uppercase tracking-wider text-slate-900 dark:text-slate-100 font-mono">
              Institutional Financial Analytics & Risk Telemetry
            </h3>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="hidden sm:inline-flex items-center gap-1.5 px-2 py-0.5 rounded text-[11px] font-mono bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-900/40 text-emerald-700 dark:text-emerald-300 font-medium">
            <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            Live 30-Day Escrow Velocity
          </div>
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="p-1 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors"
            title={isExpanded ? 'Collapse Analytics' : 'Expand Analytics'}
          >
            {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
          </button>
        </div>
      </div>

      {/* Visual Analytics Content */}
      {isExpanded && (
        <div className="p-4 grid grid-cols-1 lg:grid-cols-12 gap-6 items-center">
          {/* Chart 1: Escrow Liquidity Velocity (7 Cols) */}
          <div className="lg:col-span-7 flex flex-col justify-between">
            <div className="flex items-center justify-between mb-2">
              <div>
                <div className="text-[11px] uppercase tracking-wider text-slate-500 font-mono">
                  Escrow Liquidity Velocity (30 Days)
                </div>
                <div className="text-lg font-bold font-mono text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>$184,500.00 USD</span>
                  <span className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 flex items-center">
                    <ArrowUpRight className="w-3.5 h-3.5" /> +24.8%
                  </span>
                </div>
              </div>
              <div className="text-right text-[11px] font-mono text-slate-400">
                Active Holds: <strong className="text-slate-700 dark:text-slate-300 font-semibold">$42,350.00</strong>
              </div>
            </div>

            {/* SVG Line / Area Graph */}
            <div className="relative w-full h-[120px] bg-slate-50/50 dark:bg-slate-900/30 rounded border border-slate-100 dark:border-slate-800/80 overflow-hidden flex items-end">
              <svg
                viewBox={`0 0 ${width} ${height}`}
                className="w-full h-full overflow-visible"
                preserveAspectRatio="none"
              >
                <defs>
                  <linearGradient id="velocityGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#059669" stopOpacity="0.25" />
                    <stop offset="100%" stopColor="#059669" stopOpacity="0.0" />
                  </linearGradient>
                </defs>

                {/* Grid guidelines */}
                <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#334155" strokeDasharray="3 3" strokeOpacity="0.2" />
                <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#334155" strokeDasharray="3 3" strokeOpacity="0.2" />
                <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#334155" strokeOpacity="0.3" />

                {/* Filled Area */}
                <path d={areaD} fill="url(#velocityGradient)" />

                {/* Line Path */}
                <path d={pathD} fill="none" stroke="#059669" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />

                {/* Data Points */}
                {points.map((p, idx) => (
                  <circle
                    key={idx}
                    cx={p.x}
                    cy={p.y}
                    r={activePoint?.day === p.day ? '4.5' : '3'}
                    className="cursor-pointer transition-all fill-emerald-600 dark:fill-emerald-400 stroke-white dark:stroke-slate-900 stroke-2"
                    onMouseEnter={() => setActivePoint(p)}
                    onMouseLeave={() => setActivePoint(null)}
                  />
                ))}
              </svg>

              {/* Tooltip Overlay */}
              {activePoint && (
                <div className="absolute top-2 right-2 bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900 text-[10px] font-mono px-2 py-1 rounded shadow-md pointer-events-none">
                  {activePoint.day}: ${activePoint.amount.toLocaleString()} USD Settled
                </div>
              )}
            </div>

            <div className="flex justify-between text-[10px] font-mono text-slate-400 mt-1.5 px-2">
              <span>Day 1 (Authorize)</span>
              <span>Day 15 (Mid-Month)</span>
              <span>Day 30 (Captured Settlement)</span>
            </div>
          </div>

          {/* Chart 2: AI Dispute & Audit Resolution Rate (5 Cols) */}
          <div className="lg:col-span-5 lg:border-l lg:border-slate-200/80 lg:dark:border-[#1E2230] lg:pl-6">
            <div className="text-[11px] uppercase tracking-wider text-slate-500 font-mono mb-2">
              AI Dispute & Audit Resolution
            </div>

            <div className="flex items-center gap-5">
              {/* SVG Donut Chart */}
              <div className="relative w-24 h-24 shrink-0 flex items-center justify-center">
                <svg className="w-full h-full -rotate-90" viewBox="0 0 36 36">
                  {/* Background Track */}
                  <circle cx="18" cy="18" r="15.915" fill="none" stroke="#1e293b" strokeWidth="3.8" strokeOpacity="0.2" />

                  {/* Auto-Approved: 82% (#059669) */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="none"
                    stroke="#059669"
                    strokeWidth="3.8"
                    strokeDasharray="82, 100"
                    strokeDashoffset="0"
                    strokeLinecap="round"
                  />

                  {/* Negotiated & Resolved: 14% (#D97706) */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="none"
                    stroke="#d97706"
                    strokeWidth="3.8"
                    strokeDasharray="14, 100"
                    strokeDashoffset="-82"
                    strokeLinecap="round"
                  />

                  {/* Flagged / Board Review: 4% (#DC2626) */}
                  <circle
                    cx="18"
                    cy="18"
                    r="15.915"
                    fill="none"
                    stroke="#dc2626"
                    strokeWidth="3.8"
                    strokeDasharray="4, 100"
                    strokeDashoffset="-96"
                    strokeLinecap="round"
                  />
                </svg>

                {/* Inner Donut Metric */}
                <div className="absolute inset-0 flex flex-col items-center justify-center text-center">
                  <span className="text-xs font-bold font-mono text-slate-900 dark:text-slate-100">
                    96%
                  </span>
                  <span className="text-[8px] font-mono uppercase text-slate-400">
                    Resolved
                  </span>
                </div>
              </div>

              {/* Legend & Breakdown */}
              <div className="flex-1 space-y-1.5 text-[11px] font-mono">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-600 dark:bg-emerald-400" />
                    <span className="text-slate-700 dark:text-slate-300">Auto-Approved:</span>
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">82%</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-600 dark:bg-amber-400" />
                    <span className="text-slate-700 dark:text-slate-300">Multi-Agent Settle:</span>
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">14%</span>
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-red-600 dark:bg-red-400" />
                    <span className="text-slate-700 dark:text-slate-300">Board Review:</span>
                  </div>
                  <span className="font-semibold text-slate-900 dark:text-slate-100">4%</span>
                </div>
              </div>
            </div>

            <div className="mt-3 p-2 rounded bg-slate-50 dark:bg-slate-900/50 border border-slate-100 dark:border-slate-800 text-[10px] text-slate-500 font-mono flex items-center justify-between">
              <span>Avg SLA: <strong>1.4 hrs</strong></span>
              <span>Dispute Reduction: <strong>-91%</strong></span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

