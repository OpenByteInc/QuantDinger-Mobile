import test from 'node:test'
import assert from 'node:assert/strict'
import {readFileSync} from 'node:fs'
import vm from 'node:vm'

function options(overrides={}) {
  let script=readFileSync(new URL('../../src/views/profile/CredentialForm.vue',import.meta.url),'utf8').split('<script>')[1].split('</script>')[0]
  const scope={...overrides}
  script=script.replace(/^import (.*?) from ['"][^'"]+['"]$/gm,(_,names)=>{
    for (const item of names.replace(/[{}]/g,'').split(',')) {
      const name=item.trim().split(/\s+as\s+/).pop()
      if (!(name in scope)) scope[name]=()=>({})
    }
    return ''
  })
  vm.runInNewContext(script.replace('export default','result ='),scope)
  return scope.result
}

test('successful credential save clears sensitive fields before leaving',async()=>{
  let sent
  const component=options({brokerApi:{connect:async(id,payload)=>{sent=payload}}})
  const state={form:{private_key:'private-marker',trade_password:'password-marker',exchange_id:'forthright'},isDirectBroker:true,validate:()=>true,$t:key=>key,$router:{replace:()=>{assert.equal(state.form.private_key,'')}}}
  state.credentialPayload=()=>({...state.form})
  state.clearCredentialSecrets=component.methods.clearCredentialSecrets.bind(state)
  await component.methods.submit.call(state)
  assert.equal(sent.private_key,'private-marker')
  assert.equal(state.form.trade_password,'')
  state.form.private_key='later-marker'
  component.beforeUnmount.call(state)
  assert.equal(state.form.private_key,'')
})

test('failed save never logs an Axios error containing the submitted key',async()=>{
  const logs=[]
  const component=options({console:{error:(...args)=>logs.push(args)},brokerApi:{connect:async()=>{throw {config:{data:{privateKey:'private-marker'}},message:'failed'}}}})
  const state={form:{exchange_id:'forthright'},isDirectBroker:true,validate:()=>true,credentialPayload:()=>({}),$t:key=>key}
  await component.methods.submit.call(state)
  assert.equal(logs.length,0)
  assert.equal(state.saving,false)
})
