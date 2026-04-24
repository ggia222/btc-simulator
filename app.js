/* ================= 기본 설정 ================= */

let currentSymbol = "BTCUSDT";
let interval = "1m";

let chart;
let chartEl;
let candleSeries;
let futureCandleSeries;
let futureSeries;

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

/* ================= 상태 ================= */

let dataCache = [];

let futurePoints = [];
let futureCandles = [];

let drawing = false;
let nextFutureTime = null;

/* ===== 드래그 ===== */

let isPointerDown = false;
let startPoint = null;
let lastGeneratedIndex = 0;
const PIXELS_PER_BAR = 12;

/* ================= INIT ================= */

function init() {

  chartEl = document.getElementById("chart");

  chart = LightweightCharts.createChart(chartEl, {
    layout: { background: { color: "#0B0E11" }, textColor: "#848E9C" },
    grid: { vertLines: { color: "#1E2329" }, horzLines: { color: "#1E2329" } },
    rightPriceScale: { borderColor: "#2B3139" },
    timeScale: { timeVisible: true },
    handleScroll: { mouseWheel: true, pressedMouseMove: true },
    handleScale: { mouseWheel: true, pinch: true },
  });

  candleSeries = chart.addCandlestickSeries();

  futureCandleSeries = chart.addCandlestickSeries({
    upColor: "rgba(38,166,154,0.5)",
    downColor: "rgba(239,83,80,0.5)",
    borderVisible: true,
    borderUpColor: "#FFD700",
    borderDownColor: "#FFD700",
    wickUpColor: "#FFD700",
    wickDownColor: "#FFD700",
  });

  futureSeries = chart.addLineSeries({
    color: "#AAAAAA",
    lineWidth: 2,
    lineStyle: LightweightCharts.LineStyle.Dotted,
  });

  // MA 생성
  maPeriods.forEach((p) => {
    maSeries[p] = chart.addLineSeries({
      color: maColors[p],
      lineWidth: 2,
      priceLineVisible: false,
      lastValueVisible: false,
    });
  });

  bindEvents();
  resizeChart();
  loadData();
  createMALegend();
}

/* ================= 이벤트 ================= */

function bindEvents() {

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

    const dx = (e.clientX - rect.left) - startPoint.x;
    const dy = (e.clientY - rect.top) - startPoint.y;

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

      const candle = {
        time: newTime,
        open: prevClose,
        high: Math.max(prevClose, price),
        low: Math.min(prevClose, price),
        close: price,
      };

      futureCandles.push(candle);
      futurePoints.push({ time: newTime, value: price });

      nextFutureTime = newTime;
      lastGeneratedIndex++;
    }

    futureSeries.setData(futurePoints);
    futureCandleSeries.setData(futureCandles);
    updateAllMA();
  });
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
  updateAllMA();
  chart.timeScale().fitContent();
}

/* ================= EMA ================= */

function calcMA(data, period) {
  let result = [];
  let sum = 0;

  for (let i = 0; i < data.length; i++) {
    sum += data[i].close;

    if (i >= period) {
      sum -= data[i - period].close;
    }

    if (i >= period - 1) {
      result.push({
        time: data[i].time,
        value: sum / period,
      });
    }
  }

  return result;
}

/* ================= MA ================= */

function updateAllMA() {
  const combined = [...dataCache, ...futureCandles];

  maPeriods.forEach((p) => {
    maSeries[p].setData(maState[p] ? calcMA(combined, p) : []);
  });
}

/* ================= 버튼 ================= */

function toggleDraw() {
  drawing = !drawing;

  const btn = document.getElementById("futureBtn");

  if (drawing) {
    btn.innerText = "미래봉 ON";
    btn.classList.add("active");
  } else {
    btn.innerText = "미래봉 OFF";
    btn.classList.remove("active");
  }
}

function clearFuture() {
  futurePoints = [];
  futureCandles = [];
  futureSeries.setData([]);
  futureCandleSeries.setData([]);
  updateAllMA();
}

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

function resizeChart() {
  if (!chartEl || !chart) return;
  chart.resize(chartEl.clientWidth, chartEl.clientHeight);
}

window.addEventListener("resize", resizeChart);

/* ================= 시작 ================= */

window.addEventListener("DOMContentLoaded", init);
