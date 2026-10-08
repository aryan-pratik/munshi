import type { Draft, Effect, Finding, Lead, World } from "@/types";
import { LEAD_ANSWERS, TEMPLATES, fill } from "@/data/rules/playbooks";
import { SIGNATURE } from "@/data/rules/tone";
import { inrCompact } from "@/lib/format";
import { nowAt } from "../windows";
import { leadWinRate } from "../detectors/leads";
import { first, nextFriday, num, plural, refsOf, step, taskRecord, type Playbook } from "./shared";

function leadsOf(world: World, finding: Finding): Lead[] {
  const ids = new Set(refsOf(finding, "lead").map((r) => r.id));
  return world.leads.filter((l) => ids.has(l.id));
}

/** What the buyer asked last: the open question the summary carries, else the last inbound message. */
function openQuestion(world: World, lead: Lead): string {
  const m = lead.summary.match(/Open question: (.*)$/);
  if (m) return m[1];
  const inbound = lead.thread.map((r) => world.messages.find((x) => x.id === r.id)).filter((x) => x && x.direction === "in").pop();
  return inbound?.body ?? "";
}

function askOf(lead: Lead): string {
  const m = lead.summary.match(/\((.*?)\)\. Quoted/);
  return m ? m[1] : "order";
}

export function draftFor(world: World, lead: Lead): Draft {
  const question = openQuestion(world, lead);
  const answerT = LEAD_ANSWERS.find((a) => a.match.test(question))!;
  const qtyMatch = lead.summary.match(/wants (.*?) \(/);
  const qty = qtyMatch ? qtyMatch[1] : "the order";
  // A bigger quantity the buyer floated ("60 mug sets instead of 40", "go to 24 sets") reprices the quote.
  const asked = question.match(/(?:do|to) (\d+ [a-z]+(?: [a-z]+)?)(?: instead| if|\?)/i)?.[1] ?? qty;
  const n0 = parseInt(qty, 10);
  const n1 = parseInt(asked, 10);
  const scale = Number.isFinite(n0) && Number.isFinite(n1) && n0 > 0 ? n1 / n0 : 1;
  const discount = /discount/i.test(question) ? 0.95 : 1;
  const slots = { qty, askedQty: asked, est: num(lead.estValueINR), estAsked: num(lead.estValueINR * scale * discount), city: lead.city };
  const answer = fill(lead.channel === "whatsapp" ? answerT.whatsapp : answerT.email, slots);
  const body = fill(TEMPLATES.followUpLeads[lead.channel], { first: first(lead.contact), ask: askOf(lead), answer, signature: SIGNATURE.email });
  return {
    id: `draft:${lead.id}`,
    to: { source: lead.source, kind: "lead", id: lead.id },
    channel: lead.channel,
    ...(lead.channel === "email" ? { subject: `Re: Quote: ${lead.shop}` } : {}),
    body,
    refs: lead.thread.slice(-2),
  };
}

export const followUpLeads: Playbook = {
  id: "followUpLeads",
  appliesTo: ["staleHighValueLeads", "conversionDrop"],
  plan(world, finding) {
    const leads = leadsOf(world, finding);
    const n = leads.length;
    return [
      step("read", "read", `Read the ${plural(n, "thread")} and the question each buyer left open`),
      step("draft", "draft", `Draft a reply per lead in Meera's tone, on the channel they wrote on`),
      step("approve", "approve", "You approve, edit or drop each draft"),
      step("send", "send", `Send ${n} on WhatsApp and email`),
      step("remind", "remind", `Set a reminder to check back on Friday`),
      step("update", "update", "Update last contact on each lead in the CRM"),
    ];
  },
  drafts(world, finding) {
    return leadsOf(world, finding).map((l) => draftFor(world, l));
  },
  apply(world, finding, approved) {
    const at = nowAt(world);
    const leads = leadsOf(world, finding).filter((l) => approved.some((d) => d.to.id === l.id));
    const effects: Effect[] = [];
    leads.forEach((l, i) => {
      const draft = approved.find((d) => d.to.id === l.id)!;
      effects.push({
        op: "create",
        collection: "messages",
        record: {
          id: `msg:${finding.id}:${l.id}`,
          source: l.source,
          createdAt: at,
          threadId: l.id,
          channel: l.channel,
          direction: "out",
          from: SIGNATURE.owner,
          to: l.contact,
          ...(draft.subject ? { subject: draft.subject } : {}),
          body: draft.body,
          at,
          leadId: l.id,
        },
      });
      effects.push({ op: "set", collection: "leads", id: l.id, patch: { lastContactedAt: at, stage: "quoted" } });
      void i;
    });
    if (leads.length) {
      effects.push({
        op: "create",
        collection: "tasks",
        record: taskRecord(world, `task:${finding.id}`, `Check back on ${plural(leads.length, "quote")} worth ${inrCompact(leads.reduce((s, l) => s + l.estValueINR, 0))}`, nextFriday(world), leads.map((l) => ({ source: l.source, kind: "lead" as const, id: l.id }))),
      });
    }
    return effects;
  },
  expectedImpact(world, finding) {
    const leads = leadsOf(world, finding);
    const quoted = leads.reduce((s, l) => s + l.estValueINR, 0);
    const rate = leadWinRate(world);
    return { inr: finding.impactINR, horizonDays: 14, basis: `${inrCompact(quoted)} quoted across ${plural(leads.length, "lead")}, at the ${Math.round(rate * 100)}% rate quotes like these close` };
  },
  labels(n) {
    return { review: `Review ${plural(n, "draft")}`, approve: `Approve and send ${n}`, working: `Sending ${n}…`, done: `${plural(n, "follow-up")} sent` };
  },
};
