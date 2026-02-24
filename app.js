/* ================= 기본 설정 ================= */

let currentSymbol = "BTCUSDT";
let interval = "1m";

const chart = LightweightCharts.createChart(
  document.getElementById("chart"),
  {
    layout:{ background:{color:"#0B0E11"}, textColor:"#848E9C"},
    grid:{ vertLines:{color:"#1E2329"}, horzLines:{color:"#1E2329"}},
    rightPriceScale:{ borderColor:"#2B3139"},
    timeScale:{
      timeVisible:true,
      secondsVisible:false,
      rightBarStaysOnScroll:true
    }
  }
);

const candleSeries = chart.addCandlestickSeries();

/* ================= 상태 변수 ================= */

let dataCache = [];

let drawing = false;
let futurePoints = [];
let futureIndex = 1;

/* 미래 라인 */
const futureSeries = chart.addLineSeries({
  color:"#AAAAAA",
  lineWidth:2,
  priceLineVisible:false,
  lastValueVisible:false
});

/* ================= 데이터 로드 ================= */

async function loadData(){
  try{
    const res = await fetch(
      `https://fapi.binance.com/fapi/v1/klines?symbol=${currentSymbol}&interval=${interval}&limit=300`
    );

    const raw = await res.json();

    dataCache = raw.map(d => ({
      time: d[0] / 1000,
      open: +d[1],
      high: +d[2],
      low: +d[3],
      close: +d[4],
    }));

    candleSeries.setData(dataCache);

    /* 오른쪽 여백 확보 (미래 보이게) */
    chart.timeScale().applyOptions({
      rightBarStaysOnScroll:true,
      rightBarOffset:20
    });

    chart.timeScale().fitContent();

  }catch(e){
    console.error("loadData error:", e);
  }
}

/* ================= 버튼 함수 ================= */

function toggleDraw(){
  drawing = !drawing;
  console.log("미래봉 상태:", drawing);
}

function clearFuture(){
  futurePoints = [];
  futureSeries.setData([]);
  futureIndex = 1;
  document.getElementById("futurePercent").innerText = "";
}

/* ================= 클릭 이벤트 ================= */

chart.subscribeClick(param => {

  if(!drawing) return;
  if(!param.point) return;
  if(!dataCache.length) return;

  /* Y좌표 → 가격 변환 */
  const price = candleSeries.coordinateToPrice(param.point.y);
  if(price === null || price === undefined) return;

  const lastBar = dataCache[dataCache.length - 1];

  /* 타임프레임 초 계산 */
  const intervalSec = getIntervalSeconds(interval);

  /* 미래 시간 생성 */
  const newTime = lastBar.time + (intervalSec * futureIndex);

  futurePoints.push({
    time:newTime,
    value:price
  });

  futureSeries.setData(futurePoints);

  futureIndex++;

  updateFuturePercent(price);
});

/* ================= 퍼센트 계산 ================= */

function updateFuturePercent(price){
  if(!dataCache.length) return;

  const lastClose = dataCache[dataCache.length-1].close;
  const diff = ((price-lastClose)/lastClose)*100;

  const el = document.getElementById("futurePercent");
  if(!el) return;

  el.innerText = diff.toFixed(2)+"%";
  el.style.color = diff >= 0 ? "#0ECB81" : "#F6465D";
}

/* ================= 타임프레임 계산 ================= */

function getIntervalSeconds(tf){
  if(tf.endsWith("m")) return parseInt(tf)*60;
  if(tf.endsWith("h")) return parseInt(tf)*3600;
  if(tf.endsWith("d")) return parseInt(tf)*86400;
  return 60;
}

/* ================= 심볼 / TF 변경 ================= */

function changeSymbol(symbol){
  currentSymbol = symbol;
  loadData();
}

function changeTF(tf){
  interval = tf;
  loadData();
}

/* ================= 최초 실행 ================= */

loadData();
