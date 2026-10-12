import { describe,it,expect } from "vitest";
import { filterFinance,financeTotals,localDate } from "./finance";
import type {Appointment} from "./api";
const item=(overrides:Partial<Appointment>):Appointment=>({id:"1",patientId:"p",patientName:"Ana",startsAt:"2026-10-01T01:00:00Z",endsAt:"2026-10-01T02:00:00Z",modality:"ONLINE",status:"COMPLETED",meetingLink:null,notes:null,financialAmount:100,paymentStatus:"PENDING",...overrides});
describe("financial filters and totals",()=>{
 it("uses professional timezone for session date",()=>{expect(localDate("2026-10-01T01:00:00Z","America/Sao_Paulo")).toBe("2026-09-30");expect(filterFinance([item({})],"America/Sao_Paulo","2026-10-01","2026-10-31","","SESSION")).toHaveLength(0);});
 it("filters by payment date and excludes undated payments in a period",()=>{expect(filterFinance([item({}),item({paymentStatus:"PAID",paymentDate:"2026-10-12"})],"America/Sao_Paulo","2026-10-01","2026-10-31","","PAYMENT")).toHaveLength(1);});
 it("excludes cancellation and exemptions from financial total and rounds cents",()=>{expect(financeTotals([item({financialAmount:0.1,paymentStatus:"PAID"}),item({financialAmount:0.2}),item({financialAmount:50,paymentStatus:"EXEMPT"}),item({status:"CANCELED",paymentStatus:"PAID"}),item({paymentStatus:"CANCELED"})])).toEqual({received:0.1,pending:0.2,exempt:50,total:0.3});});
 it("applies status to the same records used for totals",()=>{const rows=filterFinance([item({}),item({paymentStatus:"PAID"})],"America/Sao_Paulo","","","PENDING","SESSION");expect(financeTotals(rows)).toEqual({received:0,pending:100,exempt:0,total:100});});
});
