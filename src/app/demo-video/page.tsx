'use client';

import React, { useRef, useState } from 'react';
import Link from 'next/link';
import { Logo3D } from '@/components/Logo3D';
import {
  Play,
  Pause,
  Download,
  FileText,
  Shield,
  Layers,
  ArrowLeft,
  Clock,
  CheckCircle2,
  ExternalLink,
  Volume2,
} from 'lucide-react';

interface Chapter {
  timestamp: string;
  seconds: number;
  title: string;
  description: string;
}

const CHAPTERS: Chapter[] = [
  {
    timestamp: '0:00',
    seconds: 0,
    title: 'The Problem: Premature Payouts & Escrow Need',
    description: 'Split-Screen Login Portal, B2B cashflow vulnerability & 3D institutional identity.',
  },
  {
    timestamp: '0:22',
    seconds: 22,
    title: '1-Click Sandbox Session & AG Grid Blotter',
    description: 'Instant zero-friction judge authentication, 4 KPI ticker metrics, and real-time ledger.',
  },
  {
    timestamp: '0:48',
    seconds: 48,
    title: 'Agentic Treasury Command Bar (Cmd+K)',
    description: 'Autonomous escrow authorization with PayPal Agent Toolkit & live SSE cell flashing.',
  },
  {
    timestamp: '1:18',
    seconds: 78,
    title: 'Cryptographic AI Audit & Step-Up MFA Capture',
    description: 'SSRF & magic-byte proof inspection, 96% compliance check, and TOTP settlement.',
  },
  {
    timestamp: '1:52',
    seconds: 112,
    title: 'Dynamic Blotter Filtering & Invoicing v2',
    description: 'High-value escrow isolation in AG Grid and instant PayPal Invoicing v2 generation.',
  },
  {
    timestamp: '2:05',
    seconds: 125,
    title: 'SHA-256 Merkle Audit Trail & 20/20 OWASP Defense',
    description: 'Cryptographic integrity verification and live 20-point automated penetration testing.',
  },
];

