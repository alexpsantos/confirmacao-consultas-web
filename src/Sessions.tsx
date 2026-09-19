import {useCallback, useEffect, useState} from 'react';
import type {FormEvent} from 'react';
import {api, type Appointment, type Patient, type Session} from './api';
import './Sessions.css';

const statusLabels = {SCHEDULED:'Agendada', CONFIRMED:'Confirmada', COMPLETED:'Realizada', CANCELED:'Cancelada', NO_SHOW:'Não compareceu'};
const START_HOUR=7, END_HOUR=22, HOUR_HEIGHT=56;
const hours=Array.from({length:END_HOUR-START_HOUR},(_,i)=>START_HOUR+i);

function monday(date:Date){const d=new Date(date);d.setHours(0,0,0,0);d.setDate(d.getDate()-((d.getDay()+6)%7));return d}
function addDays(date:Date,n:number){const d=new Date(date);d.setDate(d.getDate()+n);return d}
function localValue(value:Date|string){const d=new Date(value),offset=d.getTimezoneOffset();return new Date(d.getTime()-offset*60000).toISOString().slice(0,16)}

export function SessionsView({session,patients}:{session:Session;patients:Patient[]}){
  const [week,setWeek]=useState(()=>monday(new Date()));
  const [items,setItems]=useState<Appointment[]>([]);
  const [editing,setEditing]=useState<Appointment|null>(null);
  const [draft,setDraft]=useState<Date|null>(null);
  const [error,setError]=useState('');
  const [now,setNow]=useState(()=>new Date());
  const days=Array.from({length:7},(_,i)=>addDays(week,i)),end=addDays(week,7);
  const load=useCallback(async()=>{try{setError('');setItems(await api.sessions(session,week.toISOString(),end.toISOString()))}catch(e){setError(e instanceof Error?e.message:'Não foi possível carregar as sessões')}},[session,week]);
  useEffect(()=>{void load()},[load]);
  useEffect(()=>{const timer=window.setInterval(()=>setNow(new Date()),60000);return()=>window.clearInterval(timer)},[]);

  function openSlot(day:Date,hour:number){
    const date=new Date(day);date.setHours(hour,0,0,0);
    if(date.getTime()<Date.now()){setError('Não é possível agendar uma sessão em um horário que já passou.');return}
    setError('');setDraft(date);
  }
  function openNext(){
    const date=new Date();date.setMinutes(0,0,0);date.setHours(date.getHours()+1);
    if(date.getHours()>=END_HOUR){date.setDate(date.getDate()+1);date.setHours(9)}
    openSlot(date,date.getHours());
  }

  const period=`${week.toLocaleDateString('pt-BR',{day:'2-digit',month:'short'})} — ${addDays(week,6).toLocaleDateString('pt-BR',{day:'2-digit',month:'short',year:'numeric'})}`;
  const nowMinutes=now.getHours()*60+now.getMinutes(),lineTop=(nowMinutes-START_HOUR*60)/60*HOUR_HEIGHT;
  const showCurrentLine=now>=week&&now<end&&lineTop>=0&&lineTop<=(END_HOUR-START_HOUR)*HOUR_HEIGHT;
  return <>
    <section className="sessions-panel">
      <div className="sessions-toolbar">
        <div><label className="week-picker"><span>{period}</span><input aria-label="Selecionar semana" type="date" value={localValue(week).slice(0,10)} onChange={e=>{if(e.target.value)setWeek(monday(new Date(`${e.target.value}T12:00:00`)))}}/></label><p>Visão semanal da sua agenda</p></div>
        <div><button className="ghost" onClick={()=>setWeek(addDays(week,-7))}>‹</button><button className="ghost" onClick={()=>setWeek(monday(new Date()))}>Hoje</button><button className="ghost" onClick={()=>setWeek(addDays(week,7))}>›</button><button className="primary" onClick={openNext}>+ Nova sessão</button></div>
      </div>
      {error&&<div className="error banner">{error}</div>}
      <div className="calendar-scroll">
        <div className="calendar-header"><div className="time-corner"/>{days.map(day=>{const current=day.toDateString()===new Date().toDateString();return <button className={`day-head ${current?'today':''}`} key={day.toISOString()} onClick={()=>openSlot(day,9)}><span>{day.toLocaleDateString('pt-BR',{weekday:'short'}).replace('.','')}</span><strong>{day.getDate()}</strong></button>})}</div>
        <div className="calendar-body">
          {showCurrentLine&&<div className="current-time-line" style={{top:lineTop}}><span/></div>}
          <div className="time-gutter">{hours.map(hour=><span key={hour} style={{top:(hour-START_HOUR)*HOUR_HEIGHT+4}}>{String(hour).padStart(2,'0')}:00</span>)}</div>
          <div className="calendar-days">{days.map(day=>{
            const current=day.toDateString()===new Date().toDateString(),dayItems=items.filter(item=>new Date(item.startsAt).toDateString()===day.toDateString());
            return <div className={`calendar-day ${current?'today':''}`} key={day.toISOString()} style={{height:(END_HOUR-START_HOUR)*HOUR_HEIGHT}}>
              {hours.map(hour=>{const slot=new Date(day);slot.setHours(hour,0,0,0);const past=slot.getTime()<Date.now();return <button disabled={past} aria-label={`Criar sessão às ${hour}:00`} className={`hour-slot ${past?'past':''}`} key={hour} onClick={()=>openSlot(day,hour)} style={{top:(hour-START_HOUR)*HOUR_HEIGHT,height:HOUR_HEIGHT}}/>})}
              {dayItems.map(item=>{const start=new Date(item.startsAt),finish=new Date(item.endsAt),startMinutes=start.getHours()*60+start.getMinutes(),endMinutes=finish.getHours()*60+finish.getMinutes(),top=Math.max(0,(startMinutes-START_HOUR*60)/60*HOUR_HEIGHT),height=Math.max(30,(endMinutes-startMinutes)/60*HOUR_HEIGHT),tooltip=item.notes?`Observação: ${item.notes}`:undefined;return <button key={item.id} title={tooltip} style={{top,height}} className={`session-card ${item.status.toLowerCase()}`} onClick={()=>setEditing(item)}><time>{start.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}–{finish.toLocaleTimeString('pt-BR',{hour:'2-digit',minute:'2-digit'})}{item.notes&&<span className="note-indicator" aria-label="Possui observação"> ●</span>}</time><strong>{item.patientName}</strong><small>{statusLabels[item.status]} · {item.modality==='ONLINE'?'Online':'Presencial'}</small></button>})}
            </div>})}</div>
        </div>
      </div>
    </section>
    {(editing||draft)&&<SessionModal item={editing} initial={draft} patients={patients.filter(p=>p.active)} close={()=>{setEditing(null);setDraft(null)}} save={async data=>{if(editing)await api.updateSession(session,editing.id,data);else await api.createSession(session,data);setEditing(null);setDraft(null);await load()}}/>}
  </>
}

