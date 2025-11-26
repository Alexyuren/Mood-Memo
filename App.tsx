import React, { useState, useRef, useLayoutEffect, useEffect } from 'react';
import { Printer, Trash2, GripVertical, AlertCircle, Cat, Download } from 'lucide-react';
import { Sticker, PrintedSticker, Offset } from './types';

// Points for the sawtooth/jagged edge effect (0..1 coordinates for viewBox 0 0 1 1)
const SAWTOOTH_POINTS = "0 0.02, 0.02 0, 0.04 0.02, 0.06 0, 0.08 0.02, 0.1 0, 0.12 0.02, 0.14 0, 0.16 0.02, 0.18 0, 0.2 0.02, 0.22 0, 0.24 0.02, 0.26 0, 0.28 0.02, 0.3 0, 0.32 0.02, 0.34 0, 0.36 0.02, 0.38 0, 0.4 0.02, 0.42 0, 0.44 0.02, 0.46 0, 0.48 0.02, 0.5 0, 0.52 0.02, 0.54 0, 0.56 0.02, 0.58 0, 0.6 0.02, 0.62 0, 0.64 0.02, 0.66 0, 0.68 0.02, 0.7 0, 0.72 0.02, 0.74 0, 0.76 0.02, 0.78 0, 0.8 0.02, 0.82 0, 0.84 0.02, 0.86 0, 0.88 0.02, 0.9 0, 0.92 0.02, 0.94 0, 0.96 0.02, 0.98 0, 1 0.02, 1 0.98, 0.98 1, 0.96 0.98, 0.94 1, 0.92 0.98, 0.9 1, 0.88 0.98, 0.86 1, 0.84 0.98, 0.82 1, 0.8 0.98, 0.78 1, 0.76 0.98, 0.74 1, 0.72 0.98, 0.7 1, 0.68 0.98, 0.66 1, 0.64 0.98, 0.62 1, 0.6 0.98, 0.58 1, 0.56 0.98, 0.54 1, 0.52 0.98, 0.5 1, 0.48 0.98, 0.46 1, 0.44 0.98, 0.42 1, 0.4 0.98, 0.38 1, 0.36 0.98, 0.34 1, 0.32 0.98, 0.3 1, 0.28 0.98, 0.26 1, 0.24 0.98, 0.22 1, 0.2 0.98, 0.18 1, 0.16 0.98, 0.14 1, 0.12 0.98, 0.1 1, 0.08 0.98, 0.06 1, 0.04 0.98, 0.02 1, 0 0.98";

// Embedded CSS for complex visuals
const GlobalStyles = () => (
  <style>{`
    .font-handwriting {
      font-family: 'Caveat', 'Ma Shan Zheng', cursive;
      font-weight: 400;
    }

    .font-lcd {
      font-family: 'Press Start 2P', 'Noto Sans SC', monospace;
      text-shadow: none;
      line-height: 1.8;
      font-weight: 700;
    }

    .font-industrial {
      font-family: 'Roboto Mono', monospace;
      color: #71717a; 
      letter-spacing: 0.15em; 
      font-weight: 500;
      font-size: 0.6rem;
      text-shadow: 0 1px 0 rgba(255,255,255,0.05);
    }

    /* Original dark shadows */
    .printer-shadow {
      box-shadow: 0 30px 60px -12px rgba(0, 0, 0, 0.6), 0 10px 20px -5px rgba(0,0,0,0.4);
    }

    .thermal-text {
      color: #18181b;
      text-shadow: 0 0 1px rgba(0,0,0,0.1);
    }

    @keyframes printSlideUp {
      0% { transform: translateY(100%); }
      100% { transform: translateY(0%); }
    }
    
    .animate-print-slide {
      animation: printSlideUp 3s linear forwards;
    }

    @keyframes ledBreathe {
      0%, 100% { opacity: 0.6; box-shadow: 0 0 5px currentColor; }
      50% { opacity: 1; box-shadow: 0 0 12px currentColor, 0 0 4px currentColor inset; }
    }
    .led-breathing {
      animation: ledBreathe 1.5s infinite ease-in-out;
    }

    /* Original dark plastic texture */
    .plastic-texture {
      background-color: #27272a;
      background-image: url("data:image/svg+xml,%3Csvg width='3' height='3' viewBox='0 0 3 3' xmlns='http://www.w3.org/2000/svg'%3E%3Crect width='3' height='3' fill='%233f3f46' fill-opacity='0.05'/%3E%3C/svg%3E");
    }

    .bg-dots {
      background-color: #f9fafb; /* gray-50 */
      background-image: radial-gradient(#e5e7eb 1.5px, transparent 1.5px);
      background-size: 24px 24px; 
    }
  `}</style>
);

