'use client';

import React, { useState } from 'react';

interface Logo3DProps {
  size?: 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  showText?: boolean;
  interactive?: boolean;
}

export function Logo3D({
  size = 'md',
  className = '',
  showText = false,
  interactive = true,
}: Logo3DProps) {
  const [rotate, setRotate] = useState({ x: 0, y: 0 });
  const [isHovered, setIsHovered] = useState(false);

  const dimension = {
    sm: 32,
    md: 40,
    lg: 60,
    xl: 84,
  }[size];

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!interactive) return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = e.clientX - rect.left - rect.width / 2;
    const y = e.clientY - rect.top - rect.height / 2;
    setRotate({
      x: -(y / (rect.height / 2)) * 14,
      y: (x / (rect.width / 2)) * 14,
    });
  };

  const handleMouseLeave = () => {
    if (!interactive) return;
    setRotate({ x: 0, y: 0 });
    setIsHovered(false);
  };

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {/* 3D Shield / Merkle Prism Container */}
      <div
        onMouseMove={handleMouseMove}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={handleMouseLeave}
        style={{
          width: dimension,
          height: dimension,
          perspective: 600,
        }}
        className="relative cursor-pointer shrink-0"
      >
        <div
          style={{
            transform: `rotateX(${rotate.x}deg) rotateY(${rotate.y}deg) scale3d(${isHovered ? 1.06 : 1}, ${isHovered ? 1.06 : 1}, 1)`,
            transition: isHovered ? 'transform 0.1s ease-out' : 'transform 0.5s cubic-bezier(0.34, 1.56, 0.64, 1)',
            transformStyle: 'preserve-3d',
          }}
          className="w-full h-full relative"
        >
          {/* Ambient Glow behind the logo */}
          <div
            className={`absolute -inset-1 rounded-2xl bg-gradient-to-tr from-blue-600/40 via-cyan-400/30 to-indigo-500/40 blur-md transition-opacity duration-500 ${
              isHovered ? 'opacity-90 scale-110' : 'opacity-40'
            }`}
          />

          {/* SVG 3D Prismatic Shield */}
          <svg
            viewBox="0 0 100 100"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
            className="w-full h-full relative z-10 drop-shadow-[0_8px_16px_rgba(0,112,186,0.35)]"
          >
            <defs>
              {/* Outer Metallic Rim Gradient */}
              <linearGradient id="shieldRim" x1="10" y1="10" x2="90" y2="90" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
                <stop offset="25%" stopColor="#38BDF8" />
                <stop offset="70%" stopColor="#0070BA" />
                <stop offset="100%" stopColor="#003087" />
              </linearGradient>

              {/* Left 3D Facet (Shaded Metallic Dark) */}
              <linearGradient id="facetLeft" x1="20" y1="20" x2="50" y2="85" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#005ea6" />
                <stop offset="50%" stopColor="#003087" />
                <stop offset="100%" stopColor="#071b4a" />
              </linearGradient>

              {/* Right 3D Facet (Bright Cyan & Prismatic Light) */}
              <linearGradient id="facetRight" x1="50" y1="20" x2="80" y2="85" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#38BDF8" />
                <stop offset="40%" stopColor="#0070BA" />
                <stop offset="100%" stopColor="#004785" />
              </linearGradient>

              {/* Top Specular Chamfer */}
              <linearGradient id="topChamfer" x1="20" y1="16" x2="80" y2="16" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.9" />
                <stop offset="50%" stopColor="#7DD3FC" stopOpacity="0.95" />
                <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.4" />
              </linearGradient>

              {/* Inner Core Glass */}
              <linearGradient id="innerCore" x1="30" y1="30" x2="70" y2="70" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#00CFDE" stopOpacity="0.8" />
                <stop offset="50%" stopColor="#0070BA" stopOpacity="0.9" />
                <stop offset="100%" stopColor="#1E1B4B" stopOpacity="0.95" />
              </linearGradient>

              {/* Glass Glint Overlay */}
              <linearGradient id="glint" x1="0" y1="0" x2="100" y2="100" gradientUnits="userSpaceOnUse">
                <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.6" />
                <stop offset="35%" stopColor="#FFFFFF" stopOpacity="0.1" />
                <stop offset="70%" stopColor="#FFFFFF" stopOpacity="0" />
              </linearGradient>

              {/* Specular Drop Filter */}
              <filter id="softGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="3" result="blur" />
                <feComposite in="SourceGraphic" in2="blur" operator="over" />
              </filter>
            </defs>

            {/* Base Drop Shadow Backplate */}
            <path
              d="M50 88L20 72V24L50 14L80 24V72L50 88Z"
              fill="#050B18"
              opacity="0.6"
            />

            {/* Outer 3D Chamfered Rim */}
            <path
              d="M50 86L18 70V23L50 13L82 23V70L50 86Z"
              fill="url(#shieldRim)"
            />

            {/* Inset Base Shield Body */}
            <path
              d="M50 82L22 68V26L50 16L78 26V68L50 82Z"
              fill="#090E1A"
            />

            {/* Left 3D Dark Facet */}
            <path
              d="M50 82L22 68V26L50 16V82Z"
              fill="url(#facetLeft)"
            />

            {/* Right 3D Illuminated Facet */}
            <path
              d="M50 82L78 68V26L50 16V82Z"
              fill="url(#facetRight)"
            />

            {/* Center Prismatic Core Diamond */}
            <path
              d="M50 28L68 45L50 68L32 45L50 28Z"
              fill="url(#innerCore)"
              filter="url(#softGlow)"
            />

            {/* Core Left Dark Half */}
            <path
              d="M50 28L32 45L50 68V28Z"
              fill="#003087"
              opacity="0.4"
            />

            {/* Floating Merkle Node / Cryptographic Lock Icon in Core */}
            <circle cx="50" cy="46" r="5" fill="#FFFFFF" />
            <path
              d="M50 38V42M50 50V54M42 46H46M54 46H58"
              stroke="#FFFFFF"
              strokeWidth="2"
              strokeLinecap="round"
            />

            {/* Top Beveled Specular Highlight Ridge */}
            <path
              d="M22 26L50 16L78 26L74 29L50 20L26 29L22 26Z"
              fill="url(#topChamfer)"
            />

            {/* Center Vertical Crest Specular Glint Line */}
            <path
              d="M50 16V82"
              stroke="#FFFFFF"
              strokeWidth="1.5"
              strokeOpacity="0.75"
              strokeLinecap="round"
            />

            {/* Diagonal Prismatic Glass Sheen */}
            <path
              d="M26 30L74 65L68 70L22 36L26 30Z"
              fill="url(#glint)"
              opacity={isHovered ? 0.9 : 0.45}
            />

            {/* Sparkle Glint on Top Crest */}
            <circle
              cx="50"
              cy="16"
              r={isHovered ? 2.5 : 1.8}
              fill="#FFFFFF"
              className={isHovered ? 'animate-ping' : ''}
            />
          </svg>
        </div>
      </div>

      {/* Typography Label */}
      {showText && (
        <div className="flex flex-col">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-bold tracking-tight text-slate-900 dark:text-slate-100 font-sans">
              LedgerGuard
            </span>
            <span className="text-[10px] font-mono font-bold px-1.5 py-0.2 rounded bg-gradient-to-r from-blue-600/20 to-cyan-500/20 text-blue-700 dark:text-cyan-400 border border-blue-500/30">
              v2.0
            </span>
          </div>
          <span className="text-[10px] font-mono tracking-wide text-slate-500 dark:text-slate-400 uppercase">
            Autonomous Treasury Terminal
          </span>
        </div>
      )}
    </div>
  );
}

