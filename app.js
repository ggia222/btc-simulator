const KST_OFFSET = 9 * 60 * 60;

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

let originalData = [];
let futureData = [];
let interval = "1h";
let drawingMode = false;

const chartElement = document.getElementById("chart");

// ---------- 가격 변환 ----------
function getPriceFromClientY(clientY) {
  const rect = chartElement.getBoundingClientRect();
  const y = clientY - rect.top;
  return candleSeries.coordinateToPrice(y);
}

// ---------- 미래 점 ----------
function getIntervalSeconds() {
  if (interval === "1m") return 60;
  if (interval === "5m") return 300;
  if (interval === "15m") return 900;
  if (interval === "1h") return 3600;
  if (interval === "4h") return 14400;
  if (interval === "1d") return 86400;
}

function createFuturePoint(price) {
  if (!price) return;

  const last = [...originalData, ...futureData].slice(-1)[0];
  const nextTime = last.time + getIntervalSeconds();

  const point = { time: nextTime, value: price };
  futureData.push(point);
  futureSeries.update(point);
}

// ---------- 데이터 로드 ----------
async function loadData() {
  const res = await fetch(
    `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=300`
  );
  const data = await res.json();

  originalData = data.map(d => ({
    time: d[0] / 1000,
    open: +d[1],
    high: +d[2],
    low: +d[3],
    close: +d[4],
  }));

  candleSeries.setData(originalData);
  futureData = [];
  futureSeries.setData([]);

  chart.timeScale().fitContent();
  chart.timeScale().scrollToRealTime();
}

function toggleDrawing() {
  drawingMode = !drawingMode;
  document.getElementById("drawBtn").innerText =
    drawingMode ? "Draw ON" : "Draw OFF";
}

function clearFuture() {
  futureData = [];
  futureSeries.setData([]);
}

function changeInterval(newInterval) {
  interval = newInterval;
  loadData();
}

// ============================
// 🖥 PC 마우스 지원
// ============================

let isDrawing = false;

chartElement.addEventListener("mousedown", (e) => {
  if (!drawingMode) return;
  isDrawing = true;
  createFuturePoint(getPriceFromClientY(e.clientY));
});

chartElement.addEventListener("mousemove", (e) => {
  if (!isDrawing || !drawingMode) return;
  createFuturePoint(getPriceFromClientY(e.clientY));
});

chartElement.addEventListener("mouseup", () => {
  isDrawing = false;
});

// ============================
// 📱 모바일 터치 지원
// ============================

chartElement.addEventListener("touchstart", (e) => {
  if (!drawingMode) return;

  // 두 손가락이면 확대 허용
  if (e.touches.length > 1) return;

  isDrawing = true;
  const touch = e.touches[0];
  createFuturePoint(getPriceFromClientY(touch.clientY));
});

chartElement.addEventListener("touchmove", (e) => {
  if (!isDrawing || !drawingMode) return;
  if (e.touches.length > 1) return;

  e.preventDefault(); // 스크롤 방지

  const touch = e.touches[0];
  createFuturePoint(getPriceFromClientY(touch.clientY));
}, { passive: false });

chartElement.addEventListener("touchend", () => {
  isDrawing = false;
});

loadData();
