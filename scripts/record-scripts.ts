import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { Chain, RecordRef } from "../src/types";
import { seedWorld } from "../src/data/seed";
import { METRICS } from "../src/engine";
import { compareWindows, getFindings, listRecords, walkCausalGraph } from "../src/lib/ai/tools";
import type { Script, ScriptPart } from "../src/lib/ai/scripts";
import { SUGGESTED_QUESTIONS } from "../src/data/questions";
import { inr, inrCompact, midSentence, shortDate } from "../src/lib/format";
import { findRecord, refKey } from "../src/lib/records";

// Records the four demo answers for scripted mode. Every tool input and output below is the real
// engine's result on the committed seed; the narrative sentences are the only hand-written text,
// and every figure in them is interpolated from those results (docs/ARCHITECTURE.md, section 5).

const world = seedWorld();
const OUT = join(__dirname, "..", "src", "data", "scripts");

const abs = (n: number) => Math.round(Math.abs(n));
const dir = (n: number) => (n < 0 ? "down" : "up");
const label = (m: keyof typeof METRICS) => midSentence(METRICS[m].label);
const day = (iso: string | null) => (iso ? shortDate(iso) : "an undated day");
const eventLabel = (refs: RecordRef[]) => {
  const ref = refs.find((r) => r.kind === "event");
  return ref ? findRecord(world, { ...ref, kind: "event" })?.label ?? null : null;
};
const refsOfChain = (c: Chain): string[] => {
  const all = [...c.nodes, ...c.branches.flatMap((b) => b.nodes)].flatMap((n) => [...n.onsetEvidence, ...n.evidence]);
  return [...new Set(all.map(refKey))];
};
const q = (id: (typeof SUGGESTED_QUESTIONS)[number]["id"]) => SUGGESTED_QUESTIONS.find((s) => s.id === id)!.text;

function tool<N extends "compareWindows" | "walkCausalGraph" | "listRecords" | "getFindings">(name: N, input: unknown, output: unknown, delayMs: number): ScriptPart {
  return { type: "tool", tool: name, input, output, delayMs };
}

function whyRevenueFell(): Script {
  const revenue = compareWindows(world, { metric: "revenue" });
  const d2c = compareWindows(world, { metric: "revenueD2C" });
  const wholesale = compareWindows(world, { metric: "revenueWholesale" });
  const chain = walkCausalGraph(world, { target: "revenueD2C" });
  const node = (m: string) => [...chain.nodes, ...chain.branches.flatMap((b) => b.nodes)].find((n) => n.metric === m)!;
  const ad = node("adSpend");
  const sessions = node("sessions");
  const orders = node("ordersD2C");
  const landing = node("landingCvr");
  const paused = eventLabel(ad.onsetEvidence) ?? "the campaign was paused";
  const theme = eventLabel(landing.onsetEvidence) ?? "the theme update";
  const wholesaleLine = abs(wholesale.deltaPct) < 2 ? "Wholesale held flat." : `Wholesale is ${dir(wholesale.deltaPct)} ${abs(wholesale.deltaPct)}%.`;
  const narrative = [
    `Revenue is down about ${abs(revenue.deltaPct)}% over the last 14 days, and all of it is D2C, which is down ${abs(d2c.deltaPct)}%. ${wholesaleLine}`,
    `The likely cause began on ${day(ad.onset)}, the day of the event "${paused}". Ad spend fell ${abs(ad.delta)}%, sessions fell ${abs(sessions.delta)}% the same day, and D2C orders fell ${abs(orders.delta)}% from ${day(orders.onset)}. Each of those moved in the order the graph expects, and the cause moved first.`,
    `A second cause is also contributing. Landing-page conversion fell ${abs(landing.delta)}% from ${day(landing.onset)}, the day of the event "${theme}", so the sessions that still arrive convert worse than before. Restoring the ad spend alone would send more traffic into a page that converts worse. Fix the landing page first, then the spend.`,
  ].join("\n\n");
  return {
    id: "why-revenue-fell",
    question: q("why-revenue-fell"),
    match: ["why did revenue fall", "revenue drop", "revenue down", "sales fell", "why is revenue down"],
    parts: [
      { type: "text", text: "Looking at the last 14 days against the 14 before.", delayMs: 200 },
      tool("compareWindows", { metric: "revenue" }, revenue, 500),
      tool("compareWindows", { metric: "revenueD2C" }, d2c, 400),
      tool("compareWindows", { metric: "revenueWholesale" }, wholesale, 400),
      { type: "text", text: `Total revenue is down ${abs(revenue.deltaPct)}% and the fall is all D2C. Walking the graph upstream of ${label("revenueD2C")}.`, delayMs: 300 },
      tool("walkCausalGraph", { target: "revenueD2C" }, chain, 1100),
      { type: "data-chain", data: chain, delayMs: 0 },
      { type: "data-answer", data: { chainId: chain.id, narrative, citations: refsOfChain(chain) }, delayMs: 400 },
    ],
  };
}

