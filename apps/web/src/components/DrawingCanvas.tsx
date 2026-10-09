import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useUiStore } from '../store/uiStore';
import styles from './DrawingCanvas.module.css';

interface Point {
  x: number;
  y: number;
}

interface Stroke {
  tool: 'pen' | 'highlighter';
  color: string;
  width: number;
  points: Point[];
}

interface DrawingCanvasProps {
  noteId: string;
}

export const DrawingCanvas: React.FC<DrawingCanvasProps> = ({ noteId }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { drawTool, drawColor, drawWidth, clearInkCounter, activeRibbonTab } = useUiStore();
  const [strokes, setStrokes] = useState<Stroke[]>([]);
  const isDrawing = useRef(false);
  const currentPoints = useRef<Point[]>([]);

  const storageKey = `onenote_ink_${noteId}`;

  // Load ink on mount or noteId change
  useEffect(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        setStrokes(JSON.parse(saved));
      } else {
        setStrokes([]);
      }
    } catch {
      setStrokes([]);
    }
  }, [noteId, storageKey]);

  // Save ink on change
  useEffect(() => {
    if (strokes.length > 0) {
      localStorage.setItem(storageKey, JSON.stringify(strokes));
    } else {
      localStorage.removeItem(storageKey);
    }
  }, [strokes, storageKey]);

  // Listen for clear ink
  useEffect(() => {
    if (clearInkCounter > 0) {
      setStrokes([]);
      const canvas = canvasRef.current;
      if (canvas) {
        const ctx = canvas.getContext('2d');
        ctx?.clearRect(0, 0, canvas.width, canvas.height);
      }
    }
  }, [clearInkCounter]);

  // Redraw all strokes on canvas
  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.clearRect(0, 0, canvas.width, canvas.height);

    for (const stroke of strokes) {
      if (stroke.points.length < 2) continue;

      ctx.save();
      ctx.beginPath();
      ctx.moveTo(stroke.points[0].x, stroke.points[0].y);

      for (let i = 1; i < stroke.points.length; i++) {
        ctx.lineTo(stroke.points[i].x, stroke.points[i].y);
      }

      if (stroke.tool === 'highlighter') {
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = Math.max(stroke.width, 14);
        ctx.lineCap = 'square';
        ctx.lineJoin = 'miter';
      } else {
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = stroke.color;
        ctx.lineWidth = stroke.width;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }

      ctx.stroke();
      ctx.restore();
    }
  }, [strokes]);

  // Precise 1:1 resize to avoid coordinate scaling offset
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const parent = canvas.parentElement;
    if (!parent) return;

    const updateSize = () => {
      const rect = parent.getBoundingClientRect();
      const newWidth = Math.round(rect.width);
      const newHeight = Math.max(Math.round(parent.scrollHeight), Math.round(rect.height));

      if (canvas.width !== newWidth || canvas.height !== newHeight) {
        canvas.width = newWidth;
        canvas.height = newHeight;
        redraw();
      }
    };

    updateSize();

    // Use ResizeObserver for accurate sizing
    const ro = new ResizeObserver(() => {
      updateSize();
    });
    ro.observe(parent);

    window.addEventListener('resize', updateSize);
    return () => {
      ro.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, [redraw]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  // Accurate mouse position calculation
  const getPos = (e: React.MouseEvent<HTMLCanvasElement>): Point => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    // Scale calculation ensures exact alignment with cursor tip
    const scaleX = rect.width ? canvas.width / rect.width : 1;
    const scaleY = rect.height ? canvas.height / rect.height : 1;

    return {
      x: (e.clientX - rect.left) * scaleX,
      y: (e.clientY - rect.top) * scaleY,
    };
  };

  const startDrawing = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (drawTool === 'type') return;

    const pos = getPos(e);
    isDrawing.current = true;

    if (drawTool === 'eraser') {
      eraseAt(pos);
      return;
    }

    currentPoints.current = [pos];
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx) {
      ctx.save();
      ctx.beginPath();
      ctx.arc(pos.x, pos.y, drawWidth / 2, 0, Math.PI * 2);
      ctx.fillStyle = drawColor;
      ctx.fill();
      ctx.restore();
    }
  };

  const draw = (e: React.MouseEvent<HTMLCanvasElement>) => {
    if (!isDrawing.current || drawTool === 'type') return;

    const pos = getPos(e);

    if (drawTool === 'eraser') {
      eraseAt(pos);
      return;
    }

    currentPoints.current.push(pos);
    const pts = currentPoints.current;
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (ctx && pts.length > 1) {
      ctx.save();
      ctx.beginPath();
      const prev = pts[pts.length - 2];
      ctx.moveTo(prev.x, prev.y);
      ctx.lineTo(pos.x, pos.y);

      if (drawTool === 'highlighter') {
        ctx.globalAlpha = 0.4;
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = Math.max(drawWidth, 14);
        ctx.lineCap = 'square';
      } else {
        ctx.globalAlpha = 1.0;
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = drawWidth;
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
      }
      ctx.stroke();
      ctx.restore();
    }
  };

  const stopDrawing = () => {
    if (!isDrawing.current || drawTool === 'type') return;
    isDrawing.current = false;

    if (drawTool !== 'eraser' && currentPoints.current.length > 1) {
      const newStroke: Stroke = {
        tool: drawTool,
        color: drawColor,
        width: drawWidth,
        points: [...currentPoints.current],
      };
      setStrokes((prev) => [...prev, newStroke]);
    }
    currentPoints.current = [];
  };

  const eraseAt = (point: Point) => {
    const threshold = 18;
    setStrokes((prev) =>
      prev.filter((stroke) => {
        return !stroke.points.some(
          (p) => Math.hypot(p.x - point.x, p.y - point.y) < threshold
        );
      })
    );
  };

  const isInteractive = activeRibbonTab === 'Draw' && drawTool !== 'type';

  return (
    <canvas
      ref={canvasRef}
      className={`${styles.drawingCanvas} ${isInteractive ? styles.interactive : ''} ${
        drawTool === 'eraser' && isInteractive ? styles.eraserCursor : ''
      }`}
      onMouseDown={startDrawing}
      onMouseMove={draw}
      onMouseUp={stopDrawing}
      onMouseLeave={stopDrawing}
    />
  );
};
