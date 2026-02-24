const KST_OFFSET = 9 * 60 * 60; // 9시간 (초 단위)

const chart = LightweightCharts.createChart(
  document.getElementById("chart"),
  {
    layout: { background: { color: "#111" }, textColor: "#DDD" },
    grid: { vertLines: { color: "#222" }, horzLines: { color: "#222" } },
    rightPriceScale: { borderColor: "#444" },
    timeScale: {
      borderColor: "#444",
      timeVisible: true,
      secondsVisible: true,

      // 🔥 KST 고정 포맷
      tickMarkFormatter: (time) => {
        const date = new Date((time + KST_OFFSET) * 1000);

        const yyyy = date.getFullYear();
        const MM = String(date.getMonth() + 1).padStart(2, "0");
        const dd = String(date.getDate()).padStart(2, "0");
        const hh = String(date.getHours()).padStart(2, "0");
        const mm = String(date.getMinutes()).padStart(2, "0");
        const ss = String(date.getSeconds()).padStart(2, "0");

        return `${yyyy}-${MM}-${dd} ${hh}:${mm}:${ss}`;
      },
    },
  }
);

const candleSeries = chart.addCandlestickSeries();

const futureSeries = chart.addLineSeries({
  color: "#00bfff",
  lineWidth: 0,
  crosshairMarkerVisible: true,
  crosshairMarkerRadius: 4,
  pointMarkersVisible: true,
});

// ---------------- MA 설정 ----------------
const maConfig = {
  7: { color: "#FFD700", width: 2 },
  15: { color: "#FF8C00", width: 2 },
  60: { color: "#00C853", width: 2 },
  100: { color: "#2979FF", width: 2 },
  200: { color: "#FF1744", width: 4 },
};

let maEnabled = {};
let maSeriesMap = {};

Object.keys(maConfig).forEach(period => {
  maEnabled[period] = false;
  maSeriesMap[period] = chart.addLineSeries({
    color: maConfig[period].color,
    lineWidth: maConfig[period].width,
  });
});

let originalData = [];
let futureData = [];
let interval = "1h";
let drawingMode = false;

const chartElement = document.getElementById("chart");

// ---------- 마우스 → 가격 ----------
function getPriceFromMouse(event) {
  const rect = chartElement.getBoundingClientRect();
  const y = event.clientY - rect.top;
  return candleSeries.coordinateToPrice(y);
}

// ---------- Binance 로드 ----------
async function loadData() {
  const res = await fetch(
    `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=300`
  );
  const data = await res.json();

  originalData = data.map(d => ({
    time: d[0] / 1000, // UTC 그대로 유지
    open: +d[1],
    high: +d[2],
    low: +d[3],
    close: +d[4],
  }));

  candleSeries.setData(originalData);
  futureData = [];
  futureSeries.setData([]);
  updateAllMA();

  chart.timeScale().fitContent();
  chart.timeScale().scrollToRealTime();
}

// ---------- MA 계산 ----------
function calculateMA(data, period) {
  const result = [];
  for (let i = 0; i < data.length; i++) {
    if (i < period - 1) continue;
    let sum = 0;
    for (let j = 0; j < period; j++) {
      sum += data[i - j].close;
    }
    result.push({ time: data[i].time, value: sum / period });
  }
  return result;
}

function updateAllMA() {
  const combined = [
    ...originalData,
    ...futureData.map(d => ({
      time: d.time,
      close: d.value
    }))
  ];

  Object.keys(maConfig).forEach(period => {
    if (maEnabled[period]) {
      maSeriesMap[period].setData(calculateMA(combined, parseInt(period)));
    } else {
      maSeriesMap[period].setData([]);
    }
  });
}

// ---------- 기타 함수 ----------
function toggleMA(period) {
  maEnabled[period] = !maEnabled[period];
  updateAllMA();
}

function toggleDrawing() {
  drawingMode = !drawingMode;
  document.getElementById("drawBtn").innerText =
    drawingMode ? "Draw ON" : "Draw OFF";
}

function getIntervalSeconds() {
  if (interval === "1m") return 60;
  if (interval === "5m") return 300;
  if (interval === "15m") return 900;
  if (interval === "1h") return 3600;
  if (interval === "4h") return 14400;
  if (interval === "1d") return 86400;
}

function createFuturePoint(price) {
  const last = [...originalData, ...futureData].slice(-1)[0];
  const nextTime = last.time + getIntervalSeconds();

  const point = { time: nextTime, value: price };
  futureData.push(point);
  futureSeries.update(point);
  updateAllMA();
}

let isDragging = false;

chartElement.addEventListener("mousedown", e => {
  if (!drawingMode) return;
  isDragging = true;
  createFuturePoint(getPriceFromMouse(e));
});

chartElement.addEventListener("mousemove", e => {
  if (!isDragging || !drawingMode) return;
  createFuturePoint(getPriceFromMouse(e));
});

chartElement.addEventListener("mouseup", () => {
  isDragging = false;
});

function clearFuture() {
  futureData = [];
  futureSeries.setData([]);
  updateAllMA();
}

function changeInterval(newInterval) {
  interval = newInterval;
  loadData();
}

loadData();