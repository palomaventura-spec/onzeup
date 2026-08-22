const SANDBOX_API="https://api-sandbox.asaas.com/v3";
const PRODUCTION_API="https://api.asaas.com/v3";
function apiKey(){const v=process.env.ASAAS_API_KEY;if(!v)throw new Error("ASAAS_API_KEY não configurado.");return v;}
export function asaasIsSandbox(){return String(process.env.ASAAS_ENV||"sandbox").toLowerCase()!=="production";}
function baseUrl(){return asaasIsSandbox()?SANDBOX_API:PRODUCTION_API;}
export async function asaasFetch<T>(path:string,init:RequestInit={}):Promise<T>{
 const r=await fetch(`${baseUrl()}${path}`,{...init,headers:{accept:"application/json",access_token:apiKey(),"Content-Type":"application/json",...(init.headers||{})},cache:"no-store"});
 const text=await r.text();let body:unknown=null;try{body=text?JSON.parse(text):null}catch{body=text}
 if(!r.ok){console.error("ASAAS_API_ERROR",{path,status:r.status,body,sandbox:asaasIsSandbox()});throw new Error(`Asaas respondeu ${r.status}.`);}
 return body as T;
}
type Checkout={id:string;link?:string|null;status?:string|null};
function dt(d:Date){const p=(n:number)=>String(n).padStart(2,"0");return `${d.getFullYear()}-${p(d.getMonth()+1)}-${p(d.getDate())} ${p(d.getHours())}:${p(d.getMinutes())}:${p(d.getSeconds())}`;}
async function checkout(i:{externalReference:string;name:string;description:string;value:number;billingTypes:("PIX"|"CREDIT_CARD")[];recurrent?:boolean;successUrl:string;cancelUrl:string;expiredUrl:string;}){
 const payload:any={billingTypes:i.billingTypes,chargeTypes:[i.recurrent?"RECURRENT":"DETACHED"],minutesToExpire:120,externalReference:i.externalReference,callback:{successUrl:i.successUrl,cancelUrl:i.cancelUrl,expiredUrl:i.expiredUrl},items:[{name:i.name,description:i.description,quantity:1,value:i.value}]};
 if(i.recurrent){const n=new Date();n.setMinutes(n.getMinutes()+5);const e=new Date();e.setFullYear(e.getFullYear()+10);payload.subscription={cycle:"MONTHLY",nextDueDate:dt(n),endDate:dt(e)};}
 const c=await asaasFetch<Checkout>("/checkouts",{method:"POST",body:JSON.stringify(payload)});if(!c.id)throw new Error("Asaas não retornou o ID do checkout.");
 return {...c,link:c.link||`https://asaas.com/checkoutSession/show?id=${encodeURIComponent(c.id)}`};
}
export const createAsaasPlayerPremiumCheckout=(i:any)=>checkout({...i,name:"ONZEUP Player Premium",description:`Assinatura mensal - ${i.playerName}`,value:29.9,billingTypes:["CREDIT_CARD"],recurrent:true});
export const createAsaasPlayerPremiumPixCheckout=(i:any)=>checkout({...i,name:"ONZEUP Player Premium",description:`Mensalidade Premium - ${i.playerName}`,value:29.9,billingTypes:["PIX"],recurrent:false});
export const createAsaasClubCheckout=(i:any)=>checkout({...i,name:`ONZEUP Club ${i.planLabel}`,description:`${i.cycle==="ANNUAL"?"Plano anual":"Plano mensal"} - ${i.organizationName}`,billingTypes:[i.method==="PIX"?"PIX":"CREDIT_CARD"],recurrent:i.cycle==="MONTHLY"&&i.method==="CARD"});
export type AsaasStoredData={provider?:"ASAAS";environment?:"SANDBOX"|"PRODUCTION";checkoutId?:string;checkoutUrl?:string;checkoutStatus?:string;subscriptionId?:string;processedEventIds?:string[];lastEvent?:string;lastPaymentId?:string;lastPaymentStatus?:string;paymentMethod?:"CARD"|"PIX";billingCycle?:"MONTHLY"|"ANNUAL";commercialPlan?:"ESSENTIAL"|"PRO"|"ELITE";};
export function readAsaasData(v?:string|null):AsaasStoredData{if(!v)return{};try{const p=JSON.parse(v);return p&&typeof p==="object"?p:{}}catch{return{}}}
export const writeAsaasData=(v:AsaasStoredData)=>JSON.stringify(v);
