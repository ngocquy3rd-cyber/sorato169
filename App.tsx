import React, { useState, useRef, useEffect, useLayoutEffect, useCallback } from 'react';
import { geminiService } from './services/geminiService';

const FONTS = [
  { name: 'Tin Tức 1 (Montserrat)', family: 'Montserrat' },
  { name: 'Phá Cách (Bangers)', family: 'Bangers' },
  { name: 'Chuẩn Header (Bebas)', family: 'Bebas Neue' },
  { name: 'Gọn Gàng (Roboto)', family: 'Roboto Condensed' },
  { name: 'Hiện Đại (Space)', family: 'Space Grotesk' },
  { name: 'Phổ Thông (Inter)', family: 'Inter' },
];

const TEXT_STYLES = [
  { id: 'style1', name: 'VÀNG ĐẸP - ĐEN', fill: '#FFD700', stroke: '#000000' },
  { id: 'style2', name: 'TRẮNG - ĐEN', fill: '#ffffff', stroke: '#000000' },
];

const LINE_HEIGHT = 1.1; 
const COLOR_VIBRANT_RED = '#ff0000'; 
const COLOR_ROTATE_HANDLE = '#3b82f6'; 
const CANVAS_WIDTH = 1280;
const CANVAS_HEIGHT = 720;
const FIXED_Y = 720; 
const PADDING_X = 20; 

