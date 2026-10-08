import type { Finding, PlaybookId } from "@/types";
import { cancelSubscription } from "./cancelSubscription";
import { collectOverdue } from "./collectOverdue";
import { escalateCourier } from "./escalateCourier";
import { followUpLeads } from "./followUpLeads";
import { reorderStock } from "./reorderStock";
import { scheduleRenewal } from "./scheduleRenewal";
import type { Playbook } from "./shared";

export const PLAYBOOKS: Record<PlaybookId, Playbook> = { followUpLeads, collectOverdue, cancelSubscription, escalateCourier, reorderStock, scheduleRenewal };

export function playbook(id: PlaybookId): Playbook {
  return PLAYBOOKS[id];
}

/** The playbooks a finding offers, in the finding's own order. */
export function playbooksFor(finding: Finding): Playbook[] {
  return finding.playbooks.map((id) => PLAYBOOKS[id]);
}

export type { Playbook, Labels } from "./shared";
export { nextFriday } from "./shared";