export default function DemoVideoPage() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(155.35);
  const [activeChapterIndex, setActiveChapterIndex] = useState(0);
  const [showScript, setShowScript] = useState(false);

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    } else {
      videoRef.current.pause();
      setIsPlaying(false);
    }
  };

  const jumpToSeconds = (sec: number, index: number) => {
    if (!videoRef.current) return;
    videoRef.current.currentTime = sec;
    setActiveChapterIndex(index);
    if (videoRef.current.paused) {
      videoRef.current.play();
      setIsPlaying(true);
    }
  };

  const handleTimeUpdate = () => {
    if (!videoRef.current) return;
    const cur = videoRef.current.currentTime;
    setCurrentTime(cur);

    // Update active chapter
    for (let i = CHAPTERS.length - 1; i >= 0; i--) {
      if (cur >= CHAPTERS[i].seconds) {
        setActiveChapterIndex(i);
        break;
      }
    }
  };

  const formatTime = (sec: number) => {
    const mins = Math.floor(sec / 60);
    const s = Math.floor(sec % 60);
    return `${mins}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex flex-col selection:bg-emerald-500/30">
      {/* Top Header */}
      <header className="border-b border-white/10 bg-slate-900/50 backdrop-blur-xl sticky top-0 z-40 px-6 py-3.5 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <Link
            href="/"
            className="flex items-center gap-2 text-xs text-slate-400 hover:text-white transition-colors bg-white/5 hover:bg-white/10 px-3 py-1.5 rounded-lg border border-white/10"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to Terminal
          </Link>
          <div className="flex items-center gap-3">
            <Logo3D size="sm" />
            <div>
              <div className="flex items-center gap-2">
                <span className="font-semibold text-sm text-white tracking-tight">LedgerGuard</span>
                <span className="px-2 py-0.5 rounded text-[10px] font-mono uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30">
                  Official 3-Min Walkthrough
                </span>
              </div>
              <span className="text-[11px] text-slate-400">
                PayPal AI Hackathon Submission Video (1080p 60fps)
              </span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <a
            href="/video/ledgerguard-demo-3min.mp4"
            download="ledgerguard-demo-3min.mp4"
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-emerald-600 hover:bg-emerald-500 text-white transition-all shadow-lg shadow-emerald-500/20 border border-emerald-400/30"
          >
            <Download className="w-3.5 h-3.5" />
            Download MP4 (5.5 MB)
          </a>
          <button
            onClick={() => setShowScript(!showScript)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium bg-white/5 hover:bg-white/10 text-slate-300 border border-white/10 transition-colors"
          >
            <FileText className="w-3.5 h-3.5" />
            {showScript ? 'Hide Script' : 'View Script'}
          </button>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl mx-auto w-full p-6 grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Left Column: Video Player (8 cols) */}
        <div className="lg:col-span-8 space-y-4">
          <div className="relative rounded-2xl overflow-hidden border border-white/15 bg-black shadow-2xl shadow-cyan-950/40 group">
            <video
              ref={videoRef}
              src="/video/ledgerguard-demo-3min.mp4"
              className="w-full aspect-video object-contain bg-black cursor-pointer"
              onClick={togglePlay}
              onTimeUpdate={handleTimeUpdate}
              onLoadedMetadata={() => {
                if (videoRef.current) setDuration(videoRef.current.duration);
              }}
              onPlay={() => setIsPlaying(true)}
              onPause={() => setIsPlaying(false)}
              controls
              playsInline
            />
          </div>

          {/* Quick Stats Strip */}
          <div className="grid grid-cols-4 gap-3">
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Duration</span>
              <span className="text-sm font-mono font-semibold text-emerald-400">2m 35s</span>
              <span className="text-[10px] text-slate-500 block">&lt; 3:00 Devpost Limit</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Resolution</span>
              <span className="text-sm font-mono font-semibold text-cyan-400">1080p FHD</span>
              <span className="text-[10px] text-slate-500 block">30 fps High Profile</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Audio Narration</span>
              <span className="text-sm font-mono font-semibold text-indigo-400">AI Voiceover</span>
              <span className="text-[10px] text-slate-500 block">145 WPM Natural Sync</span>
            </div>
            <div className="p-3 rounded-xl bg-white/5 border border-white/10 backdrop-blur-md">
              <span className="text-[10px] text-slate-400 uppercase tracking-wider block">Subtitles</span>
              <span className="text-sm font-mono font-semibold text-amber-400">Embedded + SRT</span>
              <span className="text-[10px] text-slate-500 block">Universal CC Track</span>
            </div>
          </div>

          {/* Collapsible Script Drawer */}
          {showScript && (
            <div className="p-5 rounded-2xl bg-slate-900/80 border border-white/10 backdrop-blur-xl space-y-3">
              <div className="flex items-center justify-between border-b border-white/10 pb-2.5">
                <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
                  <FileText className="w-4 h-4 text-emerald-400" />
                  Official Spoken Voiceover Script (Exact 2:35 Audio Track)
                </h3>
                <span className="text-[11px] font-mono text-slate-400">378 words · 145 wpm</span>
              </div>
              <div className="text-xs text-slate-300 leading-relaxed font-sans space-y-3 max-h-72 overflow-y-auto pr-2 custom-scrollbar">
                <p>
                  In modern B-to-B commerce... paying an invoice too early is a massive financial risk. Businesses lose
                  billions every year to premature payouts, unverified contractor milestones, and manual invoice
                  reconciliation. And while A.I. agents can now initiate payments... giving an autonomous agent direct access
                  to company funds—without strict verification—is a recipe for disaster.
                </p>
                <p>
                  Meet LedgerGuard... an institutional, agentic treasury and proof-of-delivery escrow terminal, built on the
                  PayPal Developer Platform and A-G Grid.
                </p>
                <p>
                  Instead of sending irreversible payouts immediately... LedgerGuard uses PayPal Orders V-2 to place funds
                  into an Authorized Hold. The capital remains locked in PayPal Sandbox escrow until our autonomous A.I.
                  Auditor verifies cryptographic proof of delivery.
                </p>
                <p>
                  Let&apos;s walk through a live end-to-end transaction. From the login portal, judges can click the Instant
                  Sandbox Session button to provision an isolated treasury workspace—secured by HTTP-only JWT cookies, strict
                  C-S-R-F verification, and role-based access control.
                </p>
                <p>
                  Inside the main terminal, our financial blotter—powered by A-G Grid—tracks every active PayPal authorization,
                  risk score, and settlement state in real time. Pressing Command-K opens the Agentic Treasury Command Bar.
                  Let&apos;s instruct the agent, in plain English, to create a one-thousand-four-hundred-and-fifty-dollar escrow
                  hold for Vertex Semiconductor.
                </p>
                <p>
                  Watch what happens behind the scenes. The agent invokes the PayPal Agent Toolkit... authenticates with
                  PayPal&apos;s O-Auth-2 Sandbox API... and executes an Orders V-2 Authorize call. Within milliseconds, our
                  Server-Sent Events stream catches the webhook and flashes the new row directly inside A-G Grid—with zero
                  page reload.
                </p>
                <p>
                  Now... suppose the vendor uploads their delivery manifest and invoice. Before releasing a single dollar, we
                  click Run A.I. Audit. First, our SSRF and magic-byte file guards validate the uploaded document. Next, the
                  Treasury Auditor Agent cross-checks the line items against our organization&apos;s active Treasury Policy. If
                  there is a discrepancy, a secondary Negotiator Agent flags the dispute automatically.
                </p>
                <p>
                  Here, the delivery proof passes every policy rule with a compliance score of ninety-six percent. To release
                  the funds, we trigger Step-Up Multi-Factor Authentication, enter our six-digit verification code, and
                  execute the live PayPal Capture API. The held authorization is settled immediately in the PayPal Sandbox, and
                  A-G Grid updates the ledger status to Captured.
                </p>
                <p>
                  We can also ask the agent to filter the A-G Grid table dynamically—such as isolating all high-value holds
                  over one thousand dollars—or generate a live PayPal Sandbox Invoice using the Invoicing V-2 API in seconds.
                </p>
                <p>
                  Finally... institutional finance demands military-grade security. If we inspect the raw database, sensitive
                  vendor records are encrypted at rest using A-E-S-256-G-C-M ciphertext. In the Audit Explorer, every single
                  A.I. decision and PayPal API payload is chained together with SHA-256 hashes—making the ledger completely
                  tamper-evident. And on our live Security Posture screen, we can run an automated twenty-point OWASP
                  self-test across SQL injection, X-S-S, I-D-O-R, and webhook signature verification—passing twenty out of
                  twenty checks live.
                </p>
                <p>
                  LedgerGuard turns PayPal into a programmable, verifiable escrow engine for the agentic economy. Thank you
                  for watching.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Right Column: Interactive Chapters & Downloads (4 cols) */}
        <div className="lg:col-span-4 space-y-4">
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl">
            <h2 className="text-xs font-semibold text-white uppercase tracking-wider mb-3 flex items-center gap-2">
              <Clock className="w-4 h-4 text-emerald-400" />
              Interactive Chapter Navigation
            </h2>
            <div className="space-y-2">
              {CHAPTERS.map((chap, idx) => {
                const isActive = activeChapterIndex === idx;
                return (
                  <button
                    key={chap.timestamp}
                    onClick={() => jumpToSeconds(chap.seconds, idx)}
                    className={`w-full text-left p-3 rounded-xl transition-all border ${
                      isActive
                        ? 'bg-emerald-500/15 border-emerald-500/40 text-white shadow-lg shadow-emerald-950/30'
                        : 'bg-white/5 border-white/5 hover:bg-white/10 hover:border-white/15 text-slate-300'
                    }`}
                  >
                    <div className="flex items-center justify-between mb-1">
                      <span className="font-mono text-xs font-bold text-emerald-400">{chap.timestamp}</span>
                      {isActive && (
                        <span className="px-1.5 py-0.5 rounded text-[9px] font-mono bg-emerald-500/30 text-emerald-300 border border-emerald-400/30">
                          NOW PLAYING
                        </span>
                      )}
                    </div>
                    <div className="text-xs font-medium leading-snug">{chap.title}</div>
                    <div className="text-[11px] text-slate-400 mt-1 line-clamp-2">{chap.description}</div>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Quick Assets Download Card */}
          <div className="p-4 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-xl space-y-2.5">
            <h3 className="text-xs font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <Download className="w-4 h-4 text-cyan-400" />
              Media Assets &amp; Submission Files
            </h3>
            <div className="space-y-2 text-xs">
              <a
                href="/video/ledgerguard-demo-3min.mp4"
                download="ledgerguard-demo-3min.mp4"
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-colors"
              >
                <span className="font-mono">ledgerguard-demo-3min.mp4</span>
                <span className="text-[10px] text-slate-400">5.5 MB</span>
              </a>
              <a
                href="/video/subtitles.srt"
                download="subtitles.srt"
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-colors"
              >
                <span className="font-mono">subtitles.srt</span>
                <span className="text-[10px] text-slate-400">SubRip CC</span>
              </a>
              <a
                href="/audio/voiceover-2m35s-master.m4a"
                download="voiceover-2m35s-master.m4a"
                className="w-full flex items-center justify-between p-2.5 rounded-lg bg-white/5 hover:bg-white/10 border border-white/10 text-slate-200 transition-colors"
              >
                <span className="font-mono">voiceover-2m35s-master.m4a</span>
                <span className="text-[10px] text-slate-400">Audio Only</span>
              </a>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
}