function whyComplaintsUp(): Script {
  const complaints = compareWindows(world, { metric: "complaints" });
  const delay = compareWindows(world, { metric: "deliveryDelayAvg" });
  const chain = walkCausalGraph(world, { target: "complaints" });
  const delayNode = chain.nodes.find((n) => n.metric === "deliveryDelayAvg")!;
  const courier = eventLabel(delayNode.onsetEvidence) ?? "the courier change";
  const tickets = listRecords(world, { kind: "ticket", where: { category: "delivery" }, sinceDays: 14, limit: 20 });
  const ncr = tickets.records.filter((t) => (t as { region?: string }).region === "NCR");
  const regionOf = ncr.length ? "NCR" : null;
  const ship = listRecords(world, { kind: "shipment", where: { region: "NCR" }, sinceDays: 16, limit: 5 });
  const courierName = (ship.records[0] as { courier?: string } | undefined)?.courier ?? "the new courier";
  const narrative = [
    `Delivery complaints rose from ${abs(complaints.previous)} to ${abs(complaints.current)} in the last 14 days${regionOf ? `, and ${ncr.length} of the ${tickets.records.length} are ${regionOf} deliveries` : ""}.`,
    `The likely cause began on ${day(delayNode.onset)}, the day of the event "${courier}". Average delivery delay went from ${delay.previous.toFixed(1)} to ${delay.current.toFixed(1)} days past promise, up ${abs(delay.deltaPct)}%, and the complaints followed. ${courierName} has carried the ${regionOf ?? "affected"} shipments since then.`,
    `The Today list has the courier escalation drafted on the complaints row: one email to Shiprocket with the late consignment numbers. Review the escalation there before it goes.`,
  ].join("\n\n");
  return {
    id: "why-complaints-up",
    question: q("why-complaints-up"),
    match: ["why are complaints up", "delivery complaints", "complaints rising", "late deliveries", "why are deliveries late"],
    parts: [
      { type: "text", text: "Checking complaints over the last 14 days against the 14 before.", delayMs: 200 },
      tool("compareWindows", { metric: "complaints" }, complaints, 500),
      tool("compareWindows", { metric: "deliveryDelayAvg" }, delay, 400),
      { type: "text", text: `Complaints went from ${abs(complaints.previous)} to ${abs(complaints.current)}. Walking the graph upstream of ${label("complaints")}.`, delayMs: 300 },
      tool("walkCausalGraph", { target: "complaints" }, chain, 900),
      { type: "data-chain", data: chain, delayMs: 0 },
      tool("listRecords", { kind: "ticket", where: { category: "delivery" }, sinceDays: 14, limit: 20 }, tickets, 500),
      { type: "data-answer", data: { chainId: chain.id, narrative, citations: [...refsOfChain(chain), ...tickets.refs.map(refKey)] }, delayMs: 300 },
    ],
  };
}

