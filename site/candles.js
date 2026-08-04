/**
 * 背景的流動 K 線。純裝飾，資料是隨機遊走產生的，不代表任何真實行情。
 * 台股慣例紅漲綠跌，所以上漲用紅、下跌用綠。
 */
const CANDLE_WIDTH = 11; // 含間距的單根寬度
const SPEED = 0.35; // 每幀往左移動的像素
const UP = 'rgba(255, 77, 77, 0.5)';
const DOWN = 'rgba(34, 197, 94, 0.45)';
const GRID = 'rgba(120, 150, 190, 0.07)';

const canvas = document.getElementById('candles');
if (canvas && !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  start(canvas);
}

function start(canvas) {
  const ctx = canvas.getContext('2d', { alpha: true });
  let width = 0;
  let height = 0;
  let candles = [];
  let offset = 0;
  let price = 0;
  let frame = null;

  function resize() {
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    // 用 viewport 尺寸而非 clientWidth：畫布是 position:fixed 滿版，而模組
    // 腳本執行時可能還沒完成第一次版面計算，clientWidth 會讀到 0。
    width = window.innerWidth;
    height = window.innerHeight;
    canvas.width = Math.round(width * dpr);
    canvas.height = Math.round(height * dpr);
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    seed();
    paint();
  }

  /** 用隨機遊走鋪滿整個寬度，避免一開始畫面是空的。 */
  function seed() {
    candles = [];
    price = height / 2;
    const needed = Math.ceil(width / CANDLE_WIDTH) + 2;
    for (let i = 0; i < needed; i += 1) candles.push(nextCandle());
    offset = 0;
  }

  function nextCandle() {
    const drift = (Math.random() - 0.5) * height * 0.05;
    const open = price;
    const close = clamp(open + drift, height * 0.12, height * 0.88);
    const wick = Math.abs(drift) * (0.6 + Math.random());
    price = close;
    return {
      open,
      close,
      high: clamp(Math.min(open, close) - wick, 0, height),
      low: clamp(Math.max(open, close) + wick, 0, height),
    };
  }

  /** 畫一幀並排下一幀。 */
  function loop() {
    advance();
    paint();
    frame = requestAnimationFrame(loop);
  }

  function advance() {
    offset += SPEED;
    while (offset >= CANDLE_WIDTH) {
      offset -= CANDLE_WIDTH;
      candles.shift();
      candles.push(nextCandle());
    }
  }

  function paint() {
    ctx.clearRect(0, 0, width, height);

    // 背景格線
    ctx.strokeStyle = GRID;
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let y = 0; y < height; y += 60) {
      ctx.moveTo(0, y + 0.5);
      ctx.lineTo(width, y + 0.5);
    }
    ctx.stroke();

    candles.forEach((candle, index) => {
      const x = index * CANDLE_WIDTH - offset;
      const rising = candle.close < candle.open; // 畫布 y 向下，值越小價格越高
      ctx.strokeStyle = rising ? UP : DOWN;
      ctx.fillStyle = rising ? UP : DOWN;

      ctx.lineWidth = 1;
      ctx.beginPath();
      ctx.moveTo(x + CANDLE_WIDTH / 2, candle.high);
      ctx.lineTo(x + CANDLE_WIDTH / 2, candle.low);
      ctx.stroke();

      const top = Math.min(candle.open, candle.close);
      const bodyHeight = Math.max(Math.abs(candle.close - candle.open), 1.5);
      ctx.fillRect(x + 1.5, top, CANDLE_WIDTH - 4, bodyHeight);
    });
  }

  function stop() {
    if (frame !== null) cancelAnimationFrame(frame);
    frame = null;
  }

  // 分頁在背景時停掉，免得白白吃 CPU。
  document.addEventListener('visibilitychange', () => {
    if (document.hidden) stop();
    else if (frame === null) frame = requestAnimationFrame(loop);
  });

  window.addEventListener('resize', debounce(resize, 200));
  resize();
  // 先同步畫一幀：分頁若在背景開啟，requestAnimationFrame 不會觸發，
  // 沒有這行使用者切回來之前背景會是全空的。
  paint();
  if (!document.hidden) frame = requestAnimationFrame(loop);
}

function clamp(value, min, max) {
  return Math.min(Math.max(value, min), max);
}

function debounce(fn, wait) {
  let timer;
  return (...args) => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), wait);
  };
}
