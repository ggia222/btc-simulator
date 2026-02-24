let currentSymbol = "BTCUSDT";
let interval = "1m";

const chart = LightweightCharts.createChart(
  document.getElementById("chart"),
  {
    layout:{ background:{color:"#0B0E11"}, textColor:"#848E9C"},
    grid:{ vertLines:{color:"#1E2329"}, horzLines:{color:"#1E2329"}},
    rightPriceScale:{ borderColor:"#2B3139"},
    timeScale:{ timeVisible:true }
  }
);

const candleSeries = chart.addCandlestickSeries();

let dataCache = [];

/* 미래봉 */
let drawing = false;
let futurePoints = [];
let futureIndex = 1;

const futureSeries = chart.addLineSeries({
  color:"#AAAAAA",
  lineWidth:2,
});

/* 데이터 로드 */
async function loadData(){
  const res = await fetch(
    `https://fapi.binance.com/fapi/v1/klines?symbol=${currentSymbol}&interval=${interval}&limit=200`
  );
  const raw = await res.json();

  dataCache = raw.map(d => ({
    time: d[0]/1000,
    open:+d[1],
    high:+d[2],
    low:+d[3],
    close:+d[4],
  }));

  candleSeries.setData(dataCache);
  chart.timeScale().fitContent();
}

function toggleDraw(){
  drawing = !drawing;
  console.log("미래봉:", drawing);
}

function clearFuture(){
  futurePoints = [];
  futureSeries.setData([]);
  futureIndex = 1;
}

/* 클릭 시 미래 생성 */
chart.subscribeClick(param=>{
  if(!drawing) return;
  if(!param.point) return;
  if(!dataCache.length) return;

  const price = candleSeries.coordinateToPrice(param.point.y);
  if(price == null) return;

  const lastBar = dataCache[dataCache.length-1];
  const newTime = lastBar.time + (60 * futureIndex);

  futurePoints.push({
    time:newTime,
    value:price
  });

  futureSeries.setData(futurePoints);
  futureIndex++;
});

loadData();
