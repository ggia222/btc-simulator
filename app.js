/* ================= 모바일 감지 ================= */

function isMobile(){
  return /Mobi|Android|iPhone/i.test(navigator.userAgent);
}

let isMobileDevice = isMobile();

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
      rightBarStaysOnScroll:true
    }
  }
);

const candleSeries = chart.addCandlestickSeries();

/* ================= 상태 ================= */

let dataCache = [];
let drawing = false;
let futurePoints = [];
let futureIndex = 1;

const futureSeries = chart.addLineSeries({
  color:"#AAAAAA",
  lineWidth:2,
  priceLineVisible:false,
  lastValueVisible:false
});

/* ================= 데이터 로드 ================= */

async function loadData(){
  const res = await fetch(
    `https://fapi.binance.com/fapi/v1/klines?symbol=${currentSymbol}&interval=${interval}&limit=300`
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

  chart.timeScale().applyOptions({
    rightBarOffset:20
  });

  chart.timeScale().fitContent();
}

/* ================= 미래봉 ================= */

function toggleDraw(){

  if(!isMobileDevice){
    alert("미래봉 기능은 모바일에서만 사용 가능합니다.");
    return;
  }

  drawing = !drawing;

  const btn = document.getElementById("futureBtn");

  if(drawing){
    btn.classList.add("active");
    btn.innerText = "미래봉 ON";
  }else{
    btn.classList.remove("active");
    btn.innerText = "미래봉 OFF";
  }

  console.log("미래봉 상태:", drawing);
}

function clearFuture(){
  futurePoints = [];
  futureSeries.setData([]);
  futureIndex = 1;
  document.getElementById("futurePercent").innerText="";
}

/* ================= 클릭 이벤트 ================= */

chart.subscribeClick(param=>{

  if(!drawing) return;
  if(!param.point) return;
  if(!dataCache.length) return;

  const price = candleSeries.coordinateToPrice(param.point.y);
  if(price == null) return;

  const lastBar = dataCache[dataCache.length-1];
  const intervalSec = getIntervalSeconds(interval);
  const newTime = lastBar.time + (intervalSec * futureIndex);

  futurePoints.push({
    time:newTime,
    value:price
  });

  futureSeries.setData(futurePoints);
  futureIndex++;

  updateFuturePercent(price);
});

/* ================= 퍼센트 ================= */

function updateFuturePercent(price){
  const lastClose = dataCache[dataCache.length-1].close;
  const diff = ((price-lastClose)/lastClose)*100;

  const el = document.getElementById("futurePercent");
  el.innerText = diff.toFixed(2)+"%";
  el.style.color = diff>=0 ? "#0ECB81" : "#F6465D";
}

/* ================= 타임프레임 계산 ================= */

function getIntervalSeconds(tf){
  if(tf.endsWith("m")) return parseInt(tf)*60;
  if(tf.endsWith("h")) return parseInt(tf)*3600;
  if(tf.endsWith("d")) return parseInt(tf)*86400;
  return 60;
}

/* ================= 변경 ================= */

function changeSymbol(symbol){
  currentSymbol = symbol;
  loadData();
}

function changeTF(tf){
  interval = tf;
  loadData();
}

/* ================= 초기 설정 ================= */

window.onload = function(){

  const btn = document.getElementById("futureBtn");

  if(!isMobileDevice){
    btn.disabled = true;
    btn.style.opacity = 0.4;
    btn.innerText = "모바일 전용";
  }

  loadData();
};
