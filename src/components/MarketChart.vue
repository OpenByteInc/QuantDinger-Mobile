<template>
  <div class="market-chart-shell" :style="{height: `${height}px`}">
    <div ref="container" class="market-chart" :aria-label="$t('indicator_chart.chart_label')" />
    <div v-if="legendItems.length" class="indicator-legend" aria-hidden="true">
      <span v-for="item in legendItems" :key="item.key"><i :style="{backgroundColor:item.color}"/>{{ item.title }}</span>
    </div>
    <div v-for="position in tablePositions" :key="position" class="indicator-table-stack" :class="`indicator-table-stack--${position}`">
      <section v-for="table in tablesAt(position)" :key="table.id" class="indicator-table-card">
        <strong v-if="table.title">{{ table.title }}</strong>
        <div class="indicator-table-scroll">
          <table>
            <thead v-if="table.columns.length"><tr><th v-for="(cell,index) in table.columns" :key="index" :style="tableCellStyle(cell)">{{ cell.text }}</th></tr></thead>
            <tbody><tr v-for="(row,rowIndex) in table.rows" :key="rowIndex"><td v-for="(cell,cellIndex) in row" :key="cellIndex" :style="tableCellStyle(cell)">{{ cell.text }}</td></tr></tbody>
          </table>
        </div>
      </section>
    </div>
  </div>
