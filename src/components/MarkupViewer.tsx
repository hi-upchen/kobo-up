/* eslint-disable @next/next/no-img-element */
'use client';

import React, { useState, useEffect } from 'react';

interface MarkupViewerProps {
  svgData: ArrayBuffer;
  jpgData: ArrayBuffer;
  className?: string;
}

export function MarkupViewer({ svgData, jpgData, className }: MarkupViewerProps) {
  const [jpgUrl, setJpgUrl] = useState<string | null>(null);
  const [svgUrl, setSvgUrl] = useState<string | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);

  useEffect(() => {
    const jpgBlob = new Blob([jpgData], { type: 'image/jpeg' });
    const svgBlob = new Blob([svgData], { type: 'image/svg+xml' });
    const jpgObjectUrl = URL.createObjectURL(jpgBlob);
    const svgObjectUrl = URL.createObjectURL(svgBlob);
    setJpgUrl(jpgObjectUrl);
    setSvgUrl(svgObjectUrl);

    return () => {
      URL.revokeObjectURL(jpgObjectUrl);
      URL.revokeObjectURL(svgObjectUrl);
    };
  }, [svgData, jpgData]);

  useEffect(() => {
    if (!isExpanded) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setIsExpanded(false);
    };
    document.addEventListener('keydown', handler);
    return () => document.removeEventListener('keydown', handler);
  }, [isExpanded]);

  if (!jpgUrl || !svgUrl) return null;

  return (
    <>
      {/* Thumbnail view */}
      <button
        type="button"
        onClick={() => setIsExpanded(true)}
        className={`relative cursor-pointer rounded-lg overflow-hidden border border-gray-200 dark:border-zinc-700 hover:border-indigo-400 dark:hover:border-indigo-500 transition-colors ${className || ''}`}
        style={{ maxWidth: '300px', aspectRatio: '1264 / 1680' }}
        title="Click to expand"
      >
        <img
          src={jpgUrl}
          alt="Book page"
          className="w-full h-full object-cover"
        />
        <img
          src={svgUrl}
          alt="Handwriting annotation"
          className="absolute inset-0 w-full h-full object-cover"
        />
      </button>

      {/* Expanded modal */}
      {isExpanded && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4"
          onClick={() => setIsExpanded(false)}
          role="dialog"
          aria-modal="true"
          aria-label="Expanded handwriting annotation"
        >
          <div
            className="relative max-h-[90vh] max-w-[90vw] overflow-auto rounded-lg"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              type="button"
              onClick={() => setIsExpanded(false)}
              className="absolute top-2 right-2 z-10 rounded-full bg-black/50 p-2 text-white hover:bg-black/70 transition-colors"
              aria-label="Close"
            >
              <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-5 h-5">
                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </button>
            <div className="relative" style={{ aspectRatio: '1264 / 1680' }}>
              <img
                src={jpgUrl}
                alt="Book page"
                className="w-full h-full object-contain"
              />
              <img
                src={svgUrl}
                alt="Handwriting annotation"
                className="absolute inset-0 w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
