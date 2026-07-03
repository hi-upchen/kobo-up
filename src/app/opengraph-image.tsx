/**
 * Generates the Open Graph share image (1200x630) at request time using
 * next/og ImageResponse. Replaces a previously referenced /og-image.jpg
 * static file that never existed (social shares showed no image).
 */
import { ImageResponse } from 'next/og';

export const alt = 'Kobo Note Up - Export Kobo Highlights & Notes';
export const size = { width: 1200, height: 630 };
export const contentType = 'image/png';

export default function Image() {
  return new ImageResponse(
    (
      <div
        style={{
          width: '100%',
          height: '100%',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: '#18181b',
          color: '#fafafa',
          fontFamily: 'sans-serif',
        }}
      >
        <div style={{ fontSize: 72, fontWeight: 700, marginBottom: 24 }}>
          📚 Kobo Note Up
        </div>
        <div style={{ fontSize: 36, color: '#d4d4d8', textAlign: 'center' }}>
          Export Kobo highlights — even from sideloaded books
        </div>
        <div style={{ fontSize: 28, color: '#a1a1aa', marginTop: 32 }}>
          Free · Browser-based · Private
        </div>
      </div>
    ),
    { ...size }
  );
}
