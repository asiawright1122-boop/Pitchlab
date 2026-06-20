import React from 'react';

const flagMapping: Record<string, string> = {
  "Mexico": "mx",
  "South Africa": "za",
  "South Korea": "kr",
  "Czechia": "cz",
  "Canada": "ca",
  "Bosnia-Herzegovina": "ba",
  "United States": "us",
  "Paraguay": "py",
  "Qatar": "qa",
  "Switzerland": "ch",
  "Brazil": "br",
  "Morocco": "ma",
  "Haiti": "ht",
  "Scotland": "gb-sct",
  "Australia": "au",
  "Turkey": "tr",
  "Germany": "de",
  "Curaçao": "cw",
  "Netherlands": "nl",
  "Japan": "jp",
  "Ivory Coast": "ci",
  "Ecuador": "ec",
  "Sweden": "se",
  "Tunisia": "tn",
  "Spain": "es",
  "Cape Verde Islands": "cv",
  "Belgium": "be",
  "Egypt": "eg",
  "Saudi Arabia": "sa",
  "Uruguay": "uy",
  "Iran": "ir",
  "New Zealand": "nz",
  "France": "fr",
  "Senegal": "sn",
  "Iraq": "iq",
  "Norway": "no",
  "Argentina": "ar",
  "Algeria": "dz",
  "Austria": "at",
  "Jordan": "jo",
  "Portugal": "pt",
  "Congo DR": "cd",
  "England": "gb-eng",
  "Croatia": "hr",
  "Ghana": "gh",
  "Panama": "pa",
  "Uzbekistan": "uz",
  "Colombia": "co"
};

interface TeamFlagProps {
  teamName: string;
  className?: string;
}

export default function TeamFlag({ teamName, className = "w-7 h-5" }: TeamFlagProps) {
  const code = flagMapping[teamName] || flagMapping[teamName.trim()];
  const flagUrl = code ? `https://flagcdn.com/${code}.svg` : null;

  if (flagUrl) {
    return (
      <img
        src={flagUrl}
        alt={teamName}
        className={`${className} object-cover rounded shadow-sm border border-slate-200/40`}
      />
    );
  }

  // fallback to a clean gray flag placeholder if not matched
  return (
    <div className={`${className} bg-slate-100 rounded border border-slate-200 flex items-center justify-center text-[10px] text-slate-400 font-bold overflow-hidden`}>
      🏳️
    </div>
  );
}
