/* ================= 모바일 감지 ================= */

function isMobile(){
  return /Mobi|Android|iPhone/i.test(navigator.userAgent);
}

const isMobileDevice = isMobile();

/* ================= 차트 생성 ================= */

let currentSymbol="BTCUSDT";
let interval="1m";

const chart = LightweightCharts.createChart(
document.getElementById("chart"),
{
layout:{background:{color:"#0B0E11"},textColor:"#848E9C"},
grid:{vertLines:{color:"#1E2329"},horzLines:{color:"#1E2329"}},
rightPriceScale:{borderColor:"#2B3139"},
timeScale:{
  timeVisible:true,
  rightBarStaysOnScroll:true
}
}
);

const candleSeries = chart.addCandlestickSeries();

/* ================= MA ================= */

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
});

/* ================= 상태 ================= */

let dataCache=[];
let drawing=false;
let futurePoints=[];
let futureIndex=1;

/* 미래 점 시리즈 */
const futureSeries = chart.addLineSeries({
  color:"#AAAAAA",
  lineWidth:2,
  lineStyle:LightweightCharts.LineStyle.Dotted,
  priceLineVisible:false,
  lastValueVisible:false
});

/* ================= 데이터 ================= */

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

chart.timeScale().applyOptions({rightBarOffset:20});
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
result.push({
time:data[i].time,
value:sum/period
});
}
}
return result;
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
updateAllMA();
}

/* ================= 미래봉 수정판 ================= */

let drawing=false;
let futurePoints=[];
let lastFutureTime=null;
let isDragging=false;

function toggleDraw(){

if(!isMobileDevice){
alert("모바일에서만 사용 가능합니다.");
return;
}

drawing=!drawing;

const btn=document.getElementById("futureBtn");

if(drawing){
btn.classList.add("active");
btn.innerText="미래봉 ON";
}else{
btn.classList.remove("active");
btn.innerText="미래봉 OFF";
}

futurePoints=[];
futureSeries.setData([]);
lastFutureTime=null;
}

/* 드래그 시작 */
chart.subscribeCrosshairMove(param=>{

if(!drawing) return;
if(!param.point) return;
if(!dataCache.length) return;

const price=candleSeries.coordinateToPrice(param.point.y);
if(price==null) return;

const intervalSec=getIntervalSeconds(interval);

/* 🔥 첫 미래봉이면 */
if(lastFutureTime===null){
lastFutureTime=dataCache[dataCache.length-1].time + intervalSec;
}else{
/* 🔥 그 다음 봉 */
lastFutureTime += intervalSec;
}

/* 🔥 중복 방지 */
if(futurePoints.length>0){
const last=futurePoints[futurePoints.length-1];
if(last.time===lastFutureTime) return;
}

futurePoints.push({
time:lastFutureTime,
value:price
});

futureSeries.setData(futurePoints);

updateFuturePercent(price);
});

/* ================= 퍼센트 ================= */

function updateFuturePercent(price){
const lastClose=dataCache[dataCache.length-1].close;
const diff=((price-lastClose)/lastClose)*100;

const el=document.getElementById("futurePercent");
el.innerText=diff.toFixed(2)+"%";
el.style.color=diff>=0?"#0ECB81":"#F6465D";
}

/* ================= 유틸 ================= */

function getIntervalSeconds(tf){
if(tf.endsWith("m")) return parseInt(tf)*60;
if(tf.endsWith("h")) return parseInt(tf)*3600;
if(tf.endsWith("d")) return parseInt(tf)*86400;
return 60;
}

function changeSymbol(symbol){
currentSymbol=symbol;
loadData();
}

function changeTF(tf){
interval=tf;
loadData();
}

/* ================= 초기 실행 ================= */

window.onload=function(){
const btn=document.getElementById("futureBtn");

if(!isMobileDevice){
btn.disabled=true;
btn.style.opacity=0.4;
btn.innerText="모바일 전용";
}

loadData();
};

