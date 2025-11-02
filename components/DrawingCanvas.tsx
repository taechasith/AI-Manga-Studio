
import React, { useRef, useEffect, useState, useCallback } from 'react';
import { BrushIcon } from './icons/BrushIcon';
import { EraserIcon } from './icons/EraserIcon';
import { TrashIcon } from './icons/TrashIcon';

interface DrawingCanvasProps {
  onCancel: () => void;
  onSave: (dataUrl: string) => void;
}

type Tool = 'pen' | 'eraser';

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ onCancel, onSave }) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);
    const [isDrawing, setIsDrawing] = useState(false);
    const [tool, setTool] = useState<Tool>('pen');
    const [brushSize, setBrushSize] = useState(5);
    const [brushColor, setBrushColor] = useState('#000000');
    
    const prepareCanvas = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return;
        
        const parent = canvas.parentElement;
        if (!parent) return;

        const dpr = window.devicePixelRatio || 1;
        const rect = parent.getBoundingClientRect();
        
        canvas.width = rect.width * dpr;
        canvas.height = rect.height * dpr;
        canvas.style.width = `${rect.width}px`;
        canvas.style.height = `${rect.height}px`;

        const context = canvas.getContext('2d');
        if (context) {
            context.scale(dpr, dpr);
            context.lineCap = 'round';
            context.lineJoin = 'round';
            context.fillStyle = 'white';
            context.fillRect(0, 0, context.canvas.width, context.canvas.height);
            contextRef.current = context;
        }
    }, []);

    useEffect(() => {
        // Delay to allow component to render and get correct dimensions
        const timeoutId = setTimeout(prepareCanvas, 10);
        window.addEventListener('resize', prepareCanvas);
        
        return () => {
            clearTimeout(timeoutId);
            window.removeEventListener('resize', prepareCanvas);
        }
    }, [prepareCanvas]);

    useEffect(() => {
        const context = contextRef.current;
        if (context) {
            if (tool === 'pen') {
                context.strokeStyle = brushColor;
                context.lineWidth = brushSize;
                context.globalCompositeOperation = 'source-over';
            } else { // eraser
                context.strokeStyle = 'white';
                context.lineWidth = brushSize * 3; // Make eraser bigger
                context.globalCompositeOperation = 'destination-out';
            }
        }
    }, [tool, brushSize, brushColor]);
    
    const getCoords = (e: React.MouseEvent | React.TouchEvent) => {
        const target = e.currentTarget as HTMLCanvasElement;
        const rect = target.getBoundingClientRect();
        if ('touches' in e.nativeEvent) {
            return {
                x: e.nativeEvent.touches[0].clientX - rect.left,
                y: e.nativeEvent.touches[0].clientY - rect.top,
            };
        }
        return { x: e.nativeEvent.offsetX, y: e.nativeEvent.offsetY };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        const context = contextRef.current;
        if (!context) return;
        const { x, y } = getCoords(e);
        context.beginPath();
        context.moveTo(x, y);
        setIsDrawing(true);
    };

    const finishDrawing = () => {
        const context = contextRef.current;
        if (!context) return;
        context.closePath();
        setIsDrawing(false);
    };

    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        const context = contextRef.current;
        if (!context) return;
        const { x, y } = getCoords(e);
        context.lineTo(x, y);
        context.stroke();
    };

    const handleClearCanvas = () => {
        const context = contextRef.current;
        const canvas = canvasRef.current;
        if (context && canvas) {
            context.fillStyle = 'white';
            context.fillRect(0, 0, canvas.width, canvas.height);
        }
    };
    
    const handleSave = () => {
        if (canvasRef.current) {
            const dataUrl = canvasRef.current.toDataURL('image/png');
            onSave(dataUrl);
        }
    };

    return (
        <div className="bg-gray-900/50 rounded-2xl w-full flex flex-col shadow-lg border border-gray-700">
            {/* Toolbar */}
            <div className="w-full bg-gray-700/30 p-3 flex flex-wrap items-center justify-start gap-x-6 gap-y-2 rounded-t-2xl border-b border-gray-700">
                <div className="flex items-center gap-2" role="group" aria-label="เครื่องมือวาดภาพ">
                    <button onClick={() => setTool('pen')} title="ปากกา" aria-pressed={tool === 'pen'} className={`p-2 rounded-lg transition-colors ${tool === 'pen' ? 'bg-purple-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                        <BrushIcon className="w-5 h-5"/>
                    </button>
                    <button onClick={() => setTool('eraser')} title="ยางลบ" aria-pressed={tool === 'eraser'} className={`p-2 rounded-lg transition-colors ${tool === 'eraser' ? 'bg-purple-600 text-white' : 'bg-gray-700 hover:bg-gray-600'}`}>
                        <EraserIcon className="w-5 h-5"/>
                    </button>
                </div>
                <div className="flex items-center gap-2">
                    <label htmlFor="brush-size-range" className="text-sm font-medium text-gray-300">ขนาด</label>
                    <input id="brush-size-range" type="range" min="1" max="50" value={brushSize} onChange={e => setBrushSize(Number(e.target.value))} className="w-24" />
                </div>
                <div className="flex-grow"></div>
                <button onClick={handleClearCanvas} title="ล้างทั้งหมด" className="flex items-center gap-2 p-2 rounded-lg bg-red-800/80 hover:bg-red-700/80 text-white transition-colors">
                    <TrashIcon className="w-5 h-5"/>
                </button>
            </div>
            
            {/* Canvas Area */}
            <div className="flex-1 p-2 bg-gray-900/50 flex flex-col min-h-[300px] md:min-h-[400px]">
                <div 
                    className="flex-1 w-full h-full bg-white rounded-lg overflow-hidden touch-none" 
                    ref={(node) => {
                        if (node && !canvasRef.current) {
                            const canvas = document.createElement('canvas');
                            canvasRef.current = canvas;
                            node.appendChild(canvas);
                            prepareCanvas();
                        }
                    }}
                    onMouseDown={startDrawing}
                    onMouseUp={finishDrawing}
                    onMouseLeave={finishDrawing}
                    onMouseMove={draw}
                    onTouchStart={startDrawing}
                    onTouchEnd={finishDrawing}
                    onTouchCancel={finishDrawing}
                    onTouchMove={draw}
                    role="img"
                    aria-label="พื้นที่สำหรับวาดภาพ"
                >
                </div>
            </div>
            
            {/* Actions */}
            <div className="flex items-center justify-end gap-4 p-3 border-t border-gray-700 rounded-b-2xl">
                <button onClick={onCancel} className="py-2 px-5 bg-gray-600 hover:bg-gray-500 text-white font-semibold rounded-lg transition-colors">ยกเลิก</button>
                <button onClick={handleSave} className="py-2 px-5 bg-purple-600 hover:bg-purple-700 text-white font-bold rounded-lg transition-colors">เพิ่มภาพร่าง</button>
            </div>
        </div>
    );
};
