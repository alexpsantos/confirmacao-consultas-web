// Calendar dates use UTC only as a container for civil dates, never as appointment instants.
export const DEFAULT_TIMEZONE = "America/Sao_Paulo";
export function localValue(value: Date | string, timezone: string) {
 const parts=Object.fromEntries(new Intl.DateTimeFormat("en-CA",{timeZone:timezone,year:"numeric",month:"2-digit",day:"2-digit",hour:"2-digit",minute:"2-digit",hourCycle:"h23"}).formatToParts(new Date(value)).map(p=>[p.type,p.value]));
 return `${parts.year}-${parts.month}-${parts.day}T${parts.hour}:${parts.minute}`;
}
export function dateValue(value: Date | string, timezone: string){return localValue(value,timezone).slice(0,10);}
export function toInstant(value: string, timezone: string){
 if(!/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(value))throw new Error("Informe uma data e horário válidos");
 const wall=Date.parse(value+":00Z"); let candidate=wall;
 for(let i=0;i<4;i++){const represented=Date.parse(localValue(new Date(candidate),timezone)+":00Z");const delta=wall-represented;if(!delta) return new Date(candidate).toISOString();candidate+=delta;}
 throw new Error("Este horário não existe no fuso escolhido. Selecione outro horário.");
}
export function civilDate(value: string){return new Date(value.slice(0,10)+"T00:00:00Z");}
export function addDays(value: Date,n: number){const d=new Date(value);d.setUTCDate(d.getUTCDate()+n);return d;}
export function monday(value: Date){return addDays(value,-((value.getUTCDay()+6)%7));}
export function civilInstant(value: Date,timezone: string,hour=0){const d=new Date(value);d.setUTCHours(hour,0,0,0);return new Date(toInstant(d.toISOString().slice(0,16),timezone));}
export function minutes(value: Date | string,timezone: string){const clock=localValue(value,timezone).slice(11);return Number(clock.slice(0,2))*60+Number(clock.slice(3));}
export function weekday(value: Date | string,timezone: string){return civilDate(dateValue(value,timezone)).getUTCDay();}
