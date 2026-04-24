/* ================= 기본 설정 ================= */

let currentSymbol = "BTCUSDT";
let interval = "1m";

const chartEl = document.getElementById("chart");

const chart = LightweightCharts.createChart(chartEl, {
  layout: { background: { color: "#0B0E11" }, textColor: "#848E9C" },
  grid: { vertLines: { color: "#1E2329" }, horzLines: { color: "#1E2329" } },
  rightPriceScale: { borderColor: "#2B3139" },
  timeScale: { timeVisible: true },
});

const candleSeries = chart.addCandlestickSeries();

/* ===== 미래 캔들 ===== */

const futureCandleSeries = chart.addCandlestickSeries({
  upColor: "rgba(38,166,154,0.5)",
  downColor: "rgba(239,83,80,0.5)",
  borderVisible: true,
  borderUpColor: "#FCD535",
  borderDownColor: "#FCD535",
  wickUpColor: "#FCD535",
  wickDownColor: "#FCD535",
});

/* ================= 상태 ================= */

let dataCache = [];

let drawing = false;
let isPointerDown = false;

let startPoint = null;
let lastGeneratedIndex = 0;

const PIXELS_PER_BAR = 12;

/* ===== 핵심 ===== */

let futurePath = [];        // [{t, price}]
let futureTotalBars = 0;    // 🔥 핵심 변수
let baseTime = null;
let baseInterval = null;

let futureCandles = [];

/* ================= 버튼 ================= */

function toggleDraw() {
  drawing = !drawing;

  const btn = document.getElementById("futureBtn");

  if (drawing) {
    btn.innerText = "미래봉 ON";
    btn.classList.add("active");

    baseTime = dataCache[dataCache.length - 1].time;
    baseInterval = interval;

    futurePath = [];
    futureCandles = [];
    futureTotalBars = 0;

    futureCandleSeries.setData([]);
  } else {
    btn.innerText = "미래봉 OFF";
    btn.classList.remove("active");
  }
}

function clearFuture() {
  futurePath = [];
  futureCandles = [];
  futureTotalBars = 0;

  futureCandleSeries.setData([]);
}

/* ================= 데이터 ================= */

async function loadData() {
  const res = await fetch(
    `https://fapi.binance.com/fapi/v1/klines?symbol=${currentSymbol}&interval=${interval}&limit=500`
  );

  const raw = await res.json();

  dataCache = raw.map((d) => ({
    time: d[0] / 1000,
    open: +d[1],
    high: +d[2],
    low: +d[3],
    close: +d[4],
  }));

  candleSeries.setData(dataCache);
  chart.timeScale().fitContent();
}

/* ================= 드래그 ================= */

chartEl.addEventListener("pointerdown", (e) => {
  if (!drawing) return;

  isPointerDown = true;

  const rect = chartEl.getBoundingClientRect();

  startPoint = {
    x: e.clientX - rect.left,
    y: e.clientY - rect.top,
  };

  baseTime = dataCache[dataCache.length - 1].time;
  baseInterval = interval;

  futurePath = [];
  futureCandles = [];
  futureTotalBars = 0;
  lastGeneratedIndex = 0;
});

chartEl.addEventListener("pointerup", () => {
  isPointerDown = false;
});

chartEl.addEventListener("pointermove", (e) => {
  if (!drawing || !isPointerDown || !startPoint) return;

  const rect = chartEl.getBoundingClientRect();

  const dx = (e.clientX - rect.left) - startPoint.x;
  const dy = (e.clientY - rect.top) - startPoint.y;

  const targetBars = Math.floor(dx / PIXELS_PER_BAR);
  if (targetBars <= 0) return;

  futureTotalBars = targetBars; // 🔥 핵심

  while (lastGeneratedIndex < targetBars) {

    const tNorm = (lastGeneratedIndex + 1) / targetBars;

    const interpY = startPoint.y + dy * tNorm;
    const price = candleSeries.coordinateToPrice(interpY);

    if (price == null) return;

    futurePath.push({
      t: tNorm,
      price: price,
    });

    lastGeneratedIndex++;
  }

  rebuildFutureCandles();
});

/* ================= 핵심 로직 ================= */

function rebuildFutureCandles() {

  if (!futurePath.length || futureTotalBars === 0) return;

  const baseSec = getIntervalSeconds(baseInterval);
  const currentSec = getIntervalSeconds(interval);

  const totalSeconds = baseSec * futureTotalBars; // 🔥 핵심 수정
  const newBars = Math.max(1, Math.floor(totalSeconds / currentSec));

  let newCandles = [];
  let nextTime = baseTime;

  for (let i = 0; i < newBars; i++) {

    const t = (i + 1) / newBars;

    let p1 = futurePath[0];
    let p2 = futurePath[futurePath.length - 1];

    for (let j = 0; j < futurePath.length - 1; j++) {
      if (t >= futurePath[j].t && t <= futurePath[j + 1].t) {
        p1 = futurePath[j];
        p2 = futurePath[j + 1];
        break;
      }
    }

    const localT = (t - p1.t) / (p2.t - p1.t || 1);
    const price = p1.price + (p2.price - p1.price) * localT;

    nextTime += currentSec;

    const prevClose =
      newCandles.length > 0
        ? newCandles[newCandles.length - 1].close
        : dataCache[dataCache.length - 1].close;

    newCandles.push({
      time: nextTime,
      open: prevClose,
      high: Math.max(prevClose, price),
      low: Math.min(prevClose, price),
      close: price,
    });
  }

  futureCandles = newCandles;
  futureCandleSeries.setData(futureCandles);
}

/* ================= 기타 ================= */

function getIntervalSeconds(tf) {
  if (tf.endsWith("m")) return parseInt(tf) * 60;
  if (tf.endsWith("h")) return parseInt(tf) * 3600;
  if (tf.endsWith("d")) return parseInt(tf) * 86400;
  return 60;
}

function changeSymbol(s) {
  currentSymbol = s;
  loadData().then(rebuildFutureCandles);
}

function changeTF(tf) {
  interval = tf;
  loadData().then(rebuildFutureCandles);
}

/* ================= 시작 ================= */

window.onload = () => {
  loadData();
};