// Reusable Thermal Paper Component
interface ThermalPaperProps {
  color: string;
  children: React.ReactNode;
  className?: string;
  onMouseDown?: (e: React.MouseEvent) => void;
}

const ThermalPaper: React.FC<ThermalPaperProps> = ({ color, children, className = '', onMouseDown }) => {
  return (
    <div 
      className={`relative w-full h-full drop-shadow-[0_2px_3px_rgba(0,0,0,0.15)] ${className}`}
      onMouseDown={onMouseDown}
    >
      <svg 
        className="absolute inset-0 w-full h-full" 
        preserveAspectRatio="none" 
        viewBox="0 0 1 1"
      >
        <polygon points={SAWTOOTH_POINTS} fill={color} />
      </svg>
      <div className="relative z-10 w-full h-full flex flex-col items-center">
        {children}
      </div>
    </div>
  );
};

const App: React.FC = () => {
  const [text, setText] = useState<string>('');
  const [isPrinting, setIsPrinting] = useState<boolean>(false);
  const [printSource, setPrintSource] = useState<'lever' | 'button' | null>(null);
  const [stickers, setStickers] = useState<Sticker[]>([]);
  const [dragId, setDragId] = useState<number | null>(null);
  const [offset, setOffset] = useState<Offset>({ x: 0, y: 0 });

  const [printedSticker, setPrintedSticker] = useState<PrintedSticker | null>(null);
  const [calculatedHeight, setCalculatedHeight] = useState<number>(0);
  const [printingColor, setPrintingColor] = useState<string | null>(null);
  const [isConfirmingClear, setIsConfirmingClear] = useState<boolean>(false);
  
  const [showInitHint, setShowInitHint] = useState<boolean>(true);
  
  // Context Menu State
  const [contextMenu, setContextMenu] = useState<{ x: number; y: number; stickerId: number | null }>({
    x: 0,
    y: 0,
    stickerId: null,
  });

  const printerRef = useRef<HTMLDivElement>(null);
  const exitSlotRef = useRef<HTMLDivElement>(null);
  const textMeasureRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const timer = setTimeout(() => {
      setShowInitHint(false);
    }, 3000);

    return () => {
      clearTimeout(timer);
    };
  }, []);

  // Close context menu on global click
  useEffect(() => {
    const handleClick = () => {
      if (contextMenu.stickerId) {
         setContextMenu({ x: 0, y: 0, stickerId: null });
      }
    };
    window.addEventListener('click', handleClick);
    return () => window.removeEventListener('click', handleClick);
  }, [contextMenu.stickerId]);

  const getRandomReceiptColor = () => {
    const palette = [
      '#ffffff', 
      '#dbeafe', 
      '#dcfce7', 
      '#fef9c3', 
      '#fae8ff', 
      '#ffe4e6', 
      '#ffedd5', 
      '#e0f2fe', 
      '#f3f4f6', 
    ];
    return palette[Math.floor(Math.random() * palette.length)];
  };

  const getFormattedDate = () => {
    const d = new Date();
    return `${d.getFullYear()}.${(d.getMonth() + 1).toString().padStart(2, '0')}.${d.getDate().toString().padStart(2, '0')}`;
  };

  useLayoutEffect(() => {
    if (textMeasureRef.current && text) {
      const height = textMeasureRef.current.scrollHeight;
      setCalculatedHeight(Math.max(height + 100, 160));
    } else {
      setCalculatedHeight(160);
    }
  }, [text]);

  const handlePrint = (source: 'lever' | 'button') => {
    if (!text.trim() || isPrinting || printedSticker) return;

    setIsPrinting(true);
    setPrintSource(source);
    const newColor = getRandomReceiptColor();
    setPrintingColor(newColor);
    
    const currentTimestamp = getFormattedDate();

    setTimeout(() => {
      setIsPrinting(false);
      setPrintSource(null);
      
      const newSticker: PrintedSticker = {
        id: Date.now(),
        content: text,
        width: exitSlotRef.current ? exitSlotRef.current.offsetWidth * 0.92 : 180,
        height: calculatedHeight,
        color: newColor,
        timestamp: currentTimestamp,
      };
      setPrintedSticker(newSticker);
      setPrintingColor(null);
      setText(''); 
    }, 3000);
  };

  const handleMouseDown = (e: React.MouseEvent, id: number, isFromSlot: boolean = false) => {
    if (e.button === 2) return; 

    let initialX: number;
    let initialY: number;

    if (isFromSlot) {
      const sticker = printedSticker;
      if (!exitSlotRef.current || !sticker) return;

      const slotRect = exitSlotRef.current.getBoundingClientRect();
      initialX = slotRect.left + (slotRect.width - sticker.width) / 2; 
      initialY = slotRect.top - sticker.height + 6;

      const newDeskSticker: Sticker = {
        ...sticker,
        x: initialX,
        y: initialY,
        rotate: Math.random() * 3 - 1.5,
      };
      
      setStickers(prev => [...prev, newDeskSticker]);
      setPrintedSticker(null);
      setDragId(sticker.id);
      
      setOffset({
        x: e.clientX - initialX,
        y: e.clientY - initialY,
      });

    } else {
      const sticker = stickers.find((s) => s.id === id);
      if (!sticker) return;
      setDragId(id);
      initialX = sticker.x;
      initialY = sticker.y;
      
      setOffset({
        x: e.clientX - initialX,
        y: e.clientY - initialY,
      });
    }
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (dragId) {
      setStickers((prev) =>
        prev.map((s) =>
          s.id === dragId
            ? { ...s, x: e.clientX - offset.x, y: e.clientY - offset.y }
            : s
        )
      );
    }
  };

  const handleMouseUp = () => {
    setDragId(null);
  };

  const deleteSticker = (id: number) => {
    setStickers((prev) => prev.filter((s) => s.id !== id));
  };

  const handleClearClick = () => {
    if (isConfirmingClear) {
      setStickers([]);
      setPrintedSticker(null);
      setIsConfirmingClear(false);
    } else {
      setIsConfirmingClear(true);
      setTimeout(() => {
        setIsConfirmingClear(false);
      }, 3000);
    }
  };

  const handleContextMenu = (e: React.MouseEvent, stickerId: number) => {
    e.preventDefault();
    setContextMenu({
      x: e.clientX,
      y: e.clientY,
      stickerId: stickerId,
    });
  };

  const handleDownloadImage = (stickerId: number) => {
    if (window.html2canvas) {
      const element = document.getElementById(`sticker-${stickerId}`);
      if (element) {
        window.html2canvas(element, {
          backgroundColor: null,
          scale: 3, // Higher resolution
          logging: false,
          useCORS: true,
          allowTaint: true,
          onclone: (clonedDoc: Document) => {
            const clonedElement = clonedDoc.getElementById(`sticker-${stickerId}`);
            if (clonedElement) {
              clonedElement.style.transform = 'none';
            }
          }
        }).then((canvas: HTMLCanvasElement) => {
          const link = document.createElement('a');
          const sticker = stickers.find(s => s.id === stickerId);
          const dateStr = sticker ? sticker.timestamp.replace(/\./g, '-') : 'note';
          link.download = `mood-memo-${dateStr}-${stickerId}.png`;
          link.href = canvas.toDataURL('image/png');
          link.click();
        }).catch((err: Error) => {
          console.error("Save failed:", err);
        });
      }
    } else {
      alert("Image saver loading... please try again in a second.");
    }
  };

  const isButtonVisible = stickers.length > 0 || printedSticker !== null || showInitHint;

  let lcdText = text;
  let lcdPlaceholder = "Say Something...";
  
  if (isPrinting) {
    if (printSource === 'lever') {
      lcdText = "CHANGING PAPER...";
    } else {
      lcdText = "Printing Mood...";
    }
  } else if (printedSticker) {
    lcdText = "Take Memo";
  }

  return (
    <div 
      className="min-h-screen bg-dots overflow-hidden relative selection:bg-purple-200"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
      onMouseLeave={handleMouseUp}
    >
      <GlobalStyles />

      {/* Header */}
      <div className="absolute top-10 left-0 right-0 text-center pointer-events-none z-0">
        <h1 className="text-2xl font-bold text-[#605b6e] tracking-[0.4em] uppercase font-lcd">MOOD MEMO</h1>
        <div className="w-16 h-1 bg-[#605b6e]/40 mx-auto mt-4 rounded-full"></div>
      </div>

      {/* Clear Button */}
      <button
        onClick={handleClearClick}
        disabled={!isButtonVisible}
        className={`
          absolute top-8 right-8 z-[100] flex items-center gap-2 px-4 py-2 rounded-full 
          border backdrop-blur-sm shadow-sm transition-all duration-500
          ${!isButtonVisible
            ? 'opacity-0 pointer-events-none translate-y-[-10px]'
            : isConfirmingClear 
              ? 'opacity-100 bg-red-500 border-red-600 text-white shadow-red-200 hover:bg-red-600 cursor-pointer'
              : 'opacity-100 bg-white/60 border-gray-300 text-slate-500 hover:bg-red-50 hover:text-red-500 hover:border-red-200 cursor-pointer'}
        `}
        title="Clear all notes"
      >
        {isConfirmingClear ? <AlertCircle size={14} /> : <Trash2 size={14} />}
        <span className="font-industrial text-[10px] font-bold tracking-widest text-inherit">
          {isConfirmingClear ? "CONFIRM?" : "CLEAR DESK"}
        </span>
      </button>

      {/* Custom Context Menu */}
      {contextMenu.stickerId && (
        <div 
          className="fixed z-[100] bg-white/90 backdrop-blur-md border border-zinc-200 shadow-xl rounded-lg py-1.5 min-w-[140px] animate-in fade-in zoom-in-95 duration-100 origin-top-left"
          style={{ top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()} 
        >
          <button 
            onClick={() => {
              handleDownloadImage(contextMenu.stickerId!);
              setContextMenu({ x: 0, y: 0, stickerId: null });
            }}
            className="w-full text-left px-4 py-2 text-xs font-medium text-zinc-700 hover:bg-zinc-100 flex items-center gap-2 transition-colors"
          >
             <Download size={14} />
             Save Image
          </button>
          <div className="h-px bg-zinc-100 my-1"></div>
           <button 
            onClick={() => {
              deleteSticker(contextMenu.stickerId!);
              setContextMenu({ x: 0, y: 0, stickerId: null });
            }}
            className="w-full text-left px-4 py-2 text-xs font-medium text-red-500 hover:bg-red-50 flex items-center gap-2 transition-colors"
          >
             <Trash2 size={14} />
             Delete
          </button>
        </div>
      )}

      <div 
          ref={textMeasureRef} 
          className="absolute top-0 left-0 invisible font-handwriting text-2xl leading-normal p-6 pointer-events-none break-words text-center"
          style={{ width: exitSlotRef.current ? exitSlotRef.current.offsetWidth * 0.92 : 180 }}
      >
          {text}
      </div>

      {/* Main Printer */}
      <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 z-30 flex flex-col items-center">
        
        <div 
          ref={printerRef}
          className={`
            relative w-[22rem] h-[34rem] rounded-[3rem] printer-shadow
            bg-zinc-800
            border-[8px] border-zinc-700/50
            flex flex-col
            overflow-visible
          `}
        >
          {/* Highlight overlay */}
          <div className="absolute inset-0 rounded-[2.5rem] bg-gradient-to-br from-white/20 to-transparent pointer-events-none z-10"></div>
          
          {/* Top Lid - Dark Plastic */}
          <div className="h-[38%] w-full relative border-b-4 border-black/20 rounded-t-[2.5rem] plastic-texture overflow-hidden z-0">
             <div className="absolute top-0 left-0 right-0 h-20 bg-gradient-to-b from-white/5 to-transparent"></div>
             <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 opacity-50">
                <div className="flex items-center justify-center gap-1 text-zinc-500">
                  <Cat size={20} strokeWidth={2.5} />
                  <Cat size={20} strokeWidth={2.5} />
                </div>
                <span className="text-zinc-500 text-[10px] font-bold tracking-[0.2em]">MOOD MEMO</span>
             </div>
          </div>

          {/* Side Lever */}
          <div 
            className="absolute -left-6 top-[9.75rem] w-8 h-20 bg-zinc-300 rounded-l-lg border-r border-zinc-400 shadow-[inset_-2px_0_5px_rgba(0,0,0,0.1),-5px_5px_10px_rgba(0,0,0,0.2)] cursor-pointer active:translate-y-2 transition-transform z-30 flex flex-col justify-center group"
            onClick={() => handlePrint('lever')} 
            title="Pull to Print"
          >
            <div className="w-1.5 h-12 bg-zinc-400 mx-auto rounded-full group-hover:bg-green-400 transition-colors"></div>
          </div>

          {/* Lower Body */}
          <div className="flex-1 flex flex-col items-center px-8 pt-0 pb-12 relative bg-zinc-800 rounded-b-[2.5rem] z-20">
            
            {/* Paper Exit Slot */}
            <div className="w-full relative mb-8">
               <div 
                 ref={exitSlotRef}
                 className="relative w-full h-1.5 bg-black rounded-full shadow-[0_1px_1px_rgba(255,255,255,0.1)] mx-auto z-20"
               >
                  <div className="absolute bottom-[5px] left-1/2 -translate-x-1/2 w-[92%] z-10 pointer-events-none"
                       style={{ 
                         height: (printedSticker ? printedSticker.height : calculatedHeight) + 'px',
                         clipPath: 'inset(-200% -50% 0 -50%)' 
                       }}
                  >
                      {isPrinting && (
                        <ThermalPaper 
                          color={printingColor || '#fff'} 
                          className="animate-print-slide"
                        >
                            <div className="w-full flex justify-center gap-1 pt-4 opacity-40 text-zinc-600">
                               <Cat size={18} strokeWidth={2.5} /> <Cat size={18} strokeWidth={2.5} />
                            </div>
                            <div className="w-full p-6 pt-2 pb-8 text-center break-words whitespace-pre-wrap font-handwriting thermal-text text-2xl leading-normal opacity-90 flex-1 flex items-center justify-center">
                              {text}
                            </div>
                            <div className="absolute bottom-2 right-3 font-industrial text-[0.6rem] text-zinc-400/80">
                                {getFormattedDate()}
                            </div>
                        </ThermalPaper>
                      )}

                      {printedSticker && !isPrinting && (
                        <ThermalPaper
                          color={printedSticker.color}
                          className="cursor-grab group pointer-events-auto hover:-translate-y-1 transition-transform duration-300"
                          onMouseDown={(e) => handleMouseDown(e, printedSticker.id, true)}
                        >
                            <div className="w-full flex justify-center gap-1 pt-4 opacity-40 text-zinc-600">
                               <Cat size={18} strokeWidth={2.5} /> <Cat size={18} strokeWidth={2.5} />
                            </div>
                            <div className="w-full p-6 pt-2 text-center break-words whitespace-pre-wrap font-handwriting thermal-text text-2xl leading-normal flex-1 flex items-center justify-center">
                              {printedSticker.content}
                            </div>
                            <div className="absolute bottom-2 right-3 font-industrial text-[0.6rem] text-zinc-400/80">
                                {printedSticker.timestamp}
                            </div>
                            <div className="absolute bottom-3 opacity-20 group-hover:opacity-50 transition-opacity">
                                <GripVertical size={14} className="text-zinc-800 rotate-90" />
                            </div>
                        </ThermalPaper>
                      )}
                  </div>
               </div>
               <div className="h-4 w-[90%] mx-auto bg-gradient-to-b from-black/30 to-transparent rounded-b-xl pointer-events-none"></div>
            </div>

            {/* Screen Area - Dark Industrial */}
            <div className="w-full bg-[#0a120a] rounded-xl border-4 border-zinc-700 shadow-[inset_0_0_20px_rgba(0,0,0,1)] relative overflow-hidden mb-8 h-32 shrink-0 z-20">
              <div className="absolute inset-0 bg-[url('https://www.transparenttextures.com/patterns/pixel-weave.png')] opacity-20 pointer-events-none"></div>
              
              <textarea
                value={lcdText}
                onChange={(e) => setText(e.target.value)}
                placeholder={lcdPlaceholder}
                disabled={isPrinting || printedSticker !== null}
                className={`
                  w-full h-full bg-transparent font-lcd p-6 text-[12px] text-center resize-none 
                  focus:outline-none placeholder-green-900/60 tracking-widest text-[#4ade80]
                  ${printedSticker ? 'opacity-40 cursor-not-allowed' : 'opacity-100'}
                  ${isPrinting ? 'animate-pulse' : ''}
                `}
                maxLength={150}
              />
            </div>

            {/* Controls */}
            <div className="flex items-center justify-between w-full mt-auto relative z-20 px-2">
               {/* LED Status (Left) */}
               <div className="flex flex-col items-center gap-2">
                 <div className="relative">
                    <div className={`absolute inset-0 rounded-full blur-md transition-colors duration-500 ${isPrinting ? 'bg-orange-500/50' : 'bg-green-500/50'}`}></div>
                    <div 
                      className={`
                        relative w-4 h-4 rounded-full transition-all duration-300 border border-black/20
                        ${isPrinting 
                            ? 'bg-orange-500 led-breathing shadow-[0_0_8px_#f97316]' 
                            : 'bg-[#22c55e] shadow-[0_0_5px_#22c55e]'}
                      `}
                    ></div>
                 </div>
                 <span className="font-industrial uppercase tracking-widest text-zinc-500 text-[0.6rem]">READY</span>
               </div>

               {/* Print Button (Right) - Dark Industrial */}
               <button 
                  onClick={() => handlePrint('button')}
                  disabled={isPrinting || printedSticker !== null}
                  className={`
                    group relative w-16 h-16 rounded-full flex items-center justify-center transition-all active:scale-95
                    shadow-[0_10px_25px_-5px_rgba(0,0,0,0.5),inset_0_2px_5px_rgba(255,255,255,0.1)]
                    ${isPrinting || printedSticker 
                      ? 'bg-zinc-700 text-zinc-600 cursor-not-allowed' 
                      : 'bg-gradient-to-br from-zinc-600 to-zinc-800 text-zinc-200 hover:text-white border-t border-zinc-500'}
                  `}
               >
                  <Printer size={28} strokeWidth={2} className="drop-shadow-lg" />
               </button>
            </div>

          </div>
        </div>
      </div>

      {/* Draggable Stickers Layer */}
      <div className="absolute inset-0 z-50 pointer-events-none">
        {stickers.map((sticker) => (
          <div
            key={sticker.id}
            style={{
              transform: `translate(${sticker.x}px, ${sticker.y}px) rotate(${sticker.rotate}deg)`,
              width: sticker.width + 'px',
              height: sticker.height + 'px',
              cursor: dragId === sticker.id ? 'grabbing' : 'grab',
            }}
            className="absolute pointer-events-auto group transition-transform"
            onMouseDown={(e) => handleMouseDown(e, sticker.id, false)}
            onContextMenu={(e) => handleContextMenu(e, sticker.id)}
          >
            <button
              onClick={(e) => {
                e.stopPropagation();
                deleteSticker(sticker.id);
              }}
              className="absolute -top-3 -right-3 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-all shadow-sm hover:bg-red-600 scale-75 hover:scale-90 z-50 cursor-pointer"
              title="Delete"
            >
              <Trash2 size={14} />
            </button>

            <div id={`sticker-${sticker.id}`} className="h-full w-full">
              <div className="hover:shadow-xl transition-all duration-200 h-full w-full">
                <ThermalPaper color={sticker.color}>
                  <div className="w-full flex justify-center gap-1 pt-4 opacity-40 text-zinc-600">
                      <Cat size={18} strokeWidth={2.5} /> <Cat size={18} strokeWidth={2.5} />
                  </div>
                  <div className="h-full w-full flex-1 flex items-center justify-center p-6 pt-2">
                    <div className="font-handwriting thermal-text text-2xl leading-normal text-center break-words w-full whitespace-pre-wrap">
                      {sticker.content}
                    </div>
                  </div>
                  <div className="absolute bottom-2 right-3 font-industrial text-[0.6rem] text-zinc-400/80">
                      {sticker.timestamp}
                  </div>
                </ThermalPaper>
              </div>
            </div>
          </div>
        ))}
      </div>
      
      <div className="absolute bottom-4 w-full text-center pointer-events-none opacity-30 text-[9px] text-purple-900/40 font-lcd tracking-widest">
        THERMAL RECEIPT SIMULATION // INSERT COIN
      </div>

    </div>
  );
};

export default App;