let currentSymbol = "BTCUSDT";
let interval = "1m";

const chart = LightweightCharts.createChart(
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

const candleSeries = chart.addCandlestickSeries();

const maColors={
  7:"#FCD535",
  15:"#FF00FF",
  60:"#00C087",
  100:"#2962FF",
  200:"#FF4D4F"
};

const maSeries={};
const maState={
  7:true,15:true,60:true,100:true,200:true
};

Object.keys(maColors).forEach(p=>{
  maSeries[p]=chart.addLineSeries({
    color:maColors[p],
    lineWidth:p==200?3:2
  });
  document.getElementById("ma"+p+"Btn").classList.add("active");
  document.getElementById("ma"+p+"Btn").style.color=maColors[p];
});

let dataCache=[];
let futurePoints=[];
let drawing=false;

const futureSeries=chart.addLineSeries({
  color:"#AAAAAA",
  lineWidth:2,
  lineStyle:LightweightCharts.LineStyle.Dotted
});

/* MA 계산 */
function calcMA(data, period){
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

/* 데이터 로드 */
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
  const btn=document.getElementById("ma"+period+"Btn");

  if(maState[period]){
    btn.classList.add("active");
  }else{
    btn.classList.remove("active");
  }

  updateAllMA();
}

/* 미래봉 */
function toggleDraw(){
  drawing=!drawing;
}

function clearFuture(){
  futurePoints=[];
  futureSeries.setData([]);
}

function addFuturePoint(param){
  if(!drawing) return;
  if(!param.time || !param.seriesPrices) return;

  const price=param.seriesPrices.get(candleSeries);
  if(!price) return;

  futurePoints.push({
    time:param.time,
    value:price
  });

  futureSeries.setData(futurePoints);
}

chart.subscribeClick(addFuturePoint);

/* 심볼 변경 */
function changeSymbol(symbol){
  currentSymbol=symbol;
  loadData();
}

loadData();
