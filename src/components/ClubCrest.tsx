import React, { useState } from 'react';
import { ClubIdentity } from '../types/football';

interface ClubCrestProps {
  club: Pick<
    ClubIdentity,
    'id' | 'name' | 'code' | 'primaryColor' | 'secondaryColor' | 'pattern' | 'logoUrl'
  >;
  size?: 'sm' | 'md' | 'lg';
}

export const ClubCrest: React.FC<ClubCrestProps> = ({ club, size = 'md' }) => {
  const [imgFailed, setImgFailed] = useState(false);
  const dimensions = size === 'sm' ? 28 : size === 'lg' ? 52 : 36;
  const clipId = `shield-${club.id}-${size}`;
  const isLightPrimary =
    club.primaryColor.toUpperCase() === '#FACC15' ||
    club.primaryColor.toUpperCase() === '#FFFFFF';
  const textColor = isLightPrimary ? '#0F172A' : '#FFFFFF';

  if (club.logoUrl && !imgFailed) {
    return (
      <img
        src={club.logoUrl}
        alt={`Écusson ${club.name}`}
        width={dimensions}
        height={dimensions}
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        style={{ width: dimensions, height: dimensions }}
        className="object-contain shrink-0"
      />
    );
  }

  return (
    <svg
      width={dimensions}
      height={dimensions}
      viewBox="0 0 40 44"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-label={`Écusson ${club.name}`}
      className="shrink-0"
    >
      <defs>
        <clipPath id={clipId}>
          <path d="M4 5.5C4 4.11929 5.11929 3 6.5 3H33.5C34.8807 3 36 4.11929 36 5.5V21.5C36 31.2 26.8 37.8 20 41C13.2 37.8 4 31.2 4 21.5V5.5Z" />
        </clipPath>
      </defs>

      <g clipPath={`url(#${clipId})`}>
        <rect x="0" y="0" width="40" height="44" fill={club.primaryColor} />
        {club.pattern === 'stripes' && (
          <>
            <rect x="8" y="0" width="6" height="44" fill={club.secondaryColor} opacity="0.92" />
            <rect x="20" y="0" width="6" height="44" fill={club.secondaryColor} opacity="0.92" />
            <rect x="32" y="0" width="6" height="44" fill={club.secondaryColor} opacity="0.92" />
          </>
        )}
        {club.pattern === 'halves' && (
          <rect x="20" y="0" width="20" height="44" fill={club.secondaryColor} opacity="0.9" />
        )}
        {club.pattern === 'sash' && (
          <polygon
            points="0,34 32,0 40,0 40,10 8,44 0,44"
            fill={club.secondaryColor}
            opacity="0.92"
          />
        )}
        <rect x="4" y="13" width="32" height="14" fill="rgba(15, 23, 42, 0.72)" />
      </g>

      <path
        d="M4 5.5C4 4.11929 5.11929 3 6.5 3H33.5C34.8807 3 36 4.11929 36 5.5V21.5C36 31.2 26.8 37.8 20 41C13.2 37.8 4 31.2 4 21.5V5.5Z"
        stroke="rgba(15, 23, 42, 0.18)"
        strokeWidth="1.5"
      />

      <text
        x="20"
        y="23"
        textAnchor="middle"
        fill={club.pattern === 'solid' ? textColor : '#FFFFFF'}
        fontSize={club.code.length > 3 ? '8.2' : '9.5'}
        fontWeight="700"
        fontFamily="Plus Jakarta Sans, sans-serif"
        letterSpacing="0.03em"
      >
        {club.code}
      </text>
    </svg>
  );
};
