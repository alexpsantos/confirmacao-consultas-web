import {describe,it,expect} from "vitest";
import {localValue,dateValue,toInstant,civilDate,civilInstant,addDays,monday,minutes,weekday} from "./timezone";
const zones=[['America/Sao_Paulo','2026-10-14T12:00:00.000Z'],['America/Rio_Branco','2026-10-14T14:00:00.000Z'],['America/Noronha','2026-10-14T11:00:00.000Z'],['America/Campo_Grande','2026-10-14T13:00:00.000Z']];
describe('professional timezone',()=>{
 it.each(zones)('converts scheduling and editing in %s independently of computer timezone',(zone,instant)=>{expect(toInstant('2026-10-14T09:00',zone)).toBe(instant);expect(localValue(instant,zone)).toBe('2026-10-14T09:00');expect(minutes(instant,zone)).toBe(540);});
 it('assigns sessions around midnight to the correct day',()=>{expect(dateValue('2026-10-14T03:30:00Z','America/Rio_Branco')).toBe('2026-10-13');expect(dateValue('2026-10-14T03:30:00Z','America/Sao_Paulo')).toBe('2026-10-14');expect(weekday('2026-10-14T03:30:00Z','America/Rio_Branco')).toBe(2);});
 it('queries a whole selected week using civil dates',()=>{const start=monday(civilDate('2026-10-14'));expect(civilInstant(start,'America/Rio_Branco').toISOString()).toBe('2026-10-12T05:00:00.000Z');expect(civilInstant(addDays(start,7),'America/Rio_Branco').toISOString()).toBe('2026-10-19T05:00:00.000Z');});
 it('ends date filters at midnight of the next day',()=>{expect(civilInstant(addDays(civilDate('2026-10-18'),1),'America/Sao_Paulo').toISOString()).toBe('2026-10-19T03:00:00.000Z');});
 it('honors seasonal offsets and rejects nonexistent local hours',()=>{expect(toInstant('2030-01-15T09:00','America/New_York')).toBe('2030-01-15T14:00:00.000Z');expect(toInstant('2030-07-15T09:00','America/New_York')).toBe('2030-07-15T13:00:00.000Z');expect(()=>toInstant('2030-03-10T02:30','America/New_York')).toThrow('não existe');});
});