const App: React.FC = () => {
  const [processedUrl, setProcessedUrl] = useState<string | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [imgDims, setImgDims] = useState<{ w: number; h: number } | null>(null);

  const [showCircle, setShowCircle] = useState(false);
  const [circlePos, setCirclePos] = useState({ x: 540, y: 260 });
  const [circleSize, setCircleSize] = useState(250); 

  const [showArrow, setShowArrow] = useState(false);
  const [arrowPos, setArrowPos] = useState({ x: 800, y: 400 });
  const [arrowScale, setArrowScale] = useState(1.2);

  const [focusImgUrl, setFocusImgUrl] = useState<string | null>(null);
  const [focusPos, setFocusPos] = useState({ x: 400, y: 200 });
  const [focusSize, setFocusSize] = useState(300); 
  const focusInputRef = useRef<HTMLInputElement>(null);

  const [zoom, setZoom] = useState(1.0); 
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [brightness, setBrightness] = useState(1);
  const [text, setText] = useState(''); 
  const [font, setFont] = useState(FONTS[0].family); 
  const [textSize, setTextSize] = useState(135); 
  const [textAlign, setTextAlign] = useState<'left' | 'center' | 'right'>('center');
  const [textRotation, setTextRotation] = useState(0); 
  const [activeStyle, setActiveStyle] = useState(TEXT_STYLES[1]); 
  
  const [textPos, setTextPos] = useState({ x: CANVAS_WIDTH / 2, y: FIXED_Y });
  const [outlineWidth, setOutlineWidth] = useState(11); 
  const [shadowBlur, setShadowBlur] = useState(15);    

  const containerRef = useRef<HTMLDivElement>(null);
  const [canvasScale, setCanvasScale] = useState(0.5); 

  const isDraggingText = useRef(false);
  const isRotatingText = useRef(false);
  const isDraggingImg = useRef(false);
  const isDraggingCircle = useRef(false);
  const isDraggingFocus = useRef(false);
  const isDraggingArrow = useRef(false);
  const startPos = useRef({ x: 0, y: 0 });

  // Hàm tính toán giới hạn kéo để không lộ nền đen
  const getClampedOffset = useCallback((x: number, y: number, z: number) => {
    const maxX = (CANVAS_WIDTH * (z - 1)) / 2;
    const maxY = (CANVAS_HEIGHT * (z - 1)) / 2;
    return {
      x: Math.max(-maxX, Math.min(maxX, x)),
      y: Math.max(-maxY, Math.min(maxY, y))
    };
  }, []);

  // Khi zoom thay đổi, tự động đẩy ảnh vào trong nếu bị lòi nền đen
  useEffect(() => {
    setOffset(prev => getClampedOffset(prev.x, prev.y, zoom));
  }, [zoom, getClampedOffset]);

  const updateScale = useCallback(() => {
    if (containerRef.current) {
      const width = containerRef.current.offsetWidth;
      if (width > 0) {
        setCanvasScale(width / CANVAS_WIDTH);
      }
    }
  }, []);

  useLayoutEffect(() => {
    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [updateScale]);

  const handleError = async (err: any) => {
    console.error("App Error Handler:", err);
    const errMsg = err.message || "";
    
    if (errMsg.includes("Requested entity was not found") || errMsg.includes("API key not valid") || errMsg.includes("403") || errMsg.includes("404")) {
      setError("Lỗi API Key hoặc Model. AI sẽ yêu cầu chọn lại Key có trả phí.");
      if (window.aistudio?.openSelectKey) {
        await window.aistudio.openSelectKey();
      }
    } else if (errMsg.includes("Safety")) {
      setError("Ảnh hoặc nội dung bị AI từ chối vì lý do an toàn.");
    } else {
      setError("Lỗi kết nối AI. Vui lòng thử lại sau giây lát.");
    }
  };

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setError(null);
    setProcessedUrl(null);
    setIsProcessing(true);

    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = async () => {
      const base64 = (reader.result as string).split(',')[1];
      try {
        const result = await geminiService.standardizeImage(base64, file.type);
        setProcessedUrl(result);
        const tempImg = new Image();
        tempImg.src = result;
        tempImg.onload = () => {
          setImgDims({ w: tempImg.width, h: tempImg.height });
          updateScale();
          setZoom(1.0);
          setOffset({ x: 0, y: 0 });
        };
      } catch (err: any) {
        await handleError(err);
      } finally {
        setIsProcessing(false);
      }
    };
  };

  const handleFocusFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      setFocusImgUrl(reader.result as string);
    };
  };

  const toggleFocus = () => {
    if (focusImgUrl) {
      setFocusImgUrl(null);
    } else {
      focusInputRef.current?.click();
    }
  };

  const handleTranslate = async () => {
    if (!text.trim() || isTranslating) return;
    setIsTranslating(true);
    setError(null);
    try {
      const translated = await geminiService.translateTitle(text);
      setText(translated.toUpperCase());
    } catch (err) {
      await handleError(err);
    } finally {
      setIsTranslating(false);
    }
  };

  const handleAlignChange = (align: 'left' | 'center' | 'right') => {
    setTextAlign(align);
    let newX = CANVAS_WIDTH / 2;
    if (align === 'left') newX = PADDING_X;
    else if (align === 'right') newX = CANVAS_WIDTH - PADDING_X;
    
    setTextPos({ x: newX, y: FIXED_Y });
  };

  const handleMouseDown = (e: React.MouseEvent, type: 'text' | 'img' | 'circle' | 'focus' | 'rotate' | 'arrow') => {
    if (type === 'text') isDraggingText.current = true;
    else if (type === 'rotate') isRotatingText.current = true;
    else if (type === 'img') isDraggingImg.current = true;
    else if (type === 'circle') isDraggingCircle.current = true;
    else if (type === 'focus') isDraggingFocus.current = true;
    else if (type === 'arrow') isDraggingArrow.current = true;
    startPos.current = { x: e.clientX, y: e.clientY };
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDraggingText.current && !isRotatingText.current && !isDraggingImg.current && !isDraggingCircle.current && !isDraggingFocus.current && !isDraggingArrow.current) return;
    
    if (isRotatingText.current) {
        const workspace = document.querySelector('.canvas-workspace-inner');
        if (workspace) {
            const rect = workspace.getBoundingClientRect();
            const centerX = rect.left + (textPos.x * canvasScale);
            const centerY = rect.top + (textPos.y * canvasScale); 
            const angle = Math.atan2(e.clientY - centerY, e.clientX - centerX);
            setTextRotation((angle * 180 / Math.PI) + 90);
        }
        return;
    }

    const dx = (e.clientX - startPos.current.x) / canvasScale;
    const dy = (e.clientY - startPos.current.y) / canvasScale;
    
    if (isDraggingText.current) {
      setTextPos(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    } else if (isDraggingImg.current) {
      setOffset(prev => getClampedOffset(prev.x + dx, prev.y + dy, zoom));
    } else if (isDraggingCircle.current) {
      setCirclePos(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    } else if (isDraggingFocus.current) {
      setFocusPos(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    } else if (isDraggingArrow.current) {
      setArrowPos(prev => ({ x: prev.x + dx, y: prev.y + dy }));
    }
    startPos.current = { x: e.clientX, y: e.clientY };
  };

  const getArrowAngle = () => {
    let targetX = circlePos.x + circleSize / 2;
    let targetY = circlePos.y + circleSize / 2;
    if (focusImgUrl) {
      targetX = focusPos.x + focusSize / 2;
      targetY = focusPos.y + focusSize / 2;
    }
    return (Math.atan2(targetY - arrowPos.y, targetX - arrowPos.x) * 180 / Math.PI) + 90;
  };

  const exportFinal = async () => {
    if (!processedUrl) return;
    const btn = document.getElementById('export-btn');
    if (btn) btn.innerText = "ĐANG KẾT XUẤT...";
    try {
      await document.fonts.ready;
      const canvas = document.createElement('canvas');
      canvas.width = CANVAS_WIDTH;
      canvas.height = CANVAS_HEIGHT;
      const ctx = canvas.getContext('2d');
      if (!ctx) return;

      const img = new Image();
      img.crossOrigin = "anonymous";
      img.src = processedUrl;
      await new Promise((resolve) => { img.onload = resolve; });

      ctx.fillStyle = "black";
      ctx.fillRect(0, 0, CANVAS_WIDTH, CANVAS_HEIGHT);

      ctx.save();
      ctx.filter = `brightness(${brightness})`;
      ctx.translate(CANVAS_WIDTH/2 + offset.x, CANVAS_HEIGHT/2 + offset.y);
      ctx.scale(zoom, zoom);
      ctx.drawImage(img, -CANVAS_WIDTH/2, -CANVAS_HEIGHT/2, CANVAS_WIDTH, CANVAS_HEIGHT);
      ctx.restore();

      if (focusImgUrl) {
        const fImg = new Image();
        fImg.src = focusImgUrl;
        await new Promise((res) => { fImg.onload = res; });
        const cx = focusPos.x + focusSize/2;
        const cy = focusPos.y + focusSize/2;
        ctx.save();
        ctx.shadowBlur = 50; ctx.shadowColor = COLOR_VIBRANT_RED;
        ctx.beginPath(); ctx.arc(cx, cy, focusSize/2, 0, Math.PI*2); ctx.clip();
        ctx.drawImage(fImg, focusPos.x, focusPos.y, focusSize, focusSize);
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = COLOR_VIBRANT_RED; ctx.lineWidth = 14; 
        ctx.shadowBlur = 50; ctx.shadowColor = COLOR_VIBRANT_RED;
        ctx.stroke();
        ctx.restore();
      }

      if (showCircle) {
        const cx = circlePos.x + circleSize/2;
        const cy = circlePos.y + circleSize/2;
        ctx.save();
        ctx.beginPath(); ctx.arc(cx, cy, circleSize/2, 0, Math.PI*2); ctx.clip();
        ctx.filter = `brightness(${brightness * 1.4})`;
        ctx.translate(CANVAS_WIDTH/2 + offset.x, CANVAS_HEIGHT/2 + offset.y);
        ctx.scale(zoom, zoom);
        ctx.drawImage(img, -CANVAS_WIDTH/2, -CANVAS_HEIGHT/2, CANVAS_WIDTH, CANVAS_HEIGHT);
        ctx.restore();
        ctx.save();
        ctx.strokeStyle = COLOR_VIBRANT_RED; ctx.lineWidth = 14; 
        ctx.shadowBlur = 50; ctx.shadowColor = COLOR_VIBRANT_RED;
        ctx.stroke();
        ctx.restore();
      }

      if (showArrow) {
        ctx.save();
        ctx.translate(arrowPos.x, arrowPos.y);
        ctx.rotate(getArrowAngle() * Math.PI / 180);
        ctx.scale(arrowScale, arrowScale);
        ctx.shadowBlur = 40; ctx.shadowColor = COLOR_VIBRANT_RED;
        ctx.fillStyle = COLOR_VIBRANT_RED;
        ctx.strokeStyle = "white";
        ctx.lineWidth = 4;
        ctx.beginPath();
        ctx.moveTo(0, -60); ctx.lineTo(30, 0); ctx.lineTo(12, 0); ctx.lineTo(12, 60); ctx.lineTo(-12, 60); ctx.lineTo(-12, 0); ctx.lineTo(-30, 0);
        ctx.closePath();
        ctx.fill(); ctx.stroke();
        ctx.restore();
      }

      if (text.trim()) {
        ctx.save();
        ctx.translate(textPos.x, textPos.y);
        ctx.rotate(textRotation * Math.PI / 180);
        ctx.font = `900 ${textSize}px "${font}"`;
        ctx.textAlign = textAlign;
        ctx.textBaseline = 'bottom'; 
        
        const lines = text.toUpperCase().split('\n');
        lines.reverse().forEach((line, idx) => { 
          const y = -(idx * (textSize * LINE_HEIGHT));
          ctx.shadowBlur = shadowBlur; ctx.shadowColor = "rgba(0,0,0,0.8)";
          ctx.strokeStyle = activeStyle.stroke;
          ctx.lineWidth = outlineWidth * 2.2;
          ctx.lineJoin = "round";
          ctx.strokeText(line, 0, y);
          ctx.shadowColor = "transparent";
          ctx.fillStyle = activeStyle.fill;
          ctx.fillText(line, 0, y);
        });
        ctx.restore();
      }

      const link = document.createElement('a');
      link.href = canvas.toDataURL("image/png", 1.0);
      link.download = `THUMB_PRO_${Date.now()}.png`;
      link.click();
    } catch (err) {
      await handleError(err);
    } finally {
      if (btn) btn.innerText = "TẠO ẢNH CHUẨN 16:9";
    }
  };

  const getPreviewTextTransform = () => {
    let xOff = '-50%';
    if (textAlign === 'left') xOff = '0%';
    if (textAlign === 'right') xOff = '-100%';
    return `translate(${xOff}, -100%) rotate(${textRotation}deg)`; 
  };

  return (
    <div className="min-h-screen bg-[#09090b] text-zinc-100 flex flex-col items-center p-4 md:p-8 select-none" 
      onMouseUp={() => (isDraggingText.current = isRotatingText.current = isDraggingImg.current = isDraggingCircle.current = isDraggingFocus.current = isDraggingArrow.current = false)}
      onMouseMove={handleMouseMove}
    >
      <header className="w-full max-w-6xl flex justify-between items-start mb-8">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 bg-indigo-600 flex items-center justify-center font-black shadow-lg shadow-indigo-500/30 text-white">V2</div>
          <h1 className="text-xl font-black tracking-tighter uppercase italic">SORA TO THUMBNAIL <span className="text-indigo-500 underline decoration-4 underline-offset-8">VER 2</span></h1>
        </div>
        <div className="flex flex-col items-end text-right">
          <div className="text-[12px] font-black uppercase tracking-widest text-zinc-100">NGUYỄN THÀNH NHÂN</div>
          <div className="text-[10px] font-bold text-zinc-500 tracking-wider italic">Liên hệ: 0979997077</div>
          {error && <div className="mt-2 bg-red-500/10 border border-red-500/20 px-4 py-1.5 rounded-lg text-red-500 text-[10px] font-black uppercase tracking-widest max-w-[200px] leading-relaxed">{error}</div>}
        </div>
      </header>

      <main className="w-full max-w-6xl grid grid-cols-1 lg:grid-cols-12 gap-10">
        <div className="lg:col-span-7 flex flex-col gap-6">
          <div 
            ref={containerRef}
            className="w-full bg-black overflow-hidden relative shadow-2xl border border-zinc-800/40 group"
            style={{ aspectRatio: '16/9' }}
          >
            {isProcessing ? (
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-5 bg-zinc-950/95 backdrop-blur-3xl z-50">
                <div className="w-16 h-16 border-[5px] border-indigo-500/10 border-t-indigo-500 rounded-full animate-spin"></div>
                <div className="flex flex-col items-center text-center px-8">
                  <p className="text-[11px] font-black text-indigo-500 uppercase tracking-[0.6em] animate-pulse">CLEANING LOGOS & RENDER 16:9...</p>
                  <p className="text-[9px] text-zinc-500 uppercase mt-2 font-bold italic">Vui lòng chờ trong giây lát</p>
                </div>
              </div>
            ) : processedUrl ? (
              <div 
                className="canvas-workspace-inner relative w-[1280px] h-[720px] bg-black origin-top-left overflow-hidden"
                style={{ transform: `scale(${canvasScale})` }}
              >
                <div 
                  onMouseDown={(e) => handleMouseDown(e, 'img')}
                  className="absolute inset-0 cursor-move origin-center"
                  style={{
                    transform: `translate(${offset.x}px, ${offset.y}px) scale(${zoom})`,
                    backgroundImage: `url(${processedUrl})`,
                    backgroundSize: '100% 100%',
                    filter: `brightness(${brightness})`
                  }}
                />
                
                {focusImgUrl && (
                  <div 
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'focus'); }}
                    className="absolute z-40 cursor-move border-[12px] border-red-600 rounded-full overflow-hidden"
                    style={{ 
                      left: focusPos.x, 
                      top: focusPos.y, 
                      width: focusSize, 
                      height: focusSize,
                      boxShadow: `0 0 60px ${COLOR_VIBRANT_RED}`
                    }}
                  >
                    <img src={focusImgUrl} className="w-full h-full object-cover pointer-events-none" />
                  </div>
                )}

                {showCircle && (
                  <div 
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'circle'); }}
                    className="absolute z-40 cursor-move border-[12px] border-red-600 rounded-full overflow-hidden"
                    style={{ 
                      left: circlePos.x, 
                      top: circlePos.y, 
                      width: circleSize, 
                      height: circleSize,
                      boxShadow: `0 0 60px ${COLOR_VIBRANT_RED}`
                    }}
                  >
                     <div className="w-full h-full" style={{
                       backgroundImage: `url(${processedUrl})`,
                       backgroundSize: `${1280 * zoom}px ${720 * zoom}px`,
                       backgroundPosition: `${-circlePos.x + offset.x}px ${-circlePos.y + offset.y}px`,
                       filter: 'brightness(1.4)'
                     }} />
                  </div>
                )}

                {showArrow && (
                  <div 
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'arrow'); }}
                    className="absolute z-[45] cursor-move flex items-center justify-center"
                    style={{
                      left: arrowPos.x,
                      top: arrowPos.y,
                      transform: `translate(-50%, -50%) rotate(${getArrowAngle()}deg) scale(${arrowScale})`,
                      width: '60px',
                      height: '120px',
                      filter: `drop-shadow(0 0 30px ${COLOR_VIBRANT_RED}) drop-shadow(0 0 10px ${COLOR_VIBRANT_RED})`
                    }}
                  >
                    <svg width="60" height="120" viewBox="0 0 60 120">
                      <path d="M30 0 L60 40 L42 40 L42 120 L18 120 L18 40 L0 40 Z" fill={COLOR_VIBRANT_RED} stroke="white" strokeWidth="3" />
                    </svg>
                  </div>
                )}

                {text.trim() && (
                  <div 
                    onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'text'); }}
                    className="absolute z-50 cursor-move select-none whitespace-pre uppercase pointer-events-auto"
                    style={{
                      left: textPos.x,
                      top: textPos.y,
                      transform: getPreviewTextTransform(),
                      width: 'max-content',
                      textAlign: textAlign,
                      fontFamily: font,
                      fontSize: `${textSize}px`,
                      lineHeight: LINE_HEIGHT,
                      WebkitTextStroke: `${outlineWidth * 2.2}px ${activeStyle.stroke}`,
                      color: activeStyle.fill,
                      paintOrder: 'stroke fill',
                      textShadow: `0 5px ${shadowBlur}px rgba(0,0,0,0.8)`
                    }}
                  >
                    <div className="absolute left-1/2 -top-16 -translate-x-1/2 flex flex-col items-center">
                        <div 
                            onMouseDown={(e) => { e.stopPropagation(); handleMouseDown(e, 'rotate'); }}
                            className="w-8 h-8 bg-indigo-500 rounded-full border-2 border-white shadow-lg cursor-pointer"
                            style={{ backgroundColor: COLOR_ROTATE_HANDLE }}
                        />
                    </div>
                    {text.toUpperCase()}
                  </div>
                )}
              </div>
            ) : (
              <label className="absolute inset-0 cursor-pointer flex flex-col items-center justify-center group bg-zinc-900/10 hover:bg-zinc-900/20 transition-all">
                <input type="file" className="hidden" onChange={handleFileChange} accept="image/*" />
                <div className="w-20 h-20 bg-zinc-900 flex items-center justify-center border border-zinc-800 group-hover:border-indigo-500 transition-all">
                  <svg className="w-8 h-8 text-zinc-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                  </svg>
                </div>
                <p className="mt-8 text-[11px] font-black text-zinc-500 uppercase tracking-[0.4em]">CHỌN ẢNH CẦN LÀM SẠCH (CÓ LOGO)</p>
              </label>
            )}
          </div>

          <div className="grid grid-cols-2 gap-5">
            <div className="bg-zinc-900/40 p-6 border border-zinc-800/50">
              <label className="text-[10px] font-black text-zinc-500 uppercase block mb-3">PHÓNG TO: x{zoom.toFixed(2)}</label>
              <input type="range" min="1.0" max="4" step="0.01" value={zoom} onChange={e => setZoom(parseFloat(e.target.value))} className="w-full accent-indigo-600" />
            </div>
            <div className="bg-zinc-900/40 p-6 border border-zinc-800/50">
              <label className="text-[10px] font-black text-zinc-500 uppercase block mb-3">ĐỘ SÁNG: {Math.round(brightness * 100)}%</label>
              <input type="range" min="0.5" max="1.5" step="0.01" value={brightness} onChange={e => setBrightness(parseFloat(e.target.value))} className="w-full accent-white" />
            </div>
          </div>

          <button id="export-btn" onClick={exportFinal} disabled={!processedUrl} className="w-full py-6 bg-indigo-600 hover:bg-indigo-500 text-white font-black uppercase text-[12px] tracking-[0.4em] shadow-xl transition-all disabled:opacity-30 active:scale-[0.99]">
            TẠO ẢNH CHUẨN 16:9
          </button>
        </div>

        <div className="lg:col-span-5 flex flex-col gap-6">
          <div className={`glass-effect p-8 flex flex-col gap-6 border-zinc-800/60 shadow-2xl ${!processedUrl ? 'opacity-30 pointer-events-none' : ''}`}>
            
            <div className="flex gap-2">
              <button onClick={() => setShowCircle(!showCircle)} className={`px-2 py-4 font-black text-[9px] uppercase flex-1 transition-all ${showCircle ? 'bg-zinc-100 text-black' : 'bg-red-600 text-white'}`}>
                {showCircle ? 'ẨN VÒNG' : 'VÒNG TRÒN'}
              </button>
              <button onClick={() => setShowArrow(!showArrow)} className={`px-2 py-4 font-black text-[9px] uppercase flex-1 transition-all ${showArrow ? 'bg-zinc-100 text-black' : 'bg-red-600 text-white'}`}>
                {showArrow ? 'ẨN MŨI TÊN' : 'MŨI TÊN'}
              </button>
              <button onClick={toggleFocus} className={`px-2 py-4 font-black text-[9px] uppercase flex-1 transition-all ${focusImgUrl ? 'bg-zinc-100 text-black' : 'bg-red-600 text-white'}`}>
                <input type="file" ref={focusInputRef} className="hidden" onChange={handleFocusFileChange} accept="image/*" />
                {focusImgUrl ? 'ẨN TIÊU ĐIỂM' : 'TIÊU ĐIỂM'}
              </button>
            </div>

            <div className="flex justify-between items-center">
              <h2 className="text-[11px] font-black text-zinc-400 tracking-[0.2em] uppercase">VĂN BẢN</h2>
              <div className="flex bg-black p-1 gap-1">
                {(['left', 'center', 'right'] as const).map(align => (
                  <button key={align} onClick={() => handleAlignChange(align)} className={`px-3 py-1.5 text-[8px] font-black ${textAlign === align ? 'bg-zinc-100 text-black' : 'text-zinc-600'}`}>
                    {align.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            <textarea 
              value={text} onChange={e => setText(e.target.value.toUpperCase())} 
              className="w-full bg-black border border-zinc-800 px-6 py-5 text-xl font-black text-white focus:border-indigo-500 outline-none min-h-[120px] uppercase"
              placeholder="NHẬP TIÊU ĐỀ..."
            />
            
            <button onClick={handleTranslate} disabled={!text.trim() || isTranslating} className="w-full py-3 bg-zinc-800 text-zinc-300 text-[9px] font-black uppercase tracking-widest">
              {isTranslating ? 'ĐANG DỊCH...' : 'DỊCH SANG TIẾNG ANH'}
            </button>

            <section>
              <label className="text-[9px] font-black text-zinc-500 uppercase block mb-3">MÀU CHỮ</label>
              <div className="grid grid-cols-2 gap-2">
                {TEXT_STYLES.map(style => (
                  <button key={style.id} onClick={() => setActiveStyle(style)} className={`py-3 border text-[8px] font-black transition-all ${activeStyle.id === style.id ? 'bg-indigo-600 border-white text-white' : 'bg-zinc-900 border-zinc-800 text-zinc-500'}`}>
                    {style.name}
                  </button>
                ))}
              </div>
            </section>

            <div className="grid grid-cols-2 gap-4">
              <div className="col-span-2">
                <label className="text-[9px] font-black text-zinc-500 uppercase block mb-2">PHÔNG CHỮ</label>
                <select value={font} onChange={e => setFont(e.target.value)} className="w-full bg-zinc-900 border border-zinc-800 px-4 py-3 text-[10px] font-black uppercase outline-none">
                  {FONTS.map(f => <option key={f.family} value={f.family}>{f.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-[9px] font-black text-zinc-500 uppercase block mb-2">CỠ CHỮ: {textSize}</label>
                <input type="range" min="50" max="400" value={textSize} onChange={e => setTextSize(parseInt(e.target.value))} className="w-full accent-indigo-500" />
              </div>
              <div>
                <label className="text-[9px] font-black text-zinc-500 uppercase block mb-2">VIỀN: {outlineWidth}</label>
                <input type="range" min="0" max="30" step="0.5" value={outlineWidth} onChange={e => setOutlineWidth(parseFloat(e.target.value))} className="w-full accent-zinc-500" />
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};

export default App;