</template>
<script setup>
import { computed, onMounted, onActivated, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { init, dispose, registerIndicator, registerOverlay } from 'klinecharts'
import { createPlotRenderer } from '@/utils/pcPlotRenderer'
import { toCandles, signalPoints, toTimestamp } from '@/utils/chartData'
import { assignIndicatorSignalLanes, normalizeIndicatorLabelAnchor, normalizeIndicatorLabelFontSize, normalizeIndicatorOutput, resolveIndicatorLabelTextColor, resolveIndicatorPlotTitle } from '@/utils/indicatorOutputProtocol'
import { captureChartViewport, restoreChartViewport } from '@/utils/chartViewport'
import { buildPriceChartData, klineCandleType, normalizePriceChartType, usesDerivedPriceBars } from '@/utils/priceChartTypes'
import { useSettingsStore } from '@/stores'
const props=defineProps({data:{type:Object,default:null},main:{type:String,default:'EMA'},lower:{type:String,default:''},chartType:{type:String,default:'candle_solid'},expanded:Boolean})
const {locale}=useI18n();const settingsStore=useSettingsStore();const container=ref(null);const theme=computed(()=>settingsStore.theme)
const renderer=createPlotRenderer(theme);let chart;let observer;let overlays=[];let customPanes=[];let renderVersion=0;let priceFrame=0
const normalizedOutput=computed(()=>normalizeIndicatorOutput(props.data,toCandles(props.data?.candles||[])))
const height=computed(()=>props.expanded?Math.max(500,window.innerHeight-180):306+(props.lower?84:0)+(normalizedOutput.value.plots.some(p=>p.overlay===false)?110:0))
const tablePositions=['top-left','top-right','bottom-left','bottom-right']
const tablesAt=position=>normalizedOutput.value.tables.filter(table=>table.position===position)
const tableCellStyle=cell=>({color:cell.color||undefined,backgroundColor:cell.backgroundColor||undefined,textAlign:['left','center','right'].includes(cell.align)?cell.align:undefined})
const legendItems=computed(()=>{
 const seen=new Set(),items=[]
 normalizedOutput.value.plots.forEach((plot,index)=>{
  const title=resolveIndicatorPlotTitle(plot,'')
  if(!title||seen.has(title))return
  seen.add(title);items.push({key:`${title}-${index}`,title,color:plot.color||'#e5a100'})
 })
 return items.slice(0,6)
})
const withAlpha=(color,alpha)=>{const value=String(color||'').trim();if(/^#[0-9a-f]{6}$/i.test(value)){const rgb=value.slice(1).match(/.{2}/g).map(hex=>parseInt(hex,16));return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`}return value||`rgba(229, 161, 0, ${alpha})`}
const layerColor=(color,fallback,alpha)=>{const value=String(color||'').trim(),safeAlpha=Math.max(.01,Math.min(.65,Number(alpha)||.08));if(/^#[0-9a-f]{6}$/i.test(value))return withAlpha(value,safeAlpha);const rgba=value.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);if(rgba){const sourceAlpha=rgba[4]==null?1:Number(rgba[4]);return `rgba(${rgba[1]}, ${rgba[2]}, ${rgba[3]}, ${Math.min(Number.isFinite(sourceAlpha)?sourceAlpha:1,safeAlpha)})`}return withAlpha(fallback,safeAlpha)}
const textWidth=(text,size,min=38,max=150)=>Math.max(min,Math.min(max,String(text||'').length*Number(size||10)*.62+18))
registerOverlay({name:'mobileSignal',totalStep:1,needDefaultPointFigure:false,needDefaultXAxisFigure:false,needDefaultYAxisFigure:false,createPointFigures:({coordinates,overlay})=>{
  const c=coordinates[0];if(!c)return [];const d=overlay.extendData||{},text=String(d.text||'');if(!text)return [];const color=d.color||'#e5a100',size=normalizeIndicatorLabelFontSize(d.fontSize),width=textWidth(text,size),height=size+9,anchor=normalizeIndicatorLabelAnchor(d.anchor||d.side),lane=Math.max(0,Math.min(7,Number(d.lane)||0)),laneShift=lane*(height+4),right=anchor==='right',above=anchor==='above',center=anchor==='center',x=right?c.x+8:c.x-width/2,y=center?c.y-height/2:c.y+(above?-height-7-laneShift:7+laneShift),isDark=theme.value==='dark';return [{type:'rect',attrs:{x,y,width,height,r:5},styles:{style:'stroke_fill',color:d.fillColor?withAlpha(d.fillColor,.2):(isDark?'rgba(14,18,25,.78)':'rgba(255,255,255,.84)'),borderColor:d.borderColor||withAlpha(color,.48),borderSize:1},ignoreEvent:true},{type:'text',attrs:{x:x+width/2,y:y+height/2,text,align:'center',baseline:'middle'},styles:{color:resolveIndicatorLabelTextColor(d.textColor||color,isDark),size,weight:'700',backgroundColor:'transparent'},ignoreEvent:true}]
}})
registerOverlay({name:'mobileZone',totalStep:2,needDefaultPointFigure:false,needDefaultXAxisFigure:false,needDefaultYAxisFigure:false,createPointFigures:({coordinates,overlay,bounding})=>{
  if(coordinates.length<2)return [];const [a,b]=coordinates,d=overlay.extendData||{},color=d.color||'#e5a100',left=Number(bounding?.left||0),boundRight=left+Number(bounding?.width||0),x=Math.max(left,Math.min(a.x,b.x)),right=d.extendRight&&Number.isFinite(boundRight)&&boundRight>left?boundRight:Math.max(a.x,b.x),y=Math.min(a.y,b.y),bottom=Math.max(a.y,b.y),fillOpacity=Number.isFinite(Number(d.opacity))?Math.min(Number(d.opacity),.12):.075,figures=[{type:'rect',attrs:{x,y,width:Math.max(1,right-x),height:Math.max(1,bottom-y)},styles:{style:'stroke_fill',color:layerColor(d.fillColor||color,color,fillOpacity),borderColor:layerColor(d.borderColor||color,color,.42),borderSize:Number(d.borderSize||1),borderDashedValue:d.dashed===false?[]:[5,4]},ignoreEvent:true}];if(d.text){const size=normalizeIndicatorLabelFontSize(d.fontSize),width=textWidth(d.text,size,48),isDark=theme.value==='dark';figures.push({type:'text',attrs:{x:x+8,y:y+13,text:String(d.text),align:'left',baseline:'middle'},styles:{color:resolveIndicatorLabelTextColor(d.textColor||color,isDark),size,weight:'700',backgroundColor:'transparent'},ignoreEvent:true})}return figures
}})
registerOverlay({name:'mobileLine',totalStep:2,needDefaultPointFigure:false,needDefaultXAxisFigure:false,needDefaultYAxisFigure:false,createPointFigures:({coordinates,overlay,bounding})=>{
  if(coordinates.length<2)return [];const [a,b]=coordinates,d=overlay.extendData||{},color=d.color||'#e5a100',left=Number(bounding?.left||0),boundRight=left+Number(bounding?.width||0),lineStart={x:a.x,y:a.y};let lineEnd={x:b.x,y:b.y};if(d.extendRight===true&&Number.isFinite(boundRight)&&b.x!==a.x&&boundRight>b.x){const yPerPixel=(b.y-a.y)/(b.x-a.x);lineEnd={x:boundRight,y:b.y+yPerPixel*(boundRight-b.x)}}const figures=[{type:'line',attrs:{coordinates:[lineStart,lineEnd]},styles:{style:d.dashed?'dashed':'solid',color,size:Number(d.lineWidth||1),dashedValue:d.dashed?[5,5]:[]},ignoreEvent:true}];if(d.text){const centered=d.textPosition==='center',size=normalizeIndicatorLabelFontSize(d.fontSize),width=textWidth(d.text,size,0),rawX=centered?(a.x+b.x)/2:b.x+6,x=!centered&&d.keepTextVisible&&Number.isFinite(boundRight)?Math.max(left+4,Math.min(rawX,boundRight-width-4)):rawX,y=(centered?(a.y+b.y)/2:b.y)+(Number(d.textOffsetY)||0),isDark=theme.value==='dark';figures.push({type:'text',attrs:{x,y,text:String(d.text),align:centered?'center':'left',baseline:'middle'},styles:{color:resolveIndicatorLabelTextColor(d.textColor||color,isDark),size,weight:d.fontWeight||'600',backgroundColor:'transparent'},ignoreEvent:true})}return figures
}})
function applyTheme(){if(!chart)return;const light=theme.value==='light',lineOnly=normalizePriceChartType(props.chartType)==='line';chart.setStyles(light?'light':'dark');chart.setStyles({candle:{type:klineCandleType(props.chartType),tooltip:{showRule:'follow_cross',showType:'rect'},bar:{upColor:'#0e603f',downColor:'#8b2437',upBorderColor:'#0e603f',downBorderColor:'#8b2437',upWickColor:'#0e603f',downWickColor:'#8b2437'},area:{lineSize:2,lineColor:light?'#0e603f':'#7cb99b',value:'close',smooth:false,backgroundColor:lineOnly?'rgba(14,96,63,0)':[ {offset:0,color:light?'rgba(14,96,63,.16)':'rgba(124,185,155,.2)'},{offset:1,color:'rgba(14,96,63,.01)'}],point:{show:false,animation:false,animationDuration:0}}},indicator:{bars:[{upColor:'#0e603f',downColor:'#8b2437',noChangeColor:'#8b8479'}]},grid:{horizontal:{color:light?'#e7ded0':'#2b302d'},vertical:{color:light?'#e7ded0':'#2b302d'}}});chart.setLocale(locale.value.startsWith('zh')?'zh-CN':'en-US')}
function render(){
 if(!chart)return
 renderVersion++
 for(const {pane,name} of customPanes)chart.removeIndicator(pane,name)
 customPanes=[];for(const id of overlays)if(id)chart.removeOverlay(id);overlays=[]
 chart.removeIndicator('volume')
 chart.removeIndicator('builtin_lower')
 const sourceCandles=toCandles(props.data?.candles||[])
 const candles=buildPriceChartData(sourceCandles,props.chartType)
 const viewport=captureChartViewport(chart,{defaultRightOffsetDistance:24})
 chart.applyNewData(candles,false,()=>{if(!chart||!viewport)return;if(viewport.followingLatest)chart.scrollToRealTime(0);else restoreChartViewport(chart,viewport)})
 if(!candles.length)return
 chart.createIndicator('VOL',false,{id:'volume',height:72,minHeight:64})
 if(props.main)chart.createIndicator(props.main==='EMA'?{name:'EMA',calcParams:[20,60]}:props.main,false,{id:'candle_pane'})
 const existing=chart.getIndicatorByPaneId('candle_pane');if(existing instanceof Map)for(const name of existing.keys())if(name!==props.main&&!name.startsWith('mobile_'))chart.removeIndicator('candle_pane',name)
 if(props.lower)chart.createIndicator(props.lower,false,{id:'builtin_lower',height:84,minHeight:72})
  const output=normalizedOutput.value
  const plots=[...output.plots,...output.layers.filter(p=>Array.isArray(p.data))]
 for(const overlay of [true,false]){
   const group=plots.filter(p=>(p.overlay!==false)===overlay&&Array.isArray(p.data));if(!group.length)continue
    const name=`mobile_${overlay?'main':'pane'}`;const displayName=props.data?.indicator?.name||output.name||'';const bundle=renderer.build(sourceCandles.length,group,displayName)
   registerIndicator({name,shortName:displayName,calc:rows=>renderer.buildAlignedPlotRows(sourceCandles,bundle.plotDataMap,rows),figures:bundle.figures,series:overlay?'price':'normal',precision:2,...bundle.extra,createTooltipDataSource:()=>({name:'',calcParamsText:'',icons:[],values:[]})})
   const pane=chart.createIndicator({name,styles:{tooltip:{showRule:'none'}}},true,overlay?{id:'candle_pane'}:{id:'custom',...renderer.getCustomPaneOptions(group,bundle.lampBeltMeta)})
   customPanes.push({pane:pane||'candle_pane',name})
 }
 const mappedTimestamp=value=>{const target=toTimestamp(value);if(!Number.isFinite(target)||!candles.length)return target;let match=candles[0];for(const candle of candles){if((candle.sourceTimestamp??candle.timestamp)>target)break;match=candle}return match.timestamp}
  for(const point of assignIndicatorSignalLanes(signalPoints(output.signals,sourceCandles)))overlays.push(chart.createOverlay({name:'mobileSignal',lock:true,points:[{timestamp:mappedTimestamp(point.timestamp),value:point.value}],extendData:point}))
  const at=(value,fallback)=>{const source=value==null?sourceCandles[fallback]?.timestamp:Number.isInteger(Number(value))&&Number(value)>=0&&Number(value)<sourceCandles.length?sourceCandles[Number(value)].timestamp:toTimestamp(value);return mappedTimestamp(source)}
  const sourceIndex=(value,fallback)=>{const numeric=Number(value==null?fallback:value);if(Number.isInteger(numeric)&&numeric>=0&&numeric<sourceCandles.length)return numeric;const timestamp=toTimestamp(value);if(!Number.isFinite(timestamp))return fallback;const found=sourceCandles.findIndex(item=>Math.abs(Number(item.timestamp)-timestamp)<1000);return found>=0?found:fallback}
  const extendedPoint=(layer,end,y1,y2,startIndex,endIndex)=>{const bars=Number(layer.extendBars);if(!Number.isFinite(bars)||bars<=0)return {timestamp:end,value:y2};const targetIndex=sourceCandles.length-1+Math.min(500,Math.floor(bars));const span=endIndex-startIndex;const value=span!==0?y2+(y2-y1)/span*(targetIndex-endIndex):y2;return {dataIndex:targetIndex,value}}
  for(const layer of output.layers){
    if(Array.isArray(layer.data))continue
    const kind=String(layer.type||'').toLowerCase();const startRaw=layer.start??layer.from??layer.x1??layer.startIndex??layer.index,endRaw=layer.end??layer.to??layer.x2??layer.endIndex;const start=at(startRaw,0);const end=at(endRaw,sourceCandles.length-1)
    if(['zone','box','rect','area'].includes(kind)){const top=Number(layer.top??layer.high??layer.y1??layer.price1),bottom=Number(layer.bottom??layer.low??layer.y2??layer.price2);if(Number.isFinite(top)&&Number.isFinite(bottom))overlays.push(chart.createOverlay({name:'mobileZone',lock:true,points:[{timestamp:start,value:top},{timestamp:end,value:bottom}],extendData:{...layer,text:layer.text||layer.name||''}}))}
    else if(['line','segment','level','ray'].includes(kind)){const y1=Number(layer.y1??layer.startPrice??layer.price1??layer.price??layer.level),y2=Number(layer.y2??layer.endPrice??layer.price2??layer.price??layer.level),startIndex=sourceIndex(startRaw,0),endIndex=sourceIndex(endRaw,sourceCandles.length-1);if(Number.isFinite(y1)&&Number.isFinite(y2))overlays.push(chart.createOverlay({name:'mobileLine',lock:true,points:[{timestamp:start,value:y1},extendedPoint(layer,end,y1,y2,startIndex,endIndex)],extendData:{...layer,text:layer.text||layer.name||''}}))}
    else if(['polyline','path'].includes(kind)){const points=Array.isArray(layer.points)?layer.points:[];for(let index=1;index<points.length;index++){const previous=points[index-1]||{},current=points[index]||{},y1=Number(previous.price??previous.value??previous.y),y2=Number(current.price??current.value??current.y);if(!Number.isFinite(y1)||!Number.isFinite(y2))continue;overlays.push(chart.createOverlay({name:'mobileLine',lock:true,points:[{timestamp:at(previous.timestamp??previous.time??previous.index,previous.index??0),value:y1},{timestamp:at(current.timestamp??current.time??current.index,current.index??sourceCandles.length-1),value:y2}],extendData:{...layer,text:index===points.length-1?(layer.text||layer.name||''):'',color:current.color||previous.color||layer.color}}))}}
    else if(['label','tag','note'].includes(kind)){const price=Number(layer.price??layer.value??layer.y);if(Number.isFinite(price))overlays.push(chart.createOverlay({name:'mobileSignal',lock:true,points:[{timestamp:at(layer.timestamp??layer.time??layer.index,sourceCandles.length-1),value:price}],extendData:{...layer,anchor:layer.anchor||layer.side,text:layer.text||layer.name,color:layer.color||'#e5a100'}}))}
 }
 nextTick(()=>{if(chart){chart.resize();chart.setPaneOptions({id:'volume',height:72,minHeight:64})}})
}
function resize(){nextTick(()=>requestAnimationFrame(()=>{if(!chart)return;chart.resize();requestAnimationFrame(()=>chart?.resize())}))}
function refreshPriceData(){
 if(!chart||priceFrame)return
 priceFrame=requestAnimationFrame(()=>{
  priceFrame=0
  if(!chart)return
  const candles=buildPriceChartData(toCandles(props.data?.candles||[]),props.chartType)
  const viewport=captureChartViewport(chart,{defaultRightOffsetDistance:24})
  chart.applyNewData(candles,false,()=>{if(!chart||!viewport)return;if(viewport.followingLatest)chart.scrollToRealTime(0);else restoreChartViewport(chart,viewport)})
 })
}
onMounted(()=>{chart=init(container.value);applyTheme();chart.setBarSpace(7);chart.setOffsetRightDistance(24);observer=new ResizeObserver(()=>chart?.resize());observer.observe(container.value);render()})
onActivated(resize)
watch(()=>[props.data,props.main,props.lower],render,{flush:'post'});watch(()=>props.chartType,()=>{applyTheme();render()});watch(()=>[theme.value,locale.value],()=>{applyTheme();render()});watch(height,()=>nextTick(()=>chart?.resize()))
onBeforeUnmount(()=>{observer?.disconnect();if(priceFrame)cancelAnimationFrame(priceFrame);priceFrame=0;if(chart)dispose(chart);chart=null})
function updateBar(bar){if(!chart)return;if(usesDerivedPriceBars(props.chartType))refreshPriceData();else chart.updateData(bar)}
defineExpose({updateBar,resize})
</script>
<style scoped>
.market-chart-shell{position:relative;width:100%;min-width:0;overflow:hidden}
.market-chart{width:100%;height:100%;min-width:0;touch-action:pan-y}
.indicator-legend{position:absolute;z-index:2;top:5px;left:8px;right:8px;display:flex;gap:4px 9px;overflow:hidden;pointer-events:none;color:var(--v2-muted);font-size:9px;line-height:1.35;white-space:nowrap}
.indicator-legend span{display:flex;min-width:0;align-items:center;gap:4px;overflow:hidden;text-overflow:ellipsis}
.indicator-legend i{width:6px;height:6px;flex:0 0 6px;border-radius:50%}
.indicator-table-stack{position:absolute;z-index:3;display:flex;max-width:min(64%,270px);max-height:42%;flex-direction:column;gap:5px;overflow:auto;overscroll-behavior:contain}
.indicator-table-stack--top-left{top:24px;left:7px}.indicator-table-stack--top-right{top:24px;right:7px}.indicator-table-stack--bottom-left{bottom:24px;left:7px}.indicator-table-stack--bottom-right{right:7px;bottom:24px}
.indicator-table-card{overflow:hidden;border:1px solid color-mix(in srgb,var(--v2-line) 82%,transparent);background:color-mix(in srgb,var(--v2-bg) 88%,transparent);color:var(--v2-text);font-size:9px;box-shadow:0 2px 10px rgba(0,0,0,.08);backdrop-filter:blur(4px)}
.indicator-table-card>strong{display:block;padding:4px 6px;border-bottom:1px solid var(--v2-line);font-size:9px;font-weight:650}
.indicator-table-scroll{overflow:auto}.indicator-table-card table{border-collapse:collapse;white-space:nowrap}.indicator-table-card th,.indicator-table-card td{padding:3px 5px;border-right:1px solid color-mix(in srgb,var(--v2-line) 70%,transparent);border-bottom:1px solid color-mix(in srgb,var(--v2-line) 70%,transparent);font-weight:500}.indicator-table-card th{color:var(--v2-muted);font-weight:650}
@media(max-width:430px){.indicator-table-stack{max-width:68%;max-height:36%}.indicator-table-card th,.indicator-table-card td{padding:2px 4px}}
</style>
