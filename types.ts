export interface Sticker {
  id: number;
  content: string;
  width: number;
  height: number;
  color: string;
  x: number;
  y: number;
  rotate: number;
  timestamp: string;
}

export interface PrintedSticker {
  id: number;
  content: string;
  width: number;
  height: number;
  color: string;
  timestamp: string;
}

export interface Offset {
  x: number;
  y: number;
}

// Extend Window interface for html2canvas
declare global {
  interface Window {
    html2canvas: any;
  }
}