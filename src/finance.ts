import type { Appointment, PaymentStatus } from "./api";
export function localDate(value: string | Date, timezone: string) {
  const parts = Object.fromEntries(new Intl.DateTimeFormat("en-US", { timeZone: timezone, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(new Date(value)).map(part => [part.type, part.value]));
  return `${parts.year}-${parts.month}-${parts.day}`;
}
export function financeStatus(item: Appointment): PaymentStatus {return item.status === "CANCELED" ? item.paymentStatus === "EXEMPT" ? "EXEMPT" : "CANCELED" : item.paymentStatus ?? "PENDING";}
export function filterFinance(items: Appointment[], timezone: string, from: string, to: string, status: string, basis: string) {
  return items.filter(item => {
    const day = basis === "PAYMENT" ? item.paymentDate : localDate(item.startsAt, timezone);
    return (!status || financeStatus(item) === status) && (!from && !to || !!day && (!from || day >= from) && (!to || day <= to));
  });
}
export function financeTotals(items: Appointment[]) {
  const total = (status: PaymentStatus) => items.filter(item => item.status !== "CANCELED" && financeStatus(item) === status).reduce((sum, item) => sum + Math.round(Number(item.financialAmount ?? 0) * 100), 0) / 100;
  const received=total("PAID"), pending=total("PENDING"), exempt=total("EXEMPT");
  return {received,pending,exempt,total: Math.round((received+pending)*100)/100};
}
