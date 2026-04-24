/* ================= 기본 설정 ================= */

let currentSymbol = "BTCUSDT";
let interval = "1m";

const chartEl = document.getElementById("chart");

const chart = LightweightCharts.createChart(chartEl, {
  layout: { background: { color: "#0B0E11" }, textColor: "#848E9C" },
  grid: { vertLines: { color: "#1E2329" }, horzLines: { color: "#1E2329" } },
  rightPriceScale: { borderColor: "#2B3139" },
  timeScale: { timeVisible: true },

  handleScroll: {
    mouseWheel: true,
    pressedMouseMove: true,
  },
  handleScale: {
    mouseWheel: true,
    pinch: true,
  },
});

const candleSeries = chart.addCandlestickSeries();

/* ===== 미래 캔들 (별도) ===== */

const futureCandleSeries = chart.addCandlestickSeries({
  upColor: "rgba(38,166,154,0.5)",     // 반투명
  downColor: "rgba(239,83,80,0.5)",

  borderVisible: true,
  borderUpColor: "#FFD700",            // 🔥 흰색 테두리
  borderDownColor: "#FFD700",

  wickUpColor: "#FFD700",
  wickDownColor: "#FFD700",
});

/* ================= MA ================= */

const maPeriods = [7, 15, 60, 100, 200];
const maColors = {
  7: "#FCD535",
  15: "#FF00FF",
  60: "#00C087",
  100: "#2962FF",
  200: "#FF4D4F",
};

const maSeries = {};
const maState = { 7: true, 15: true, 60: true, 100: true, 200: true };

maPeriods.forEach((p) => {
  maSeries[p] = chart.addLineSeries({
    color: maColors[p],
    lineWidth: 2,
    priceLineVisible: false,
    lastValueVisible: false,
  });
});

/* ================= 미래봉 ================= */

let futurePoints = [];
let futureCandles = [];
let drawing = false;
let nextFutureTime = null;

const futureSeries = chart.addLineSeries({
  color: "#AAAAAA",
  lineWidth: 2,
  lineStyle: LightweightCharts.LineStyle.Dotted,
  priceLineVisible: false,
  lastValueVisible: false,
});

/* ===== 드래그 변수 ===== */

let isPointerDown = false;
let startPoint = null;
let lastGeneratedIndex = 0;
const PIXELS_PER_BAR = 12;

/* ================= 버튼 ================= */

function toggleDraw() {
  drawing = !drawing;

  const btn = document.getElementById("futureBtn");

  if (drawing) {
    btn.innerText = "미래봉 ON";
    btn.classList.add("active");

    nextFutureTime = dataCache[dataCache.length - 1].time;

    futurePoints = [];
    futureCandles = [];
    futureSeries.setData([]);
    futureCandleSeries.setData([]);
  } else {
    btn.innerText = "미래봉 OFF";
    btn.classList.remove("active");
  }
}

/* ================= 데이터 ================= */

let dataCache = [];

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
  updateAllMA();
  chart.timeScale().fitContent();
}

/* ================= EMA ================= */

function calcEMA(data, period) {
  const k = 2 / (period + 1);
  let ema = [];
  let prev;

  data.forEach((d, i) => {
    if (i === 0) {
      prev = d.close;
    } else {
      prev = d.close * k + prev * (1 - k);
    }
    ema.push({ time: d.time, value: prev });
  });

  return ema;
}

/* ================= MA ================= */

function updateAllMA() {
  const combined = [...dataCache];

  futureCandles.forEach((c) => combined.push(c));

  maPeriods.forEach((p) => {
    if (maState[p]) {
      maSeries[p].setData(calcEMA(combined, p));
    } else {
      maSeries[p].setData([]);
    }
  });
}

/* ================= 미래 캔들 생성 ================= */

function createFutureCandle(prevClose, price, time) {
  const open = prevClose;
  const close = price;

  const high = Math.max(open, close);
  const low = Math.min(open, close);

  return { time, open, high, low, close };
}

function updateFutureCandles() {
  futureCandleSeries.setData(futureCandles);
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

  nextFutureTime = dataCache[dataCache.length - 1].time;

  futurePoints = [];
  futureCandles = [];
  lastGeneratedIndex = 0;

  futureSeries.setData([]);
  futureCandleSeries.setData([]);
});

chartEl.addEventListener("pointerup", () => {
  isPointerDown = false;
});

chartEl.addEventListener("pointerleave", () => {
  isPointerDown = false;
});

chartEl.addEventListener("pointermove", (e) => {
  if (!drawing || !isPointerDown || !dataCache.length || !startPoint) return;

  const rect = chartEl.getBoundingClientRect();

  const currentX = e.clientX - rect.left;
  const currentY = e.clientY - rect.top;

  const dx = currentX - startPoint.x;
  const dy = currentY - startPoint.y;

  const targetBars = Math.floor(dx / PIXELS_PER_BAR);
  if (targetBars <= 0) return;

  const intervalSec = getIntervalSeconds(interval);

  while (lastGeneratedIndex < targetBars) {
    const newTime = nextFutureTime + intervalSec;

    const t = (lastGeneratedIndex + 1) / targetBars;
    const interpY = startPoint.y + dy * t;

    const price = candleSeries.coordinateToPrice(interpY);
    if (price == null) return;

    const prevClose =
      futureCandles.length > 0
        ? futureCandles[futureCandles.length - 1].close
        : dataCache[dataCache.length - 1].close;

    const candle = createFutureCandle(prevClose, price, newTime);

    futureCandles.push(candle);
    futurePoints.push({ time: newTime, value: price });

    nextFutureTime = newTime;
    lastGeneratedIndex++;
  }

  futureSeries.setData(futurePoints);
  updateFutureCandles();
  updateAllMA();
});

/* ================= 기타 ================= */

function createMALegend() {

  const legend = document.getElementById("maLegend");
  legend.innerHTML = "";

  maPeriods.forEach(p => {

    const item = document.createElement("div");
    item.className = "ma-item";

    const colorBox = document.createElement("div");
    colorBox.className = "ma-color";
    colorBox.style.background = maColors[p];

    const label = document.createElement("span");
    label.innerText = `MA ${p}`;

    item.appendChild(colorBox);
    item.appendChild(label);

    // 👉 클릭으로 ON/OFF
    item.style.cursor = "pointer";
    item.onclick = () => {
      maState[p] = !maState[p];
      updateAllMA();
      item.style.opacity = maState[p] ? "1" : "0.3";
    };

    legend.appendChild(item);
  });
}

function getIntervalSeconds(tf) {
  if (tf.endsWith("m")) return parseInt(tf) * 60;
  if (tf.endsWith("h")) return parseInt(tf) * 3600;
  if (tf.endsWith("d")) return parseInt(tf) * 86400;
  return 60;
}

function changeSymbol(s) {
  currentSymbol = s;
  loadData();
}

function changeTF(tf) {
  interval = tf;
  loadData();
}

/* ===== 리사이즈 ===== */

function resizeChart() {
  chart.resize(chartEl.clientWidth, chartEl.clientHeight);
}

window.addEventListener("resize", resizeChart);

/* ================= 시작 ================= */

window.onload = () => {
  resizeChart();
  loadData();
};
