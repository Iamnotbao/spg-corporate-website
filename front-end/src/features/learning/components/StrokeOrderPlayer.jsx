import { useEffect, useRef, useState } from 'react';
import HanziWriter from 'hanzi-writer';

export default function StrokeOrderPlayer({ character, data }) {
  const hostRef = useRef(null);
  const writerRef = useRef(null);
  const [playing, setPlaying] = useState(false);
  const [paused, setPaused] = useState(false);
  const [strokeIndex, setStrokeIndex] = useState(0);
  const [outlineVisible, setOutlineVisible] = useState(true);

  useEffect(() => {
    if (!hostRef.current || !data) return undefined;
    const host = hostRef.current;
    host.replaceChildren();
    const size = Math.min(host.clientWidth || 320, 360);
    const writer = HanziWriter.create(host, character, {
      width: size,
      height: size,
      padding: 18,
      showCharacter: false,
      showOutline: true,
      strokeAnimationSpeed: 1,
      delayBetweenStrokes: 260,
      strokeColor: '#9f263d',
      radicalColor: '#2f7164',
      outlineColor: '#d9cec3',
      charDataLoader: () => data,
    });
    writerRef.current = writer;
    const observer = new ResizeObserver(([entry]) => {
      const nextSize = Math.min(entry.contentRect.width, 360);
      if (nextSize > 0) writer.updateDimensions({ width: nextSize, height: nextSize });
    });
    observer.observe(host);
    return () => {
      observer.disconnect();
      writerRef.current = null;
      host.replaceChildren();
    };
  }, [character, data]);

  async function play() {
    if (!writerRef.current) return;
    if (paused) {
      await writerRef.current.resumeAnimation();
      setPaused(false);
      setPlaying(true);
      return;
    }
    setPlaying(true);
    setStrokeIndex(0);
    await writerRef.current.animateCharacter({ onComplete: () => setPlaying(false) });
  }

  async function pause() {
    if (!writerRef.current || !playing) return;
    await writerRef.current.pauseAnimation();
    setPaused(true);
    setPlaying(false);
  }

  async function replay() {
    if (!writerRef.current) return;
    setPaused(false);
    setStrokeIndex(0);
    await writerRef.current.hideCharacter({ duration: 0 });
    setPlaying(true);
    await writerRef.current.animateCharacter({ onComplete: () => setPlaying(false) });
  }

  async function nextStroke() {
    if (!writerRef.current) return;
    const next = strokeIndex % data.strokes.length;
    setPlaying(false);
    setPaused(false);
    await writerRef.current.animateStroke(next);
    setStrokeIndex((next + 1) % data.strokes.length);
  }

  async function highlightNextStroke() {
    if (!writerRef.current) return;
    const next = strokeIndex % data.strokes.length;
    await writerRef.current.highlightStroke(next);
  }

  async function toggleOutline() {
    if (!writerRef.current) return;
    if (outlineVisible) await writerRef.current.hideOutline({ duration: 120 });
    else await writerRef.current.showOutline({ duration: 120 });
    setOutlineVisible((visible) => !visible);
  }

  return (
    <section className="stroke-player" aria-labelledby="stroke-player-title">
      <div className="practice-section-heading">
        <span>01 · Xem mẫu</span>
        <h2 id="stroke-player-title">Thứ tự nét</h2>
        <p>Xem toàn bộ chuyển động hoặc làm nổi từng nét theo đúng thứ tự.</p>
      </div>
      <div className="stroke-player__stage" ref={hostRef} />
      <div className="stroke-player__controls">
        <button
          className="button button--primary button--small"
          disabled={playing}
          onClick={play}
          type="button"
        >
          {paused ? 'Tiếp tục' : 'Phát'}
        </button>
        <button
          className="button button--secondary button--small"
          disabled={!playing}
          onClick={pause}
          type="button"
        >
          Tạm dừng
        </button>
        <button
          className="button button--secondary button--small"
          onClick={replay}
          type="button"
        >
          Phát lại
        </button>
        <button
          className="button button--secondary button--small"
          onClick={nextStroke}
          type="button"
        >
          Nét kế · {strokeIndex + 1}
        </button>
        <button
          className="button button--secondary button--small"
          onClick={highlightNextStroke}
          type="button"
        >
          Làm nổi nét {strokeIndex + 1}
        </button>
        <button
          className="button button--secondary button--small"
          onClick={toggleOutline}
          type="button"
        >
          {outlineVisible ? 'Ẩn khung chữ' : 'Hiện khung chữ'}
        </button>
      </div>
    </section>
  );
}
