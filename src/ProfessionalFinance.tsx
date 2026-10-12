import {useEffect,useState} from "react";
import {api,type Appointment,type Patient,type Session,type PaymentStatus,type PaymentMethod,type ProfessionalFinanceResult} from "./api";
import {FinanceModal,FinanceNote} from "./PatientDetails";
import {dateValue} from "./timezone";
import "./ProfessionalFinance.css";
const money=new Intl.NumberFormat("pt-BR",{style:"currency",currency:"BRL"});
const statuses={PENDING:"Pendente",PAID:"Pago",EXEMPT:"Isento",CANCELED:"Cancelado"};
const methods={PIX:"Pix",CASH:"Dinheiro",CARD:"Cartão",BANK_TRANSFER:"Transferência",OTHER:"Outro"};
function currentMonth(timezone:string){const month=dateValue(new Date(),timezone).slice(0,7);const [year,m]=month.split("-").map(Number);return {from:month+"-01",to:month+"-"+new Date(Date.UTC(year,m,0)).getUTCDate()};}
export function ProfessionalFinance({session,patients,timezone,openPatient}:{session:Session;patients:Patient[];timezone:string;openPatient:(patient:Patient)=>void}) {
 const [from,setFrom]=useState(()=>currentMonth(timezone).from),[to,setTo]=useState(()=>currentMonth(timezone).to),[basis,setBasis]=useState<"SESSION"|"PAYMENT">("SESSION"),[patientId,setPatientId]=useState(""),[status,setStatus]=useState(""),[method,setMethod]=useState(""),[page,setPage]=useState(0);
 const [data,setData]=useState<ProfessionalFinanceResult|null>(null),[loading,setLoading]=useState(false),[error,setError]=useState(""),[success,setSuccess]=useState(""),[editing,setEditing]=useState<Appointment|null>(null),[revision,setRevision]=useState(0);
 const invalid=!!from&&!!to&&from>to;
 useEffect(()=>{let active=true;setData(null);setError("");if(invalid){setLoading(false);return;}setLoading(true);
  api.professionalFinance(session,{from,to,basis,patientId,status:status as PaymentStatus||undefined,method:method&&method!=="UNSPECIFIED"?method as PaymentMethod:undefined,unspecifiedMethod:method==="UNSPECIFIED",page,size:20})
   .then(result=>{if(active){if(page>0&&page>=(result.entries.totalPages??1)){setPage(Math.max(0,(result.entries.totalPages??1)-1));}else setData(result);}})
   .catch(e=>{if(active)setError(e instanceof Error?e.message:"Não foi possível carregar o financeiro");})
   .finally(()=>{if(active)setLoading(false);});return()=>{active=false;};
 },[session,from,to,basis,patientId,status,method,page,revision,invalid,timezone]);
 const entries=data?.entries.content??[],pages=data?.entries.totalPages??1,totalEntries=data?.entries.totalElements??0;
 const selectedPatient=patients.find(patient=>patient.id===patientId);
 const amount=(value:number|undefined)=>value===undefined?"—":money.format(Number(value));
 function reset(){setFrom("");setTo("");setBasis("SESSION");setPatientId("");setStatus("");setMethod("");setPage(0);}
 return <section className="professional-finance patient-finance">
  <header className="professional-finance-heading"><div><span className="eyebrow">FINANCEIRO</span><h3>Recebimentos e pendências</h3><p>Todos os pacientes em uma única consulta.</p></div><button type="button" className="ghost" disabled={loading||invalid} onClick={()=>setRevision(value=>value+1)}>Atualizar</button></header>
  <div className="finance-filters">
   <label>Paciente<select value={patientId} onChange={e=>{setPatientId(e.target.value);setPage(0);}}><option value="">Todos os pacientes</option>{patients.map(patient=><option key={patient.id} value={patient.id}>{patient.fullName}{patient.active?"":" (inativo)"}</option>)}</select></label>
   <label>De<input type="date" value={from} onChange={e=>{setFrom(e.target.value);setPage(0);}}/></label><label>Até<input type="date" value={to} onChange={e=>{setTo(e.target.value);setPage(0);}}/></label>
   <label>Data de referência<select value={basis} onChange={e=>{setBasis(e.target.value as "SESSION"|"PAYMENT");setPage(0);}}><option value="SESSION">Data da sessão</option><option value="PAYMENT">Data de pagamento</option></select></label>
   <label>Situação<select value={status} onChange={e=>{setStatus(e.target.value);setPage(0);}}><option value="">Todas</option>{(Object.keys(statuses) as PaymentStatus[]).map(value=><option key={value} value={value}>{statuses[value]}</option>)}</select></label>
   <label>Forma de pagamento<select value={method} onChange={e=>{setMethod(e.target.value);setPage(0);}}><option value="">Todas</option>{(Object.keys(methods) as PaymentMethod[]).map(value=><option key={value} value={value}>{methods[value]}</option>)}<option value="UNSPECIFIED">Não informada</option></select></label>
   <button type="button" onClick={()=>{const period=currentMonth(timezone);setFrom(period.from);setTo(period.to);setPage(0);}}>Este mês</button><button type="button" onClick={reset}>Limpar filtros</button>
  </div>
  {invalid&&<p className="error" role="alert">A data final deve ser igual ou posterior à inicial.</p>}{error&&<p className="error" role="alert">{error}</p>}{success&&<div className="success banner" role="status"><span>{success}</span><button className="banner-close" aria-label="Fechar aviso" onClick={()=>setSuccess("")}>×</button></div>}
  <p className="finance-note">Tabela e totais seguem os mesmos filtros. Os totais incluem todas as páginas. Horários em {timezone}.</p>
  <div className="finance-summary">{([["Recebido",data?.totals.received,"lançamentos pagos"],["Pendente",data?.totals.pending,"aguardando pagamento"],["Isento",data?.totals.exempt,"fora do total financeiro"],["Total do período",data?.totals.total,"recebido + pendente"]] as const).map(([label,value,detail])=><article key={label}><small>{label}</small><strong>{amount(value)}</strong><span>{detail}</span></article>)}</div>
  {basis==="PAYMENT"&&(from||to)&&<p className="finance-note">Com período por pagamento, lançamentos sem data de pagamento ficam fora da consulta. Para consultar pendências, selecione a data da sessão.</p>}
  {selectedPatient&&<p className="finance-note">Consultando {selectedPatient.fullName}.</p>}
  <div className="finance-table-wrap" aria-busy={loading}><table className="finance-table"><thead><tr><th>Paciente / sessão</th><th>Valor</th><th>Situação</th><th>Pagamento</th><th>Forma</th><th>Observação</th><th>Ações</th></tr></thead><tbody>
   {loading?<tr><td colSpan={7} className="finance-empty">Carregando lançamentos…</td></tr>:entries.length?entries.map(item=>{const patient=patients.find(value=>value.id===item.patientId);return <tr key={item.id}><td>{patient?<button type="button" className="professional-finance-patient" onClick={()=>openPatient(patient)}>{item.patientName}</button>:<strong>{item.patientName}</strong>}<small>{new Date(item.startsAt).toLocaleString("pt-BR",{timeZone:timezone,day:"2-digit",month:"2-digit",year:"numeric",hour:"2-digit",minute:"2-digit"})} · {item.modality==="ONLINE"?"Online":"Presencial"}</small></td><td>{amount(item.financialAmount)}</td><td><span className={`professional-finance-status ${(item.paymentStatus??"PENDING").toLowerCase()}`}>{statuses[item.paymentStatus??"PENDING"]}</span></td><td>{item.paymentDate?.split("-").reverse().join("/")||"—"}</td><td>{item.paymentMethod?methods[item.paymentMethod]:"—"}</td><td><FinanceNote value={item.financialNotes}/></td><td><div className="finance-actions"><button type="button" onClick={()=>setEditing(item)} aria-label={`Editar lançamento de ${item.patientName} em ${dateValue(item.startsAt,timezone)}`}>Editar</button></div></td></tr>;}):<tr><td colSpan={7} className="finance-empty">{error?"Não foi possível consultar os lançamentos.":invalid?"Corrija o período para consultar.":"Nenhum lançamento encontrado com estes filtros."}</td></tr>}
  </tbody></table></div>
  {data&&<div className="professional-finance-pagination"><span>{totalEntries?`${page*20+1}–${Math.min((page+1)*20,totalEntries)} de ${totalEntries} lançamentos`:"0 lançamentos"}</span><div><button type="button" className="ghost" disabled={loading||page===0} onClick={()=>setPage(value=>value-1)}>Anterior</button><span>Página {page+1} de {Math.max(1,pages)}</span><button type="button" className="ghost" disabled={loading||page+1>=pages} onClick={()=>setPage(value=>value+1)}>Próxima</button></div></div>}
  <p className="finance-note">Sessões canceladas e lançamentos cancelados ou isentos não entram no total financeiro.</p>
  {editing&&<FinanceModal item={editing} timezone={timezone} close={()=>setEditing(null)} save={async values=>{const updated=await api.updateSessionFinance(session,editing.id,values);if(values.paymentMethod&&updated.paymentMethod!==values.paymentMethod)throw new Error("A API não confirmou a forma de pagamento escolhida.");setEditing(null);setSuccess("Lançamento atualizado com sucesso.");setRevision(value=>value+1);}}/>}
 </section>;
}
