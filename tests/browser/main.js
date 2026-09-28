import axios from 'axios'
import {createApp,h,ref,KeepAlive} from 'vue'
import {createRouter,createMemoryHistory} from 'vue-router'
import 'vant/lib/index.css'
import '../../src/styles/index.css'
import '../../src/styles/v2.css'

if(!import.meta.env.DEV)throw new Error('Development test harness only')
const requests=ref([]),failure=ref(false)
const candles=Array.from({length:120},(_,i)=>{const open=60000+i*180+Math.sin(i/6)*1200,close=open+Math.sin(i*1.7)*330;return {time:1790000000+i*3600,open,close,high:Math.max(open,close)+260,low:Math.min(open,close)-240,volume:300+i*3}})
const plots=['MACD','KDJ','RSI','LWR','BBI','MTM'].flatMap((name,lane)=>['red','green'].map((color,side)=>({name:name+' '+color,type:'lamp',overlay:false,color:side?'#22c55e':'#ef4444',data:candles.map((_,i)=>Math.floor((i+lane)/8)%2===side?1:null)})))
plots.push({name:'EMA20',overlay:true,type:'line',color:'#e5a100',data:candles.map((row,i)=>i<19?null:row.close-900)})
let closed=false
let trades=[{id:991,symbol:'BTC/USDT',credential_id:1,market_type:'swap',side:'buy',amount:100,price:70000,order_type:'limit',status:'submitted',created_at:'2026-09-26T12:00:00Z'}]
axios.defaults.adapter=async config=>{
 const url=config.url;const payload=typeof config.data==='string'?JSON.parse(config.data):config.data;requests.value.push({method:config.method,url,params:config.params,payload})
 let data
 if(failure.value&&url.includes('/quick-trade/'))throw new Error('Fixture connection unavailable')
 if(url==='/api/credentials/list')data={items:[{id:1,name:'Gate test account',exchange_id:'gate',market_scope:'both',environment:'sandbox'},{id:2,name:'Binance spot test',exchange_id:'binance',market_scope:'spot',environment:'sandbox'}]}
 else if(url==='/api/indicator/getIndicators')data={indicators:[{id:1,name:'Six-Factor Momentum Resonance'}]}
 else if(url==='/api/indicator/getIndicatorParams')data={params:[{name:'period',type:'int',default:20,min:2,max:100}]}
 else if(url==='/api/indicator/chart-preview')data={candles,plots,layers:[{type:'level',price:65000,color:'#3898ed'}],signals:[{name:'DEFEND',type:'buy',color:'#22c55e',data:candles.map((row,i)=>i%24===0?row.low:null)},{name:'6 RED',type:'sell',color:'#ef4444',data:candles.map((row,i)=>i%24===12?row.high:null)}],indicator:{name:'Six-Factor Momentum Resonance'}}
 else if(url==='/api/quick-trade/balance')data={available:config.params.credential_id===1?482.71:150,total:844.38,currency:'USDT'}
 else if(url==='/api/quick-trade/position')data={positions:config.params.credential_id===2||closed?[]:[{symbol:'BTC/USDT',side:'long',size:0.0042,entry_price:86047,mark_price:84098,unrealized_pnl:-8.187,leverage:5}]}
 else if(url==='/api/quick-trade/history')data={trades:trades.filter(row=>row.credential_id===config.params.credential_id&&row.market_type===config.params.market_type&&row.symbol===config.params.symbol)}
 else if(url==='/api/quick-trade/ai-decisions')data=[]
 else if(url==='/api/quick-trade/event-radar')data={enabled:true,cost:5,billing_enabled:true,latest:null}
 else if(url==='/api/quick-trade/place-order'){trades.push({...payload,id:trades.length+992,status:'filled',created_at:'2026-09-26T13:00:00Z'});data={id:trades.at(-1).id}}
 else if(url==='/api/quick-trade/cancel-order'){trades=trades.map(row=>row.id===payload.trade_id?{...row,status:'canceled'}:row);data={}}
 else if(url==='/api/quick-trade/close-position'){closed=true;data={}}
 else throw new Error('Unmocked endpoint blocked: '+url)
 return {data:{code:1,data},status:200,statusText:'OK',headers:{},config}
}
const {default:Chart}=await import('../../src/views/indicator/Chart.vue')
const {pinia,useSettingsStore}=await import('../../src/stores/index.js')
const {default:i18n}=await import('../../src/locales/index.js')
const router=createRouter({history:createMemoryHistory(),routes:[{path:'/',component:Chart}]})
const settings=useSettingsStore(pinia);settings.setLocale('zh-CN');settings.setTheme('light');document.documentElement.dataset.theme='light'
const app=createApp({setup(){return()=>h('div',{style:'height:100%;overflow:auto'},[
 h('aside',{style:'padding:10px;background:#fde68a;color:#111;font:12px sans-serif'},[
 h('b','ISOLATED TEST DATA — NO EXCHANGE REQUESTS'),
 h('button',{onClick:()=>{settings.setTheme(settings.theme==='light'?'dark':'light');document.documentElement.dataset.theme=settings.theme}},'Theme'),
 h('button',{onClick:()=>settings.setLocale(settings.locale==='zh-CN'?'en-US':'zh-CN')},'Language'),
 h('button',{onClick:()=>failure.value=!failure.value},failure.value?'Restore connection':'Fail connection')]),
 h(KeepAlive,null,{default:()=>h(Chart)}),
 h('details',[h('summary','Recorded mock requests'),h('pre',{style:'white-space:pre-wrap;word-break:break-all'},JSON.stringify(requests.value,null,2))])])}})
app.use(pinia).use(i18n).use(router);await router.isReady();app.mount('#app')
