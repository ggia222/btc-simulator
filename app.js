let currentSymbol="BTCUSDT";
let interval="1m";

/* ================= 차트 생성 ================= */

const chart=LightweightCharts.createChart(
document.getElementById("chart"),
{
layout:{background:{color:"#0B0E11"},textColor:"#848E9C"},
grid:{vertLines:{color:"#1E2329"},horzLines:{color:"#1E2329"}},
rightPriceScale:{borderColor:"#2B3139"},
handleScroll:true,
handleScale:true,
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
document.getElementById("ma"+p+"Btn").classList.add("active");
document.getElementById("ma"+p+"Btn").style.color=maColors[p];
});

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
close:+d[4],
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

/* ================= TimeFrame ================= */

function changeTF(tf){
interval=tf;
document.querySelectorAll("[id^='tf_']").forEach(b=>b.classList.remove("active"));
document.getElementById("tf_"+tf).classList.add("active");
loadData();
}

/* ================= 미래봉 ================= */

let drawing=false;
let futurePoints=[];

const futureSeries=chart.addLineSeries({
color:"#AAAAAA",
lineWidth:2,
priceLineVisible:false,
lastValueVisible:false
});

function toggleDraw(){
drawing=!drawing;
const btn=document.getElementById("drawBtn");
if(drawing){
btn.innerText="미래봉 ON";
btn.classList.add("active");
}else{
btn.innerText="미래봉 OFF";
btn.classList.remove("active");
}
}

function clearFuture(){
futurePoints=[];
futureSeries.setData([]);
document.getElementById("futurePercent").innerText="";
}

/* 🔥 안정적인 가격/시간 추출 방식 */
function handleDraw(param){
if(!drawing) return;
if(!param.seriesPrices) return;

const price=param.seriesPrices.get(candleSeries);
if(price===undefined) return;

const time=param.time;
if(!time) return;

futurePoints.push({time,value:price});
futureSeries.setData(futurePoints);

updateFuturePercent(price);
}

/* PC 클릭 */
chart.subscribeClick(handleDraw);

/* 모바일 터치 + 드래그 */
chart.subscribeCrosshairMove(param=>{
if(drawing && param.seriesPrices){
handleDraw(param);
}
});

/* ================= 퍼센트 표시 ================= */

function updateFuturePercent(price){
const lastClose=dataCache[dataCache.length-1].close;
const diff=((price-lastClose)/lastClose)*100;

const el=document.getElementById("futurePercent");
el.innerText=diff.toFixed(2)+"%";
el.style.color=diff>=0?"#0ECB81":"#F6465D";
}

/* ================= 심볼 ================= */

function changeSymbol(symbol){
currentSymbol=symbol;
loadData();
}

loadData();
