const chart = LightweightCharts.createChart(
  document.getElementById("chart"),
  {
    layout: { background: { color: "#111" }, textColor: "#DDD" },
    grid: { vertLines: { color: "#222" }, horzLines: { color: "#222" } },
    rightPriceScale: { borderColor: "#444" },
    timeScale: { borderColor: "#444" },
  }
);

const candleSeries = chart.addCandlestickSeries();
const maSeries = chart.addLineSeries({ color: "orange", lineWidth: 2 });

let originalData = [];
let futureData = [];
let interval = "1h";

let isTouching = false;
let startPrice = null;
let previewCandle = null;

async function loadData() {
  const res = await fetch(
    `https://api.binance.com/api/v3/klines?symbol=BTCUSDT&interval=${interval}&limit=200`
  );
  const data = await res.json();

  originalData = data.map(d => ({
    time: d[0] / 1000,
    open: parseFloat(d[1]),
    high: parseFloat(d[2]),
    low: parseFloat(d[3]),
    close: parseFloat(d[4]),
  }));

  candleSeries.setData(originalData);
  futureData = [];
  updateMA();

  chart.timeScale().fitContent();
  chart.timeScale().scrollToRealTime();
}

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

function updateMA() {
  const combined = [...originalData, ...futureData];
  maSeries.setData(calculateMA(combined, 20));
}

function changeInterval(newInterval) {
  interval = newInterval;
  futureData = [];
  loadData();
}

function getIntervalSeconds() {
  if (interval === "1m") return 60;
  if (interval === "5m") return 300;
  if (interval === "15m") return 900;
  if (interval === "1h") return 3600;
  if (interval === "4h") return 14400;
  if (interval === "1d") return 86400;
}

function createFutureCandle(openPrice, closePrice) {
  const last = [...originalData, ...futureData].slice(-1)[0];
  const nextTime = last.time + getIntervalSeconds();

  const high = Math.max(openPrice, closePrice);
  const low = Math.min(openPrice, closePrice);

  const candle = {
    time: nextTime,
    open: openPrice,
    high: high,
    low: low,
    close: closePrice,
  };

  futureData.push(candle);
  candleSeries.update(candle);
  updateMA();
}

function drawPreviewCandle(openPrice, closePrice) {
  const last = [...originalData, ...futureData].slice(-1)[0];
  const nextTime = last.time + getIntervalSeconds();

  const high = Math.max(openPrice, closePrice);
  const low = Math.min(openPrice, closePrice);

  previewCandle = {
    time: nextTime,
    open: openPrice,
    high: high,
    low: low,
    close: closePrice,
  };

  candleSeries.update(previewCandle);
}

/* ✅ 모바일 터치 이벤트 */

const chartElement = document.getElementById("chart");

chartElement.addEventListener("touchstart", (e) => {
  isTouching = true;

  const rect = chartElement.getBoundingClientRect();
  const y = e.touches[0].clientY - rect.top;
  startPrice = candleSeries.coordinateToPrice(y);
});

chartElement.addEventListener("touchmove", (e) => {
  if (!isTouching) return;

  const rect = chartElement.getBoundingClientRect();
  const y = e.touches[0].clientY - rect.top;
  const currentPrice = candleSeries.coordinateToPrice(y);

  drawPreviewCandle(startPrice, currentPrice);
});

chartElement.addEventListener("touchend", () => {
  if (!isTouching) return;

  isTouching = false;

  if (previewCandle) {
    createFutureCandle(previewCandle.open, previewCandle.close);
    previewCandle = null;
  }
});

loadData();
