import {
  forwardRef,
  useCallback,
  useEffect,
  useImperativeHandle,
  useRef,
  useState,
} from 'react';

function drawGrid(context, size) {
  context.save();
  context.strokeStyle = '#d7c7b9';
  context.lineWidth = 1;
  context.setLineDash([6, 6]);
  context.beginPath();
  context.moveTo(size / 2, 0);
  context.lineTo(size / 2, size);
  context.moveTo(0, size / 2);
  context.lineTo(size, size / 2);
  context.moveTo(0, 0);
  context.lineTo(size, size);
  context.moveTo(size, 0);
  context.lineTo(0, size);
  context.stroke();
  context.restore();
}

const HandwritingCanvas = forwardRef(function HandwritingCanvas(
  { guideVisible, onChange },
  ref,
) {
  const canvasRef = useRef(null);
  const strokesRef = useRef([]);
  const currentRef = useRef(null);
  const [strokeCount, setStrokeCount] = useState(0);

  const redraw = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = canvas.clientWidth;
    const ratio = window.devicePixelRatio || 1;
    if (canvas.width !== Math.round(size * ratio)) {
      canvas.width = Math.round(size * ratio);
      canvas.height = Math.round(size * ratio);
    }
    const context = canvas.getContext('2d');
    context.setTransform(ratio, 0, 0, ratio, 0, 0);
    context.clearRect(0, 0, size, size);
    context.fillStyle = '#fffdf9';
    context.fillRect(0, 0, size, size);
    context.strokeStyle = '#b99f8b';
    context.lineWidth = 1.5;
    context.strokeRect(1, 1, size - 2, size - 2);
    if (guideVisible) drawGrid(context, size);
    context.strokeStyle = '#8f2137';
    context.lineWidth = Math.max(5, size * 0.018);
    context.lineCap = 'round';
    context.lineJoin = 'round';
    const visibleStrokes = currentRef.current
      ? [...strokesRef.current, currentRef.current]
      : strokesRef.current;
    for (const stroke of visibleStrokes) {
      if (!stroke.length) continue;
      context.beginPath();
      context.moveTo(stroke[0].x * size, stroke[0].y * size);
      stroke.slice(1).forEach((point) => context.lineTo(point.x * size, point.y * size));
      if (stroke.length === 1)
        context.lineTo(stroke[0].x * size + 0.1, stroke[0].y * size + 0.1);
      context.stroke();
    }
  }, [guideVisible]);

  useEffect(() => {
    redraw();
  }, [redraw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return undefined;
    const observer = new ResizeObserver(redraw);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [redraw]);

  function emit(next) {
    strokesRef.current = next;
    setStrokeCount(next.length);
    onChange(next);
    redraw();
  }

  useImperativeHandle(ref, () => ({
    clear() {
      currentRef.current = null;
      emit([]);
    },
    undo() {
      emit(strokesRef.current.slice(0, -1));
    },
    getStrokes() {
      return strokesRef.current;
    },
  }));

  function pointFrom(event) {
    const rect = canvasRef.current.getBoundingClientRect();
    return {
      x: Math.max(0, Math.min(1, (event.clientX - rect.left) / rect.width)),
      y: Math.max(0, Math.min(1, (event.clientY - rect.top) / rect.height)),
    };
  }

  function pointerDown(event) {
    event.preventDefault();
    canvasRef.current.setPointerCapture(event.pointerId);
    currentRef.current = [pointFrom(event)];
    redraw();
  }

  function pointerMove(event) {
    if (!currentRef.current) return;
    event.preventDefault();
    currentRef.current.push(pointFrom(event));
    redraw();
  }

  function pointerUp(event) {
    if (!currentRef.current) return;
    event.preventDefault();
    currentRef.current.push(pointFrom(event));
    const completed = currentRef.current;
    currentRef.current = null;
    emit([...strokesRef.current, completed]);
    if (canvasRef.current.hasPointerCapture(event.pointerId)) {
      canvasRef.current.releasePointerCapture(event.pointerId);
    }
  }

  return (
    <div className="handwriting-canvas-wrap">
      <canvas
        aria-label="Bàn luyện viết Hán tự trên ô mễ tự"
        className="handwriting-canvas"
        onPointerCancel={pointerUp}
        onPointerDown={pointerDown}
        onPointerMove={pointerMove}
        onPointerUp={pointerUp}
        ref={canvasRef}
        tabIndex="0"
      />
      <span aria-live="polite" className="handwriting-canvas__count">
        {strokeCount} nét đã viết
      </span>
    </div>
  );
});

export default HandwritingCanvas;
