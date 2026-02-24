let currentSymbol="BTCUSDT";
let interval="1m";

const chart=LightweightCharts.createChart(
document.getElementById("chart"),
{
layout:{background:{color:"#0B0E11"},textColor:"#848E9C"},
grid:{vertLines:{color:"#1E2329"},horzLines:{color:"#1E2329"}},
rightPriceScale:{borderColor:"#2B3139"},
timeScale:{
  timeVisible:true,
  secondsVisible:false,
  tickMarkFormatter:(time)=>{
    const d=new Date(time*1000);
    return d.toLocaleString("ko-KR",{timeZone:"Asia/Seoul"});
  }
}
}
);

const candleSeries=chart.addCandlestickSeries();

const maColors={
7:"#FCD535",
15:"#FF00FF",
60:"#00C087",
100:"#2962FF",
200:"#FF4D4F"
};

const maSeries={};
const maState={7:true,15:true,60:true,100:true,200:true};

Object.keys(maColors).forEach(p=>{
maSeries[p]=chart.addLineSeries({
  color:maColors[p],
  lineWidth:p==200?3:2,
  priceLineVisible:false,
  lastValueVisible:false
});
document.getElementById("ma"+p+"Btn").classList.add("active");
document.getElementById("ma"+p+"Btn").style.color=maColors[p];
});

let dataCache=[];
/* ================= 미래봉 완전 안정판 ================= */

let drawing = false;
let futurePoints = [];

const futureSeries = chart.addLineSeries({
  color: "#AAAAAA",
  lineWidth: 2,
  priceLineVisible: false,
  lastValueVisible: false
});

function toggleDraw(){
  drawing = !drawing;
}

function clearFuture(){
  futurePoints = [];
  futureSeries.setData([]);
  const el = document.getElementById("futurePercent");
  if(el) el.innerText = "";
}

/* 클릭으로만 생성 (가장 안정적 방식) */
chart.subscribeClick(param => {

  if(!drawing) return;
  if(!param.time) return;
  if(!param.seriesPrices) return;

  const price = param.seriesPrices.get(candleSeries);
  if(price === undefined) return;

  futurePoints.push({
    time: param.time,
    value: price
  });

  futureSeries.setData(futurePoints);
  updateFuturePercent(price);
});

function updateFuturePercent(price){
  if(!dataCache.length) return;

  const lastClose = dataCache[dataCache.length-1].close;
  const diff = ((price-lastClose)/lastClose)*100;

  const el = document.getElementById("futurePercent");
  if(!el) return;

  el.innerText = diff.toFixed(2) + "%";
  el.style.color = diff>=0 ? "#0ECB81" : "#F6465D";
}

function changeSymbol(symbol){
currentSymbol=symbol;
loadData();
}

loadData();

