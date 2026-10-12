import {afterEach,it,expect,vi} from "vitest";
import {api,type Session} from "./api";
const session:Session={accessToken:"professional-token",userId:"u",professionalId:"p",name:"Ana",role:"PROFESSIONAL"};
afterEach(()=>vi.restoreAllMocks());
it("sends financial filters and pagination with professional authorization",async()=>{
 const result={entries:{content:[],page:1,totalElements:30,totalPages:2},totals:{received:1000,pending:500,exempt:0,total:1500}};
 const mock=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify(result),{status:200}));
 expect(await api.professionalFinance(session,{patientId:"patient",from:"2026-10-01",to:"2026-10-31",basis:"PAYMENT",status:"PAID",method:"PIX",page:1,size:20})).toEqual(result);
 const [url,options]=mock.mock.calls[0];const params=new URL(String(url)).searchParams;
 expect(new URL(String(url)).pathname).toBe("/api/v1/sessions/finance");expect(Object.fromEntries(params)).toEqual({patientId:"patient",from:"2026-10-01",to:"2026-10-31",basis:"PAYMENT",status:"PAID",method:"PIX",page:"1",size:"20"});expect(options?.headers).toEqual({Authorization:"Bearer professional-token"});
});
it("can query an unrestricted period and unspecified payment methods",async()=>{
 const mock=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response(JSON.stringify({entries:{content:[],totalElements:0},totals:{received:0,pending:0,exempt:0,total:0}}),{status:200}));
 await api.professionalFinance(session,{from:"",to:"",unspecifiedMethod:true});expect(new URL(String(mock.mock.calls[0][0])).search).toBe("?unspecifiedMethod=true");
});
