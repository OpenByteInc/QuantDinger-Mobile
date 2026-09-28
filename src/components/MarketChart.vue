<template><div ref="container" class="market-chart" :style="{height: `${height}px`}" :aria-label="$t('indicator_chart.chart_label')" /></template>
<script setup>
import { computed, onMounted, onActivated, onBeforeUnmount, ref, watch, nextTick } from 'vue'
import { useI18n } from 'vue-i18n'
import { init, dispose, registerIndicator, registerOverlay } from 'klinecharts'
import { useSettingsStore } from '@/stores'
import { createPlotRenderer } from '@/utils/pcPlotRenderer'
import { toCandles, signalPoints, toTimestamp } from '@/utils/chartData'
const props=defineProps({data:{type:Object,default:null},main:{type:String,default:'EMA'},lower:{type:String,default:''},expanded:Boolean})
const settings=useSettingsStore();const {locale}=useI18n();const container=ref(null);const theme=computed(()=>settings.theme)
const renderer=createPlotRenderer(theme);let chart;let observer;let overlays=[];let customPanes=[];let renderVersion=0
const height=computed(()=>props.expanded?Math.max(500,window.innerHeight-180):340+(props.lower?88:0)+(props.data?.plots?.some(p=>p.overlay===false)?150:0))
registerOverlay({name:'mobileSignal',totalStep:1,needDefaultPointFigure:false,needDefaultXAxisFigure:false,needDefaultYAxisFigure:false,createPointFigures:({coordinates,overlay})=>{
  const c=coordinates[0];if(!c)return [];const d=overlay.extendData||{};return [{type:'text',attrs:{x:c.x,y:c.y+(d.side==='sell'?-14:14),text:d.text,align:'center',baseline:'middle'},styles:{color:'#fff',backgroundColor:d.color,paddingLeft:4,paddingRight:4,paddingTop:3,paddingBottom:3,size:10}}]
}})
registerOverlay({name:'mobileZone',totalStep:2,needDefaultPointFigure:false,needDefaultXAxisFigure:false,needDefaultYAxisFigure:false,createPointFigures:({coordinates,overlay})=>{
  if(coordinates.length<2)return [];const [a,b]=coordinates;return [{type:'rect',attrs:{x:Math.min(a.x,b.x),y:Math.min(a.y,b.y),width:Math.abs(a.x-b.x),height:Math.abs(a.y-b.y)},styles:{style:'stroke_fill',color:overlay.extendData?.fillColor||'#e5a10025',borderColor:overlay.extendData?.color||'#e5a100',borderSize:1}}]
}})
function applyTheme(){if(!chart)return;chart.setStyles(theme.value==='light'?'light':'dark');chart.setStyles({candle:{tooltip:{showRule:'follow_cross',showType:'rect'},bar:{upColor:'#0aa681',downColor:'#ef4444',upBorderColor:'#0aa681',downBorderColor:'#ef4444',upWickColor:'#0aa681',downWickColor:'#ef4444'}},grid:{horizontal:{color:theme.value==='light'?'#eef0f3':'#262a31'},vertical:{color:theme.value==='light'?'#eef0f3':'#262a31'}}});chart.setLocale(locale.value.startsWith('zh')?'zh-CN':'en-US')}
function render(){
 if(!chart)return
 renderVersion++
 for(const {pane,name} of customPanes)chart.removeIndicator(pane,name)
 customPanes=[];for(const id of overlays)if(id)chart.removeOverlay(id);overlays=[]
 chart.removeIndicator('volume')
 chart.removeIndicator('builtin_lower')
 const candles=toCandles(props.data?.candles||[])
 const previous=chart.getDataList();const range=chart.getVisibleRange();const sameWindow=previous.length&&candles[0]?.timestamp===previous[0]?.timestamp;const atRealtime=previous.length&&range.to>=previous.length-2;const anchorTimestamp=sameWindow&&!atRealtime?previous[Math.max(0,Math.min(previous.length-1,Math.floor(range.to)-1))]?.timestamp:null
 chart.applyNewData(candles)
 if(!candles.length)return
 chart.createIndicator('VOL',false,{id:'volume',height:90,minHeight:80})
 if(props.main)chart.createIndicator(props.main==='EMA'?{name:'EMA',calcParams:[20,60]}:props.main,false,{id:'candle_pane'})
 const existing=chart.getIndicatorByPaneId('candle_pane');if(existing instanceof Map)for(const name of existing.keys())if(name!==props.main&&!name.startsWith('mobile_'))chart.removeIndicator('candle_pane',name)
 if(props.lower)chart.createIndicator(props.lower,false,{id:'builtin_lower',height:100,minHeight:90})
 const plots=[...(props.data?.plots||[]),...(props.data?.layers||[]).filter(p=>Array.isArray(p.data))]
 for(const overlay of [true,false]){
   const group=plots.filter(p=>(p.overlay!==false)===overlay&&Array.isArray(p.data));if(!group.length)continue
   const name=`mobile_${overlay?'main':'pane'}`;const displayName=props.data?.indicator?.name||'';const bundle=renderer.build(candles.length,group,displayName)
   registerIndicator({name,shortName:displayName,calc:rows=>renderer.buildAlignedPlotRows(candles,bundle.plotDataMap,rows),figures:bundle.figures,series:overlay?'price':'normal',precision:2,...bundle.extra})
   const pane=chart.createIndicator(name,true,overlay?{id:'candle_pane'}:{id:'custom',...renderer.getCustomPaneOptions(group,bundle.lampBeltMeta)})
   customPanes.push({pane:pane||'candle_pane',name})
 }
 for(const point of signalPoints(props.data?.signals,candles))overlays.push(chart.createOverlay({name:'mobileSignal',lock:true,points:[{timestamp:point.timestamp,value:point.value}],extendData:point}))
 const at=(value,fallback)=>value==null?candles[fallback]?.timestamp:Number.isInteger(Number(value))&&Number(value)>=0&&Number(value)<candles.length?candles[Number(value)].timestamp:toTimestamp(value)
 for(const layer of props.data?.layers||[]){
   if(Array.isArray(layer.data))continue
   const kind=String(layer.type||'').toLowerCase();const start=at(layer.start??layer.from??layer.x1??layer.startIndex??layer.index,0);const end=at(layer.end??layer.to??layer.x2??layer.endIndex,candles.length-1)
   if(['zone','box','rect','area'].includes(kind)){const top=Number(layer.top??layer.high??layer.y1??layer.price1),bottom=Number(layer.bottom??layer.low??layer.y2??layer.price2);if(Number.isFinite(top)&&Number.isFinite(bottom))overlays.push(chart.createOverlay({name:'mobileZone',lock:true,points:[{timestamp:start,value:top},{timestamp:end,value:bottom}],extendData:layer}))}
   else if(['line','segment','level','ray'].includes(kind)){const y1=Number(layer.y1??layer.price1??layer.price??layer.level),y2=Number(layer.y2??layer.price2??layer.price??layer.level);if(Number.isFinite(y1)&&Number.isFinite(y2))overlays.push(chart.createOverlay({name:'segment',lock:true,points:[{timestamp:start,value:y1},{timestamp:end,value:y2}],styles:{line:{color:layer.color||'#e5a100',size:layer.lineWidth||1}}}))}
   else if(['label','tag','note'].includes(kind)){const price=Number(layer.price??layer.value??layer.y);if(Number.isFinite(price))overlays.push(chart.createOverlay({name:'mobileSignal',lock:true,points:[{timestamp:at(layer.timestamp??layer.time??layer.index,candles.length-1),value:price}],extendData:{...layer,text:layer.text||layer.name,color:layer.color||'#e5a100'}}))}
 }
 nextTick(()=>{if(chart){chart.resize();chart.setPaneOptions({id:'volume',height:90,minHeight:80});if(atRealtime)chart.scrollToRealTime(0);else if(anchorTimestamp)chart.scrollToTimestamp(anchorTimestamp,0)}})
}
function resize(){nextTick(()=>requestAnimationFrame(()=>{if(!chart)return;chart.resize();requestAnimationFrame(()=>chart?.resize())}))}
onMounted(()=>{chart=init(container.value);applyTheme();chart.setBarSpace(7);chart.setOffsetRightDistance(24);observer=new ResizeObserver(()=>chart?.resize());observer.observe(container.value);render()})
onActivated(resize)
watch(()=>[props.data,props.main,props.lower],render,{flush:'post'});watch(()=>[theme.value,locale.value],()=>{applyTheme();render()});watch(height,()=>nextTick(()=>chart?.resize()))
onBeforeUnmount(()=>{observer?.disconnect();if(chart)dispose(chart);chart=null})
function updateBar(bar){if(chart)chart.updateData(bar)}
defineExpose({updateBar,resize})
</script>
<style scoped>.market-chart{width:100%;min-width:0;touch-action:pan-y}</style>
