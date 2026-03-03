/* ================= 기본 설정 ================= */

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

/* ================= MA ================= */

const maPeriods=[7,15,60,100,200];
const maColors={7:"#FCD535",15:"#FF00FF",60:"#00C087",100:"#2962FF",200:"#FF4D4F"};
const maSeries={};
const maState={7:true,15:true,60:true,100:true,200:true};

maPeriods.forEach(p=>{
  maSeries[p]=chart.addLineSeries({
    color:maColors[p],
    lineWidth:2,
    priceLineVisible:false,
    lastValueVisible:false
  });
});

/* ================= 미래봉 ================= */

let futurePoints=[];
let drawing=false;
let nextFutureTime=null;

const futureSeries=chart.addLineSeries({
  color:"#AAAAAA",
  lineWidth:2,
  lineStyle:LightweightCharts.LineStyle.Dotted,
  priceLineVisible:false,
  lastValueVisible:false
});

function toggleDraw(){

  drawing=!drawing;

  const btn=document.getElementById("futureBtn");

  if(drawing){
    btn.innerText="미래봉 ON";
    btn.classList.add("active");

    nextFutureTime=dataCache[dataCache.length-1].time;
    futurePoints=[];
    futureSeries.setData([]);

  }else{
    btn.innerText="미래봉 OFF";
    btn.classList.remove("active");
  }
}

/* ================= 데이터 ================= */

let dataCache=[];

async function loadData(){

  const res=await fetch(
    `https://fapi.binance.com/fapi/v1/klines?symbol=${currentSymbol}&interval=${interval}&limit=500`
  );

  const raw=await res.json();

  dataCache=raw.map(d=>({
    time:d[0]/1000,
    open:+d[1],
    high:+d[2],
    low:+d[3],
    close:+d[4]
  }));

  candleSeries.setData(dataCache);
  updateAllMA();
  chart.timeScale().fitContent();
}

/* ================= MA 계산 ================= */

function calcMA(data,period){
  let result=[];
  let sum=0;

  for(let i=0;i<data.length;i++){
    sum+=data[i].close;
    if(i>=period) sum-=data[i-period].close;

    if(i>=period-1){
      result.push({time:data[i].time,value:sum/period});
    }
  }
  return result;
}

function updateAllMA(){

  const combined=[...dataCache];

  futurePoints.forEach(p=>{
    combined.push({
      time:p.time,
      open:p.value,
      high:p.value,
      low:p.value,
      close:p.value
    });
  });

  maPeriods.forEach(p=>{
    if(maState[p]){
      maSeries[p].setData(calcMA(combined,p));
    }else{
      maSeries[p].setData([]);
    }
  });
}

function toggleMA(p){
  maState[p]=!maState[p];
  updateAllMA();
}

/* ================= 터치 미래봉 ================= */

const chartEl=document.getElementById("chart");

chartEl.addEventListener("touchmove",function(e){

  if(!drawing) return;
  if(!dataCache.length) return;

  e.preventDefault();

  const rect=chartEl.getBoundingClientRect();
  const y=e.touches[0].clientY-rect.top;

  const price=candleSeries.coordinateToPrice(y);
  if(price==null) return;

  const intervalSec=getIntervalSeconds(interval);

  const newTime=nextFutureTime+intervalSec;

  if(futurePoints.length>0 &&
     futurePoints[futurePoints.length-1].time===newTime){
       return;
  }

  futurePoints.push({
    time:newTime,
    value:price
  });

  nextFutureTime=newTime;

  futureSeries.setData(futurePoints);
  updateAllMA();

},{passive:false});

/* ================= 기타 ================= */

function getIntervalSeconds(tf){
  if(tf.endsWith("m")) return parseInt(tf)*60;
  if(tf.endsWith("h")) return parseInt(tf)*3600;
  if(tf.endsWith("d")) return parseInt(tf)*86400;
  return 60;
}

function changeSymbol(s){
  currentSymbol=s;
  loadData();
}

function changeTF(tf){
  interval=tf;
  loadData();
}

window.onload=()=>{
  loadData();
};
