<template><div ref="container" class="market-chart" :style="{height: `${height}px`}" :aria-label="$t('indicator_chart.chart_label')" /></template>
<script setup>
import { computed, onMounted, onActivated, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { init, dispose, registerIndicator, registerOverlay } from 'klinecharts'
import { useSettingsStore } from '@/stores'
import { createPlotRenderer } from '@/utils/pcPlotRenderer'
import { toCandles, signalPoints, toTimestamp } from '@/utils/chartData'
import { captureChartViewport, restoreChartViewport } from '@/utils/chartViewport'
import { buildPriceChartData, klineCandleType, normalizePriceChartType, usesDerivedPriceBars } from '@/utils/priceChartTypes'
const props=defineProps({data:{type:Object,default:null},main:{type:String,default:'EMA'},lower:{type:String,default:''},chartType:{type:String,default:'candle_solid'},expanded:Boolean})
const settings=useSettingsStore();const {locale}=useI18n();const container=ref(null);const theme=computed(()=>settings.theme)
const renderer=createPlotRenderer(theme);let chart;let observer;let overlays=[];let customPanes=[];let renderVersion=0
const height=computed(()=>props.expanded?Math.max(500,window.innerHeight-180):340+(props.lower?88:0)+(props.data?.plots?.some(p=>p.overlay===false)?150:0))
const withAlpha=(color,alpha)=>{const value=String(color||'').trim();if(/^#[0-9a-f]{6}$/i.test(value)){const rgb=value.slice(1).match(/.{2}/g).map(hex=>parseInt(hex,16));return `rgba(${rgb[0]}, ${rgb[1]}, ${rgb[2]}, ${alpha})`}return value||`rgba(229, 161, 0, ${alpha})`}
const layerColor=(color,fallback,alpha)=>{const value=String(color||'').trim(),safeAlpha=Math.max(.01,Math.min(.65,Number(alpha)||.08));if(/^#[0-9a-f]{6}$/i.test(value))return withAlpha(value,safeAlpha);const rgba=value.match(/^rgba?\(\s*([\d.]+)\s*,\s*([\d.]+)\s*,\s*([\d.]+)(?:\s*,\s*([\d.]+))?\s*\)$/i);if(rgba){const sourceAlpha=rgba[4]==null?1:Number(rgba[4]);return `rgba(${rgba[1]}, ${rgba[2]}, ${rgba[3]}, ${Math.min(Number.isFinite(sourceAlpha)?sourceAlpha:1,safeAlpha)})`}return withAlpha(fallback,safeAlpha)}
const textWidth=(text,size,min=38,max=150)=>Math.max(min,Math.min(max,String(text||'').length*Number(size||10)*.62+18))
registerOverlay({name:'mobileSignal',totalStep:1,needDefaultPointFigure:false,needDefaultXAxisFigure:false,needDefaultYAxisFigure:false,createPointFigures:({coordinates,overlay})=>{
  const c=coordinates[0];if(!c)return [];const d=overlay.extendData||{},text=String(d.text||'');if(!text)return [];const color=d.color||'#e5a100',size=Number(d.fontSize||10),width=textWidth(text,size),height=size+9,above=d.side==='above'||d.side==='sell',right=d.side==='right',x=right?c.x+8:c.x-width/2,y=c.y+(above?-height-7:7);return [{type:'rect',attrs:{x,y,width,height,r:5},styles:{style:'stroke_fill',color:d.fillColor?withAlpha(d.fillColor,.2):(theme.value==='light'?'rgba(255,255,255,.84)':'rgba(14,18,25,.78)'),borderColor:d.borderColor||withAlpha(color,.48),borderSize:1},ignoreEvent:true},{type:'text',attrs:{x:x+width/2,y:y+height/2,text,align:'center',baseline:'middle'},styles:{color:d.textColor||color,size,weight:'700',backgroundColor:'transparent'},ignoreEvent:true}]
}})
registerOverlay({name:'mobileZone',totalStep:2,needDefaultPointFigure:false,needDefaultXAxisFigure:false,needDefaultYAxisFigure:false,createPointFigures:({coordinates,overlay,bounding})=>{
  if(coordinates.length<2)return [];const [a,b]=coordinates,d=overlay.extendData||{},color=d.color||'#e5a100',left=Number(bounding?.left||0),boundRight=left+Number(bounding?.width||0),x=Math.max(left,Math.min(a.x,b.x)),right=d.extendRight&&Number.isFinite(boundRight)&&boundRight>left?boundRight:Math.max(a.x,b.x),y=Math.min(a.y,b.y),bottom=Math.max(a.y,b.y),fillOpacity=Number.isFinite(Number(d.opacity))?Math.min(Number(d.opacity),.12):.075,figures=[{type:'rect',attrs:{x,y,width:Math.max(1,right-x),height:Math.max(1,bottom-y)},styles:{style:'stroke_fill',color:layerColor(d.fillColor||color,color,fillOpacity),borderColor:layerColor(d.borderColor||color,color,.42),borderSize:Number(d.borderSize||1),borderDashedValue:d.dashed===false?[]:[5,4]},ignoreEvent:true}];if(d.text){const size=Math.min(10,Number(d.fontSize||10)),width=textWidth(d.text,size,48);figures.push({type:'text',attrs:{x:x+8,y:y+13,text:String(d.text),align:'left',baseline:'middle'},styles:{color:d.textColor||color,size,weight:'700',backgroundColor:'transparent'},ignoreEvent:true})}return figures
}})
registerOverlay({name:'mobileLine',totalStep:2,needDefaultPointFigure:false,needDefaultXAxisFigure:false,needDefaultYAxisFigure:false,createPointFigures:({coordinates,overlay,bounding})=>{
  if(coordinates.length<2)return [];const [a,b]=coordinates,d=overlay.extendData||{},color=d.color||'#e5a100',figures=[{type:'line',attrs:{coordinates:[{x:a.x,y:a.y},{x:b.x,y:b.y}]},styles:{style:'stroke',color,size:Number(d.lineWidth||1),dashedValue:d.dashed?[5,5]:[]},ignoreEvent:true}];if(d.text){const centered=d.textPosition==='center',size=Number(d.fontSize||10),width=textWidth(d.text,size,0),rawX=centered?(a.x+b.x)/2:b.x+6,x=!centered&&d.keepTextVisible&&Number.isFinite(bounding?.width)?Math.max(4,Math.min(rawX,bounding.width-width-4)):rawX,y=(centered?(a.y+b.y)/2:b.y)+(Number(d.textOffsetY)||0);figures.push({type:'text',attrs:{x,y,text:String(d.text),align:centered?'center':'left',baseline:'middle'},styles:{color:d.textColor||color,size,weight:d.fontWeight||'600',backgroundColor:'transparent'},ignoreEvent:true})}return figures
}})
function applyTheme(){if(!chart)return;const light=theme.value==='light',lineOnly=normalizePriceChartType(props.chartType)==='line';chart.setStyles(light?'light':'dark');chart.setStyles({candle:{type:klineCandleType(props.chartType),tooltip:{showRule:'follow_cross',showType:'rect'},bar:{upColor:'#0aa681',downColor:'#ef4444',upBorderColor:'#0aa681',downBorderColor:'#ef4444',upWickColor:'#0aa681',downWickColor:'#ef4444'},area:{lineSize:2,lineColor:light?'#2962ff':'#5b8cff',value:'close',smooth:false,backgroundColor:lineOnly?'rgba(41,98,255,0)':[ {offset:0,color:light?'rgba(41,98,255,.22)':'rgba(91,140,255,.24)'},{offset:1,color:'rgba(41,98,255,.01)'}],point:{show:false,animation:false,animationDuration:0}}},grid:{horizontal:{color:light?'#eef0f3':'#262a31'},vertical:{color:light?'#eef0f3':'#262a31'}}});chart.setLocale(locale.value.startsWith('zh')?'zh-CN':'en-US')}
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
 chart.createIndicator('VOL',false,{id:'volume',height:90,minHeight:80})
 if(props.main)chart.createIndicator(props.main==='EMA'?{name:'EMA',calcParams:[20,60]}:props.main,false,{id:'candle_pane'})
 const existing=chart.getIndicatorByPaneId('candle_pane');if(existing instanceof Map)for(const name of existing.keys())if(name!==props.main&&!name.startsWith('mobile_'))chart.removeIndicator('candle_pane',name)
 if(props.lower)chart.createIndicator(props.lower,false,{id:'builtin_lower',height:100,minHeight:90})
 const plots=[...(props.data?.plots||[]),...(props.data?.layers||[]).filter(p=>Array.isArray(p.data))]
 for(const overlay of [true,false]){
   const group=plots.filter(p=>(p.overlay!==false)===overlay&&Array.isArray(p.data));if(!group.length)continue
   const name=`mobile_${overlay?'main':'pane'}`;const displayName=props.data?.indicator?.name||'';const bundle=renderer.build(sourceCandles.length,group,displayName);for(const figure of bundle.figures)figure.title=''
   registerIndicator({name,shortName:displayName,calc:rows=>renderer.buildAlignedPlotRows(sourceCandles,bundle.plotDataMap,rows),figures:bundle.figures,series:overlay?'price':'normal',precision:2,...bundle.extra,createTooltipDataSource:()=>({name:'',calcParamsText:'',icons:[],values:[]})})
   const pane=chart.createIndicator({name,styles:{tooltip:{showRule:'none'}}},true,overlay?{id:'candle_pane'}:{id:'custom',...renderer.getCustomPaneOptions(group,bundle.lampBeltMeta)})
   customPanes.push({pane:pane||'candle_pane',name})
 }
 const mappedTimestamp=value=>{const target=toTimestamp(value);if(!Number.isFinite(target)||!candles.length)return target;let match=candles[0];for(const candle of candles){if((candle.sourceTimestamp??candle.timestamp)>target)break;match=candle}return match.timestamp}
 for(const point of signalPoints(props.data?.signals,sourceCandles))overlays.push(chart.createOverlay({name:'mobileSignal',lock:true,points:[{timestamp:mappedTimestamp(point.timestamp),value:point.value}],extendData:point}))
 const at=(value,fallback)=>{const source=value==null?sourceCandles[fallback]?.timestamp:Number.isInteger(Number(value))&&Number(value)>=0&&Number(value)<sourceCandles.length?sourceCandles[Number(value)].timestamp:toTimestamp(value);return mappedTimestamp(source)}
 for(const layer of props.data?.layers||[]){
   if(Array.isArray(layer.data))continue
   const kind=String(layer.type||'').toLowerCase();const start=at(layer.start??layer.from??layer.x1??layer.startIndex??layer.index,0);const end=at(layer.end??layer.to??layer.x2??layer.endIndex,sourceCandles.length-1)
   if(['zone','box','rect','area'].includes(kind)){const top=Number(layer.top??layer.high??layer.y1??layer.price1),bottom=Number(layer.bottom??layer.low??layer.y2??layer.price2);if(Number.isFinite(top)&&Number.isFinite(bottom))overlays.push(chart.createOverlay({name:'mobileZone',lock:true,points:[{timestamp:start,value:top},{timestamp:end,value:bottom}],extendData:{...layer,text:layer.text||layer.name||''}}))}
   else if(['line','segment','level','ray'].includes(kind)){const y1=Number(layer.y1??layer.price1??layer.price??layer.level),y2=Number(layer.y2??layer.price2??layer.price??layer.level);if(Number.isFinite(y1)&&Number.isFinite(y2))overlays.push(chart.createOverlay({name:'mobileLine',lock:true,points:[{timestamp:start,value:y1},Number(layer.extendBars)>0?{dataIndex:candles.length-1+Math.min(500,Math.floor(Number(layer.extendBars))),value:y2}:{timestamp:end,value:y2}],extendData:{...layer,text:layer.text||layer.name||''}}))}
   else if(['label','tag','note'].includes(kind)){const price=Number(layer.price??layer.value??layer.y);if(Number.isFinite(price))overlays.push(chart.createOverlay({name:'mobileSignal',lock:true,points:[{timestamp:at(layer.timestamp??layer.time??layer.index,sourceCandles.length-1),value:price}],extendData:{...layer,text:layer.text||layer.name,color:layer.color||'#e5a100'}}))}
 }
 nextTick(()=>{if(chart){chart.resize();chart.setPaneOptions({id:'volume',height:90,minHeight:80})}})
}
function resize(){nextTick(()=>requestAnimationFrame(()=>{if(!chart)return;chart.resize();requestAnimationFrame(()=>chart?.resize())}))}
onMounted(()=>{chart=init(container.value);applyTheme();chart.setBarSpace(7);chart.setOffsetRightDistance(24);observer=new ResizeObserver(()=>chart?.resize());observer.observe(container.value);render()})
onActivated(resize)
watch(()=>[props.data,props.main,props.lower],render,{flush:'post'});watch(()=>props.chartType,()=>{applyTheme();render()});watch(()=>[theme.value,locale.value],()=>{applyTheme();render()});watch(height,()=>nextTick(()=>chart?.resize()))
onBeforeUnmount(()=>{observer?.disconnect();if(chart)dispose(chart);chart=null})
function updateBar(bar){if(!chart)return;if(usesDerivedPriceBars(props.chartType))render();else chart.updateData(bar)}
defineExpose({updateBar,resize})
</script>
<style scoped>.market-chart{width:100%;min-width:0;touch-action:pan-y}</style>
