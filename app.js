const KST_OFFSET = 9 * 60 * 60;

let currentSymbol = "BTCUSDT";
let interval = "1m";

const chart = LightweightCharts.createChart(
  document.getElementById("chart"),
  {
    layout: { background: { color: "#0B0E11" }, textColor: "#848E9C" },
    grid: { vertLines: { color: "#1E2329" }, horzLines: { color: "#1E2329" } },
    rightPriceScale: { borderColor: "#2B3139" },
    timeScale: { timeVisible: true, secondsVisible: false },
    crosshair: { mode: 0 },
  }
);

const candleSeries = chart.addCandlestickSeries();

let originalData = [];

/* --------- 고속 MA 계산 --------- */
function calculateMAFast(data, period) {
  const result = [];
  let sum = 0;

  for (let i = 0; i < data.length; i++) {
    sum += data[i].close;

    if (i >= period) {
      sum -= data[i - period].close;
    }

    if (i >= period - 1) {
      result.push({
        time: data[i].time,
        value: sum / period
      });
    }
  }

  return result;
}

/* --------- 헤더 업데이트 --------- */
function updateHeader() {
  const last = originalData.at(-1);
  const first = originalData[0];
  if (!last || !first) return;

  const change = ((last.close - first.close) / first.close) * 100;

  document.getElementById("price").innerText =
    last.close.toFixed(4);

  const changeEl = document.getElementById("change");
  changeEl.innerText = change.toFixed(2) + "%";
  changeEl.style.color = change >= 0 ? "#0ECB81" : "#F6465D";
}

/* --------- Funding Rate --------- */
async function loadFunding() {
  const res = await fetch(
    `https://fapi.binance.com/fapi/v1/premiumIndex?symbol=${currentSymbol}`
  );
  const data = await res.json();

  const rate = parseFloat(data.lastFundingRate) * 100;
  const nextTime = new Date(data.nextFundingTime);

  const el = document.getElementById("funding");
  el.innerText =
    `Funding: ${rate.toFixed(4)}% | Next: ${nextTime.toLocaleTimeString()}`;
  el.style.color = rate >= 0 ? "#F6465D" : "#0ECB81";
}

/* --------- 데이터 --------- */
async function loadData() {
  const res = await fetch(
    `https://fapi.binance.com/fapi/v1/klines?symbol=${currentSymbol}&interval=${interval}&limit=500`
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
  updateHeader();
  loadFunding();
  chart.timeScale().fitContent();
}

/* --------- 인터벌 --------- */
function changeInterval(newInterval, el) {
  interval = newInterval;
  document.querySelectorAll(".tf-btn")
    .forEach(b => b.classList.remove("active"));
  el.classList.add("active");
  loadData();
}

/* --------- 심볼 --------- */
function changeSymbol(symbol) {
  currentSymbol = symbol;
  loadData();
}

loadData();
setInterval(loadFunding, 60000);
