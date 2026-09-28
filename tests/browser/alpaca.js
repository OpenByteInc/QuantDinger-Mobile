import axios from 'axios'
import {createApp,h,ref,KeepAlive} from 'vue'
import {createRouter,createMemoryHistory} from 'vue-router'
import {createPinia} from 'pinia'
import 'vant/lib/index.css'
import '../../src/styles/index.css'
import '../../src/styles/v2.css'
if(!import.meta.env.DEV)throw new Error('Development test harness only')
const requests=ref([]),failed=ref(false)
let orders=[{id:'fixture-open-1',symbol:'AAPL',side:'buy',quantity:1,order_type:'limit',limit_price:200,status:'new'}]
axios.defaults.adapter=async config=>{
 const payload=typeof config.data==='string'?JSON.parse(config.data):config.data
 requests.value.push({url:config.url,method:config.method,params:config.params,payload})
 let body
 if(config.url==='/api/credentials/list')body={code:1,data:{items:[{id:7,exchange_id:'alpaca',name:'Alpaca fixture',api_key_hint:'PKxx...test (paper)'},{id:8,exchange_id:'alpaca',name:'Second fixture',api_key_hint:'AKxx...test (live)'}]}}
 else if(failed.value)body={success:false,error:'Fixture connection failed'}
 else if(config.url==='/api/alpaca/account')body={success:true,data:{buying_power:'1000',cash:'800',currency:'USD',paper:true}}
 else if(config.url==='/api/alpaca/positions')body={success:true,data:[{symbol:'AAPL',quantity:3,unrealized_pnl:12}]}
 else if(config.url==='/api/alpaca/orders')body={success:true,data:config.params.status==='open'?orders.filter(x=>x.status==='new'):orders}
 else if(config.url==='/api/alpaca/order'){orders.push({id:'fixture-created',symbol:payload.symbol,side:payload.side,quantity:payload.quantity,status:'new',limit_price:payload.price});body={success:true,data:{orderId:'fixture-created',status:'new'}}}
 else if(config.method==='delete'&&config.url.startsWith('/api/alpaca/order/')){orders=orders.filter(x=>!config.url.endsWith(x.id));body={success:true}}
 else throw new Error(`Unmocked request: ${config.url}`)
 return {data:body,status:200,statusText:'OK',headers:{},config}
}
const {default:i18n}=await import('../../src/locales/index.js')
const {default:Panel}=await import('../../src/components/AlpacaTradePanel.vue')
const {useSettingsStore}=await import('../../src/stores/index.js')
const router=createRouter({history:createMemoryHistory(),routes:[{path:'/',component:{render:()=>null}}]})
const Root={setup(){const settings=useSettingsStore();settings.setLocale('zh-CN');return()=>h('main',[h('header',{style:'padding:10px;background:#ffe58f;color:#111'},[h('strong','ISOLATED FIXTURE — NO BROKER REQUESTS'),h('button',{onClick:()=>failed.value=!failed.value},'Fail connection')]),h(KeepAlive,null,{default:()=>h(Panel,{symbol:'AAPL',chartPrice:210})}),h('pre',{style:'white-space:pre-wrap'},JSON.stringify(requests.value,null,2))])}}
const app=createApp(Root);app.use(createPinia());app.use(i18n);app.use(router);await router.push('/');app.mount('#app')