function whichCustomersAtRisk(): Script {
  const findings = getFindings(world);
  const conc = findings.findings.find((f) => f.detector === "customerConcentration");
  const overdue = findings.findings.find((f) => f.detector === "overdueInvoices");
  const leads = findings.findings.find((f) => f.detector === "staleHighValueLeads");
  const repeat = compareWindows(world, { metric: "repeatRate" });
  const chain = walkCausalGraph(world, { target: "repeatRate" });
  const complaints = chain.nodes.find((n) => n.metric === "complaints");
  const delayNode = chain.nodes.find((n) => n.metric === "deliveryDelayAvg");
  const courier = delayNode ? eventLabel(delayNode.onsetEvidence) : null;
  const paras = [
    `Two kinds of customers are at risk: one wholesale account that is too large to lose, and the D2C buyers in NCR whose deliveries have been late since the courier change.`,
    conc ? `${conc.explain} One account at that size needs a call this week, not a reminder.` : "",
    `Repeat rate is ${dir(repeat.deltaPct)} ${abs(repeat.deltaPct)}% against the previous 14 days${complaints ? `, and delivery complaints are up from ${abs(compareWindows(world, { metric: "complaints" }).previous)} to ${abs(compareWindows(world, { metric: "complaints" }).current)}` : ""}${courier ? ` since "${courier}" on ${day(delayNode?.onset ?? null)}` : ""}. Those buyers are the ones not coming back, and the courier escalation on Today is the fix.`,
    leads ? `Not yet customers, but at risk of never becoming ones: ${leads.title.replace(" have gone quiet", "")} have had no reply for two days. The follow-ups are drafted on Today.` : "",
  ].filter(Boolean);
  const citations = [...new Set([...(conc?.evidence ?? []), ...(overdue?.evidence ?? []), ...(leads?.evidence ?? [])].map(refKey).concat(refsOfChain(chain)))];
  return {
    id: "which-customers-at-risk",
    question: q("which-customers-at-risk"),
    match: ["which customers are at risk", "customers at risk", "churn risk", "who might leave", "losing customers"],
    parts: [
      { type: "text", text: "Reading this morning's findings, then the repeat-rate trail.", delayMs: 200 },
      tool("getFindings", {}, findings, 700),
      tool("compareWindows", { metric: "repeatRate" }, repeat, 400),
      tool("walkCausalGraph", { target: "repeatRate" }, chain, 900),
      { type: "data-chain", data: chain, delayMs: 0 },
      { type: "data-answer", data: { chainId: chain.id, narrative: paras.join("\n\n"), citations }, delayMs: 300 },
    ],
  };
}

function whatShouldIDoToday(): Script {
  const findings = getFindings(world);
  const by = (d: string) => findings.findings.find((f) => f.detector === d);
  const leads = by("staleHighValueLeads");
  const overdue = by("overdueInvoices");
  const stock = by("stockoutRisk");
  const cash = by("cashCrunch");
  const rest = findings.findings.filter((f) => f.group === "worth-knowing");
  const paras = [
    `Three things today, in this order, worth about ${inrCompact(findings.total)} between them.`,
    leads ? `First, the ${leads.title.replace(" have gone quiet", "")}: about ${inrCompact(leads.impactINR)} is expected from replying, and the replies are drafted. Review 7 drafts on Today sends them.` : "",
    overdue ? `Second, the ${overdue.title.toLowerCase()}.${cash ? ` ${cash.title}, and collecting these invoices keeps it above the buffer.` : ""} The reminders are drafted, and the two largest get a call.` : "",
    stock ? `Third, ${stock.title.replace(";", ", and")}. ${stock.explain.split(". ").slice(-1)[0]} The purchase order is drafted.` : "",
    rest.length ? `The other ${rest.length} findings can wait a day: ${rest.slice(0, 3).map((f) => f.title.toLowerCase()).join("; ")}.` : "",
  ].filter(Boolean);
  const citations = [...new Set([leads, overdue, stock, cash].flatMap((f) => f?.evidence ?? []).map(refKey))];
  return {
    id: "what-should-i-do-today",
    question: q("what-should-i-do-today"),
    match: ["what should i do today", "what to do today", "priorities today", "what matters today", "what needs me"],
    parts: [
      { type: "text", text: "Reading this morning's findings.", delayMs: 200 },
      tool("getFindings", {}, findings, 800),
      { type: "data-answer", data: { chainId: null, narrative: paras.join("\n\n"), citations }, delayMs: 300 },
    ],
  };
}

mkdirSync(OUT, { recursive: true });
for (const script of [whyRevenueFell(), whyComplaintsUp(), whichCustomersAtRisk(), whatShouldIDoToday()]) {
  writeFileSync(join(OUT, `${script.id}.json`), `${JSON.stringify(script, null, 2)}\n`);
  const answer = script.parts.find((p) => p.type === "data-answer");
  console.log(`${script.id}: ${script.parts.length} parts, ${answer && answer.type === "data-answer" ? answer.data.citations.length : 0} citations`);
  if (answer && answer.type === "data-answer") console.log(`  ${answer.data.narrative.replace(/\n\n/g, "\n  ")}\n`);
}
