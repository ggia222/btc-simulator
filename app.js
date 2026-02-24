const KST_OFFSET = 9 * 60 * 60;

let currentSymbol = "BTCUSDT";
let interval = "1m";

const chart = LightweightCharts.createChart(
  document.getElementById("chart"),
  {
    layout: { background: { color: "#0B0E11" }, textColor: "#848E9C" },
    grid: { vertLines: { color: "#1E2329" }, horzLines: { color: "#1E2329" } },
    rightPriceScale: { borderColor: "#2B3139" },
    timeScale: {
      borderColor: "#2B3139",
      timeVisible: true,
      secondsVisible: false,
      tickMarkFormatter: (time) => {
        const d = new Date((time + KST_OFFSET) * 1000);
        const MM = String(d.getMonth() + 1).padStart(2, "0");
        const dd = String(d.getDate()).padStart(2, "0");
        const hh = String(d.getHours()).padStart(2, "0");
        const mm = String(d.getMinutes()).padStart(2, "0");
        return `${MM}-${dd} ${hh}:${mm}`;
      },
    },
  }
);

const candleSeries = chart.addCandlestickSeries();

let originalData = [];

/* 심볼 변경 */
function changeSymbol(symbol) {
  currentSymbol = symbol;
  loadData();
}

/* 인터벌 변경 */
function changeInterval(newInterval, el) {
  interval = newInterval;
  document.querySelectorAll(".tf-btn")
    .forEach(b => b.classList.remove("active"));
  el.classList.add("active");
  loadData();
}

/* 헤더 업데이트 */
function updateHeader() {
  const last = originalData.slice(-1)[0];
  const first = originalData[0];
  if (!last || !first) return;

  const change = ((last.close - first.close) / first.close) * 100;

  document.getElementById("price").innerText = last.close.toFixed(4);
  const changeEl = document.getElementById("change");
  changeEl.innerText = change.toFixed(2) + "%";
  changeEl.style.color = change >= 0 ? "#0ECB81" : "#F6465D";
}

/* 데이터 로드 (Futures API) */
async function loadData() {
  const res = await fetch(
    `https://fapi.binance.com/fapi/v1/klines?symbol=${currentSymbol}&interval=${interval}&limit=300`
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

  chart.timeScale().fitContent();
}

loadData();
