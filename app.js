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

let drawing=false;
let futurePoints=[];
let futureIndex=1;

function toggleDraw(){
  drawing=!drawing;
  console.log("미래봉:", drawing);
}

function clearFuture(){
  futurePoints=[];
  futureSeries.setData([]);
  futureIndex=1;
  document.getElementById("futurePercent").innerText="";
}

chart.subscribeClick(param=>{
  if(!drawing) return;
  if(!param.point) return;
  if(!dataCache.length) return;

  // 🔥 Y좌표 → 가격 변환 (v4 안정 방식)
  const price=candleSeries.coordinateToPrice(param.point.y);
  if(price===null || price===undefined) return;

  const lastBar=dataCache[dataCache.length-1];

  const intervalSec=getIntervalSeconds(interval);

  // 🔥 실제 미래 시간 생성
  const newTime=lastBar.time+(intervalSec*futureIndex);

  futurePoints.push({
    time:newTime,
    value:price
  });

  futureSeries.setData(futurePoints);

  futureIndex++;

  updateFuturePercent(price);
});

/* 타임프레임 초 변환 */
function getIntervalSeconds(tf){
  if(tf.endsWith("m")) return parseInt(tf)*60;
  if(tf.endsWith("h")) return parseInt(tf)*3600;
  if(tf.endsWith("d")) return parseInt(tf)*86400;
  return 60;
}

/* MA 계산 */
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
close:+d[4],
}));

candleSeries.setData(dataCache);
updateAllMA();
chart.timeScale().fitContent();
}

function updateAllMA(){
Object.keys(maSeries).forEach(p=>{
if(maState[p]){
maSeries[p].setData(calcMA(dataCache,Number(p)));
}else{
maSeries[p].setData([]);
}
});
}

function toggleMA(period){
maState[period]=!maState[period];
document.getElementById("ma"+period+"Btn").classList.toggle("active");
updateAllMA();
}

function changeTF(tf){
interval=tf;
document.querySelectorAll("[id^='tf_']").forEach(b=>b.classList.remove("active"));
document.getElementById("tf_"+tf).classList.add("active");
loadData();
}

function toggleDraw(){
drawing=!drawing;
}

function clearFuture(){
futurePoints=[];
futureSeries.setData([]);
document.getElementById("futurePercent").innerText="";
}

function handlePointer(param){
if(!drawing) return;
if(!param.point) return;

const price=candleSeries.coordinateToPrice(param.point.y);
const time=chart.timeScale().coordinateToTime(param.point.x);
if(!price||!time) return;

futurePoints.push({time,value:price});
futureSeries.setData(futurePoints);
updateFuturePercent(price);
}

chart.subscribeClick(handlePointer);

chart.subscribeCrosshairMove(param=>{
if(drawing && param.point){
handlePointer(param);
}
});

function updateFuturePercent(price){
const lastClose=dataCache[dataCache.length-1].close;
const diff=((price-lastClose)/lastClose)*100;
const el=document.getElementById("futurePercent");
el.innerText=diff.toFixed(2)+"%";
el.style.color=diff>=0?"#0ECB81":"#F6465D";
}

function changeSymbol(symbol){
currentSymbol=symbol;
loadData();
}

loadData();