function SessionModal({item,initial,patients,close,save}:{item:Appointment|null;initial:Date|null;patients:Patient[];close:()=>void;save:(data:object)=>Promise<void>}){
  const[error,setError]=useState(''),[busy,setBusy]=useState(false),start=item?.startsAt??initial??new Date(),finish=item?.endsAt??new Date(new Date(start).getTime()+60*60000);
  async function submit(event:FormEvent<HTMLFormElement>){event.preventDefault();setBusy(true);setError('');const f=new FormData(event.currentTarget);try{await save({patientId:f.get('patientId'),startsAt:new Date(String(f.get('startsAt'))).toISOString(),endsAt:new Date(String(f.get('endsAt'))).toISOString(),modality:f.get('modality'),status:f.get('status'),meetingLink:f.get('meetingLink')||null,notes:f.get('notes')||null})}catch(e){setError(e instanceof Error?e.message:'Não foi possível salvar a sessão');setBusy(false)}}
  return <div className="modal-backdrop"><section className="modal"><div className="modal-head"><h2>{item?'Editar sessão':'Nova sessão'}</h2><button onClick={close}>×</button></div><form className="form-grid" onSubmit={submit}><label className="span">Paciente<select name="patientId" defaultValue={item?.patientId} required><option value="">Selecione</option>{patients.map(p=><option key={p.id} value={p.id}>{p.fullName}</option>)}</select></label><label>Início<input name="startsAt" type="datetime-local" min={item?undefined:localValue(new Date())} defaultValue={localValue(start)} required/></label><label>Término<input name="endsAt" type="datetime-local" defaultValue={localValue(finish)} required/></label><label>Modalidade<select name="modality" defaultValue={item?.modality??'PRESENTIAL'}><option value="PRESENTIAL">Presencial</option><option value="ONLINE">Online</option></select></label><label>Status<select name="status" defaultValue={item?.status??'SCHEDULED'}><option value="SCHEDULED">Agendada</option><option value="CONFIRMED">Confirmada</option><option value="COMPLETED">Realizada</option><option value="CANCELED">Cancelada</option><option value="NO_SHOW">Não compareceu</option></select></label><label className="span">Link da sessão (opcional)<input name="meetingLink" type="url" defaultValue={item?.meetingLink??''} maxLength={500}/></label><label className="span">Observação (opcional)<input name="notes" defaultValue={item?.notes??''} maxLength={500}/></label>{error&&<div className="error span">{error}</div>}<div className="form-actions span"><button type="button" className="ghost" onClick={close}>Cancelar</button><button className="primary" disabled={busy}>{busy?'Salvando…':'Salvar sessão'}</button></div></form></section></div>
}
