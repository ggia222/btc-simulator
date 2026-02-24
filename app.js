let currentSymbol="BTCUSDT";
let interval="1m";

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

let dataCache=[];
let drawing=false;
let futurePoints=[];

const futureSeries=chart.addLineSeries({
color:"#AAAAAA",
lineWidth:2,
priceLineVisible:false,
lastValueVisible:false
});

/* ===== 미래봉 버튼 확실하게 작동 ===== */
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

/* ===== 미래봉 삭제 ===== */
function clearFuture(){
futurePoints=[];
futureSeries.setData([]);
document.getElementById("futurePercent").innerText="";
}

/* ===== 미래봉 생성 ===== */
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

/* PC 클릭 */
chart.subscribeClick(handlePointer);

/* 모바일 드래그 */
chart.subscribeCrosshairMove(param=>{
if(drawing && param.point){
handlePointer(param);
}
});

/* ===== 퍼센트 표시 ===== */
function updateFuturePercent(price){
const lastClose=dataCache[dataCache.length-1].close;
const diff=((price-lastClose)/lastClose)*100;
const el=document.getElementById("futurePercent");
el.innerText=diff.toFixed(2)+"%";
el.style.color=diff>=0?"#0ECB81":"#F6465D";
}

/* ===== 데이터 로드 ===== */
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
chart.timeScale().fitContent();
}

function changeTF(tf){
interval=tf;
document.querySelectorAll("[id^='tf_']").forEach(b=>b.classList.remove("active"));
document.getElementById("tf_"+tf).classList.add("active");
loadData();
}

function changeSymbol(symbol){
currentSymbol=symbol;
loadData();
}

loadData();
