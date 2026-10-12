import {afterEach,it,expect,vi} from "vitest";
import {api,type Session} from "./api";
const session:Session={accessToken:"token",userId:"u",professionalId:"p",name:"Ana",role:"PROFESSIONAL"};
afterEach(()=>vi.restoreAllMocks());
it("sends scope and reason to the rescheduling endpoint",async()=>{const mock=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response("[]",{status:200}));const payload={startsAt:"2030-10-12T12:00:00Z",endsAt:"2030-10-12T13:00:00Z",scope:"FOLLOWING" as const,reason:"Nova rotina"};await api.rescheduleSession(session,"id",payload);expect(String(mock.mock.calls[0][0])).toContain("/sessions/id/reschedule");expect(mock.mock.calls[0][1]?.method).toBe("PATCH");expect(JSON.parse(String(mock.mock.calls[0][1]?.body))).toEqual(payload);});
it("reads rescheduling history with authentication",async()=>{const mock=vi.spyOn(globalThis,"fetch").mockResolvedValue(new Response("[]",{status:200}));await api.rescheduleHistory(session,"id");expect(String(mock.mock.calls[0][0])).toContain("/sessions/id/reschedule/history");expect(mock.mock.calls[0][1]?.headers).toEqual({Authorization:"Bearer token"});});
