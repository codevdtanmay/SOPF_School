import React from 'react';

interface SchoolLogoProps {
  className?: string;
  size?: number;
}

export const SchoolLogo: React.FC<SchoolLogoProps> = ({ className = '', size = 48 }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 200 220"
      className={`${className}`}
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      {/* Outer Circle Ring */}
      <circle cx="100" cy="110" r="85" fill="#1e293b" /> {/* Slate 800 - Navy/Slate-like Dark Blue */}
      <circle cx="100" cy="110" r="80" fill="white" stroke="#1e293b" strokeWidth="2.5" />
      <circle cx="100" cy="110" r="62" fill="none" stroke="#1e293b" strokeWidth="1" strokeDasharray="3,3" />
      <circle cx="100" cy="110" r="60" fill="white" stroke="#1e293b" strokeWidth="2" />

      {/* Curved Text Path for "THE SCHOOL OF PANSY FLOWERS" */}
      <defs>
        <path
          id="textRingPath"
          d="M 24 110 A 76 76 0 0 1 176 110"
          fill="none"
        />
        <path
          id="textRingPathBottom"
          d="M 172 110 A 72 72 0 0 1 28 110"
          fill="none"
        />
      </defs>

      {/* Top curving text */}
      <text fill="#0f172a" fontSize="10.8" fontWeight="800" fontFamily="Georgia, serif" letterSpacing="1">
        <textPath href="#textRingPath" startOffset="50%" textAnchor="middle">
          THE SCHOOL OF PANSY FLOWERS
        </textPath>
      </text>

      {/* Grain / Wreaths Left and Right */}
      {/* Left wreath representation */}
      <g stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round">
        <path d="M 68 85 C 62 95, 62 125, 70 135" fill="none" strokeWidth="1" />
        <path d="M 68 85 L 62 82" />
        <path d="M 66 92 L 59 90" />
        <path d="M 64 100 L 58 98" />
        <path d="M 63 108 L 56 107" />
        <path d="M 64 116 L 57 116" />
        <path d="M 66 124 L 60 125" />
        <path d="M 70 132 L 64 135" />
      </g>
      
      {/* Right wreath representation */}
      <g stroke="#1e293b" strokeWidth="1.5" strokeLinecap="round">
        <path d="M 132 85 C 138 95, 138 125, 130 135" fill="none" strokeWidth="1" />
        <path d="M 132 85 L 138 82" />
        <path d="M 134 92 L 141 90" />
        <path d="M 136 100 L 142 98" />
        <path d="M 137 108 L 144 107" />
        <path d="M 136 116 L 143 116" />
        <path d="M 134 124 L 140 125" />
        <path d="M 130 132 L 136 135" />
      </g>

      {/* Sanskrit slogan arch "ज्ञानं परमं ध्येयम्" */}
      <path id="sanskritPath" d="M 75 72 Q 100 60 125 72" fill="none" />
      <text fill="#b91c1c" fontSize="7" fontWeight="bold" fontFamily="sans-serif">
        <textPath href="#sanskritPath" startOffset="50%" textAnchor="middle">
          ज्ञानं परमं ध्येयम्
        </textPath>
      </text>

      {/* Central Shield */}
      <g transform="translate(72, 75)">
        {/* Shield Border */}
        <path
          d="M 2 0 L 54 0 C 54 0, 56 18, 54 30 C 52 44, 28 54, 28 54 C 28 54, 4 44, 2 30 C 0 18, 2 L 2 0 Z"
          fill="none"
          stroke="#1e293b"
          strokeWidth="2"
        />
        {/* Inner Shield fill backdrop */}
        <path
          d="M 4 2 L 52 2 C 52 2, 54 18, 52 28 C 50 41, 28 50, 28 50 C 28 50, 6 41, 4 28 C 3 18, 4 H 4 Z"
          fill="#f8fafc"
        />

        {/* Inner Symbol: Stylized red/brown person with outstretched arms held by hands */}
        {/* Central head */}
        <circle cx="28" cy="16" r="3.5" fill="#991b1b" />
        {/* Torso/arms element */}
        <path
          d="M 16 23 C 18 20, 21 19, 28 19 C 35 19, 38 20, 40 23 C 38 25, 34 26, 28 26 C 22 26, 18 25, 16 23 Z"
          fill="#b91c1c"
        />
        <path
          d="M 14 26 C 18 24, 23 22, 28 26 C 33 22, 38 24, 42 26 C 39 31, 34 35, 28 35 C 22 35, 17 31, 14 26 Z"
          fill="#b91c1c"
        />
        
        {/* Supporting Hands (Blue) */}
        <path
          d="M 11 20 C 10 28, 14 42, 28 46 C 24 38, 20 30, 21 21 M 45 20 C 46 28, 42 42, 28 46 C 32 38, 36 30, 35 21"
          stroke="#1e3a8a"
          strokeWidth="2.5"
          strokeLinecap="round"
          fill="none"
        />
      </g>

      {/* "SINCE - 2011" text at bottom */}
      <text x="100" y="148" fill="#b91c1c" fontSize="7" fontWeight="bold" textAnchor="middle" letterSpacing="0.5">
        SINCE - 2011
      </text>

      {/* Bottom Ribbon Banner "CHANGOTOLA" */}
      <g>
        {/* Ribbon back folds left/right */}
        <path d="M 40 178 L 22 178 L 30 168 L 40 168 Z" fill="#0f172a" />
        <path d="M 160 178 L 178 178 L 170 168 L 160 168 Z" fill="#0f172a" />
        
        {/* Ribbon Main Body */}
        <rect x="34" y="158" width="132" height="18" fill="#1e293b" rx="2" stroke="#0f172a" strokeWidth="1" />
        
        {/* Banner text: CHANGOTOLA */}
        <text x="100" y="171" fill="white" fontSize="10" fontWeight="950" fontFamily="sans-serif" textAnchor="middle" letterSpacing="2">
          CHANGOTOLA
        </text>
      </g>
    </svg>
  );
};

export default SchoolLogo;
