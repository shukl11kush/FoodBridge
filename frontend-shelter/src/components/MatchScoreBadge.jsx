import React, { useState } from 'react';
import { Sparkles, Info } from 'lucide-react';

export const MatchScoreBadge = ({ matchScore, breakdown }) => {
  const [showTooltip, setShowTooltip] = useState(false);
  const percentage = Math.round((matchScore || 0) * 100);

  const getScoreColor = (pct) => {
    if (pct >= 80) return 'bg-emerald-100 text-emerald-800 border-emerald-300';
    if (pct >= 60) return 'bg-amber-100 text-amber-800 border-amber-300';
    return 'bg-gray-100 text-gray-800 border-gray-300';
  };

  return (
    <div className="relative inline-block">
      <button
        onMouseEnter={() => setShowTooltip(true)}
        onMouseLeave={() => setShowTooltip(false)}
        onClick={() => setShowTooltip(!showTooltip)}
        className={`px-3 py-1 text-xs font-bold rounded-full border flex items-center space-x-1 shadow-sm transition ${getScoreColor(
          percentage
        )}`}
      >
        <Sparkles className="w-3.5 h-3.5" />
        <span>{percentage}% AI Match</span>
        <Info className="w-3 h-3 ml-0.5 opacity-70" />
      </button>

      {showTooltip && breakdown && (
        <div className="absolute right-0 bottom-full mb-2 w-64 bg-gray-900 text-white text-xs rounded-xl p-3 shadow-xl z-20 space-y-1.5 animate-in fade-in zoom-in-95">
          <div className="font-bold border-b border-gray-700 pb-1 flex justify-between">
            <span>Match Score Factors</span>
            <span className="text-amber-400">{percentage}%</span>
          </div>

          <div className="space-y-1">
            <div className="flex justify-between">
              <span className="text-gray-300">Quantity (30%):</span>
              <span>{Math.round(breakdown.quantity_score * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Time Fit (25%):</span>
              <span>{Math.round(breakdown.time_score * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Proximity (25%):</span>
              <span>{Math.round(breakdown.distance_score * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Dietary (15%):</span>
              <span>{Math.round(breakdown.dietary_score * 100)}%</span>
            </div>
            <div className="flex justify-between">
              <span className="text-gray-300">Allergen Safety (5%):</span>
              <span>{Math.round(breakdown.allergen_score * 100)}%</span>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
