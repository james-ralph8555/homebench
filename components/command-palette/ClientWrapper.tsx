"use client";

import dynamic from 'next/dynamic';

// Client-side dynamic import for CommandPalette
const CommandPalette = dynamic(
  () => import('./CommandPalette'),
  { ssr: false, loading: () => null }
);

export default function CommandPaletteClientWrapper() {
  return <CommandPalette />;
}