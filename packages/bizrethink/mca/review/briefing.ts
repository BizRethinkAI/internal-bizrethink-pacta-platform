import { INSTRUMENTS, MCA_INSTRUMENTS, type McaInstrument } from '../clauses/instruments';
import type { McaTenant } from '../clauses/parties';
import { JURISDICTION_NAMES, MCA_JURISDICTIONS } from '../jurisdictions';
import { reviewProfileDescription } from './numbered-library';

/**
 * What an attorney is told before the first clause.
 *
 * WHY THIS MODULE EXISTS. The review link was opened as counsel would open it,
 * and what came back was a funder's name, a clause count and a hundred
 * paragraphs of contract text. Everything a reader needs in order to know what
 * they are reading was missing: what business this is, who is asking, what they
 * are being asked to decide, what an approval would cause, which of six
 * documents they are holding, what is deliberately not in front of them, and
 * where a comment goes. The page was not thin — it was unusable, because a
 * lawyer cannot review a document whose purpose has not been stated.
 *
 * WHY IT IS DERIVED RATHER THAN TYPED INTO THE ROUTE. Six agreements go out on
 * these links and they are not interchangeable. The ISO PRA is read by a
 * broker's counsel and is the one document a merchant must never be handed. The
 * Equipment Lease and the Subscription are the same document with its
 * vocabulary swapped, so a change proposed to one is a change to two live
 * templates. Prose typed into a page renders the same sentences for all six,
 * and the sentence that is wrong for one of them is the one nobody notices.
 *
 * WHY IT SAYS WHAT IS *NOT* HERE AT SUCH LENGTH. Two of counsel's likeliest
 * wasted hours are structural rather than careless. An MCA deal is a set of
 * documents and a link carries exactly one, so a reader who assumes the set is
 * complete reviews an incomplete deal. And the state disclosure forms are a
 * separate surface entirely — the regulator's prescribed words, quoted verbatim
 * — so an attorney who begins marking up disclosure language is redrafting text
 * no approval of theirs can change. Both are cheap to say and expensive to
 * leave unsaid.
 *
 * WHERE COMMENTS GO. There is a box under every clause, and the briefing says
 * so and says what a finding does — an unanswered one blocks approval of its
 * clause, which is what separates it from a comment box.
 *
 * THIS SECTION SAID THE OPPOSITE ONE REVISION AGO, because the page did.
 * Findings were refused on the grounds that the two adversarial DOCUMENT
 * reviews keep their dispositions in `lombard-contracts` manifests and a second
 * register would drift from the first. That reason was real; the conclusion
 * drawn from it was too wide. Nothing counsel writes here is a second copy of a
 * manifest finding — it arrives only on a link we minted, it is attributable to
 * the reviewer named on that link, and no manifest has ever held one. One
 * register per origin, and both pages label which origin a finding came from.
 */

export type BriefingSection = {
  /** Stable key, for the page's list rendering. Never shown. */
  id: string;
  title: string;
  /** Paragraphs, in order. */
  body: string[];
};

export type BriefingInput = {
  instrument: McaInstrument;
  /** Whose paper this is. The briefing names real parties, never placeholders. */
  tenant: McaTenant;
  clauseCount: number;
  approvedCount: number;
  /**
   * How many of those clauses the document does not number.
   *
   * MEASURED, NOT REMEMBERED. The sentence this feeds used to say "forty
   * clauses across the library carry no number". Twenty-nine do; forty is the
   * count carrying no HEADING. Two different facts, one of them printed to an
   * attorney as the other — and per agreement rather than per library, because
   * the briefing is per agreement and a reader counting the clauses in front of
   * her is entitled to reach the same number.
   */
  unnumberedCount: number;
  /** Who minted the link. Null when the row does not resolve to a person. */
  sender: { name: string; email: string } | null;
  /** Null means the link lives until staff close it. */
  expiresAt: Date | null;
  now: Date;
};

/** `22 September 2026`. Written out, because `22/09/2026` is two dates. */
const onDate = (date: Date): string =>
  new Intl.DateTimeFormat('en-GB', { day: 'numeric', month: 'long', year: 'numeric', timeZone: 'UTC' }).format(date);

/** `A, B and C` — an Oxford-comma-free list, because these are read aloud. */
const listOf = (items: string[]): string =>
  items.length <= 1 ? (items[0] ?? '') : `${items.slice(0, -1).join(', ')} and ${items[items.length - 1]}`;

/**
 * Who signs opposite, said in the terms that change how the document is read.
 *
 * `instruments.ts` argues that `merchant` and `iso-partner` are not two names
 * for a counterparty but two regulatory positions — a merchant is a **recipient**
 * owed a disclosure, an ISO partner is a *broker* owed nothing and constrained
 * in what it may say. A reader who does not know which of those is opposite
 * them is reviewing the wrong document.
 */
const counterpartyNote = (instrument: McaInstrument, tenant: McaTenant): string[] => {
  const record = INSTRUMENTS[instrument];

  switch (record.counterparty) {
    case 'merchant':
      return [
        `A merchant — the small business taking the funding — signs this opposite ${tenant.parties.funder}. Under the disclosure regimes that now cover this product a merchant is a **recipient**: a party the regulator treats as owed protection rather than as a commercial equal. Read it as text that will be put in front of someone who is not represented by counsel and who is, in most cases, reading it for the first time on the day they sign.`,
      ];
    case 'iso-partner':
      return [
        `An ISO partner — an independent broker that introduces merchants — signs this opposite ${tenant.parties.funder}. This is the one agreement in the set that no merchant is ever handed, and that is not an incidental fact about distribution. A broker is regulated as a **broker**: California and New York constrain what it may say to a merchant, and §2.6 of this agreement exists because of that. You are reading the contract that governs how a merchant is **not** to be sold to.`,
      ];
    case 'processor':
      return [
        `A card processor — ${tenant.parties.processor} — signs this opposite ${tenant.parties.funder}. It is an instruction to a third party to withhold a share of a merchant's card settlement proceeds and remit them, and no merchant is handed it as a standalone document. Its consequences land on a merchant even though a merchant is not the reader.`,
      ];
  }
};

/**
 * The warning that goes to the two documents that have a twin, and to no
 * others.
 *
 * REVIEW-02's finding, quoted in `instruments.ts`: the Subscription is the
 * Equipment Lease with its vocabulary swapped and its clause numbering
 * unchanged, so **every Equipment Lease finding lands twice, in two live
 * templates, and a fix applied to one and not the other is a divergence nothing
 * checks for**. `twins.ts` is the something that checks — but only after a fix
 * is written. Counsel proposing a change to §3.2 is proposing it to two
 * contracts and is owed that fact while proposing it.
 */
const TWINS: Partial<Record<McaInstrument, McaInstrument>> = {
  'equipment-lease': 'subscription',
  subscription: 'equipment-lease',
};

const twinNote = (instrument: McaInstrument): string[] => {
  const twin = TWINS[instrument];

  if (twin === undefined) {
    return [];
  }

  return [
    `**This agreement has a twin.** The ${INSTRUMENTS[instrument].title} and the ${INSTRUMENTS[twin].title} are the same document with its vocabulary swapped, and their clause numbering is the same throughout. Five clauses genuinely differ — all but one of them because title to the equipment can pass under one and cannot under the other. Every other clause is the same bargain in different words, so a change you propose here is a change to two live contracts, and we will apply it to both.`,
  ];
};

/** The five agreements this link does not carry. */
const theOthers = (instrument: McaInstrument): string =>
  listOf(MCA_INSTRUMENTS.filter((id) => id !== instrument).map((id) => `the ${INSTRUMENTS[id].title}`));

export const counselBriefing = (input: BriefingInput): BriefingSection[] => {
  const { instrument, tenant, clauseCount, approvedCount, unnumberedCount, sender } = input;
  const record = INSTRUMENTS[instrument];
  const funder = tenant.parties.funder;

  /*
    WHERE A COMMENT GOES, and the fallback when the row does not resolve to a
    person. "Reply to whoever sent you this link" is weaker than a name and an
    address, and it is still an answer; printing `null` where a name belongs
    would be worse than either.
  */
  const replyTo =
    sender === null ? 'Reply to whoever sent you this link.' : `Reply to ${sender.name} at ${sender.email}.`;

  const expiry =
    input.expiresAt === null
      ? 'This link stays open until it is revoked by hand.'
      : `This link expires on ${onDate(input.expiresAt)}, after which it stops resolving and you will need a fresh one.`;

  return [
    {
      id: 'who',
      title: 'Who is asking, and what this business is',
      body: [
        `${funder} funds small businesses by buying a share of their future card receipts at a discount, and collecting it as a fixed percentage of each day's card settlements rather than as a scheduled payment. The transaction is drafted as a **purchase of receivables, not a loan**. That distinction is load-bearing rather than cosmetic — it is what puts the product outside most lending statutes and inside a newer set of disclosure regimes — and it is the first thing worth testing as you read.`,
        `Three parties are named throughout the set: **${tenant.parties.funder}**, which buys the receivables; **${tenant.parties.equipmentAffiliate}**, an affiliate that leases or licenses the payment hardware a merchant uses; and **${tenant.parties.processor}**, the card processor that withholds the agreed share at settlement and remits it. Where a clause names one of them, it is naming that role.`,
        `These are ${funder}'s own commercial drafting, not anyone's prescribed form. Nothing in this document was written by a regulator, and every word of it is ours to change on your advice.`,
      ],
    },
    {
      id: 'document',
      title: `What you are holding: the ${record.title}`,
      body: [
        `This link carries the library for the ${record.title} — ${clauseCount} review items in reading order, including alternative clauses, notes and field groups. Alternatives do not appear together in a selected agreement. It is one of six agreements that make up a funding transaction; the other five are listed further down and are not in front of you.`,
        ...counterpartyNote(instrument, tenant),
        ...twinNote(instrument),
      ],
    },
    {
      id: 'ask',
      title: 'What we are asking you to do',
      body: [
        `Read these clauses and tell us, clause by clause, whether they may be put in front of the counterparty as drafted. We are asking about enforceability, about whether the purchase characterisation survives the words we have used, and about anything that would embarrass us in front of a regulator or a court — not about house style.`,
        `An approval is recorded against **one clause's exact wording**, and it carries your name, your bar number and the jurisdiction you are admitted in. It is pinned to the words you read: if the clause is edited afterwards, the approval stops counting and the clause returns to unapproved rather than silently carrying your name on text you never saw.`,
        `That record is a gate, not a formality. **No clause in this library may be sent to a counterparty until an approval names the attorney who read it** — the software refuses to publish it. Nothing you see here has been sent to anyone.`,
        approvedCount === 0
          ? `As of today, **no clause in this agreement has been approved by anybody.** You are the first reader.`
          : `${approvedCount} of ${clauseCount} review items already carry a current approval; the rest do not, and are marked.`,
      ],
    },
    {
      id: 'scope',
      title: 'What is deliberately not in front of you',
      body: [
        `**The other five agreements.** A funding transaction is a set of documents, not one contract, and this link is scoped to one of them so that a change elsewhere in the set does not invalidate what you read here. The set is ${theOthers(instrument)}. If your reading of this document depends on what one of those says, ask and we will send it.`,
        `**The prescribed state disclosure forms.** ${listOf(MCA_JURISDICTIONS.map((id) => JURISDICTION_NAMES[id]))} each require a funder to hand a merchant a disclosure of the financing terms, several of them on a form whose wording, ordering and headings the state itself prescribes. Those are held separately in this system, quoted verbatim from the regulation, and they are **not ours to redraft** — an hour spent marking up disclosure language is an hour spent on text no approval can change. If you believe a prescribed form is being used wrongly, that is worth telling us; rewording it is not available to either of us.`,
        `**The commercial terms.** The «angle-bracketed numbers» you will see inside clauses are fill-in fields — advance amount, factor rate, the specified percentage, the merchant's own details. The numbers that land in them are underwritten per deal and are not part of this review. Where they sit in a sentence **is** part of it.`,
      ],
    },
    /*
      THE SECTION THAT USED TO SIT HERE IS GONE, AND ITS ABSENCE IS THE CHANGE.

      "What earlier readers found" told counsel that two adversarial reviews of
      these documents were recorded in a register and that anything undisposed
      was "quoted underneath the clause it concerns", then named a count: *"40
      of the 100 clauses below carry a finding that nothing has yet disposed
      of."*

      ADR 0012 closed the question those sentences answer — *"Do findings render
      to reviewing counsel? **No.** They are drafting input."* — and the
      annotations they pointed at are gone from the page. What is left of the
      paragraph once they are is worse than nothing: a register the reader is
      told about and cannot see, and a number that reads as "40% of this
      agreement has known unresolved problems, please approve it".

      The findings audited `Lombard_FRPA_v4`. Every FRPA clause has since been
      rewritten, so those notes described text that no longer existed — one of
      them asserting the exact opposite of the clause it sat under. They remain
      drafting input, in the register, where a drafter works from them.
    */
    {
      id: 'reading',
      title: 'How to read what follows',
      body: [
        `Each clause is shown in full — nothing is summarised, excerpted or tidied. **«Angle-bracketed numbers» are left in.** They are the fill-in fields the executed contract carries, and where one sits changes the sentence it sits in — "«7»% of daily receipts" is a different obligation depending on which side of the percentage the field falls. Stripping them would show you a document we do not publish.`,
        `**Numbers and cross-references are derived after selecting clauses.** This page shows the full library: the example selection and clearly marked alternatives. Alternative citations apply to their own example selection, so alternatives may repeat a number. ${unnumberedCount} of the ${clauseCount} review items below carry no number by an explicit structural decision; each has a heading. Cite the heading, number where shown, and any alternative label, or use the comment box beneath that clause.`,
        `**Example profile, not confirmed commercial instructions:** ${reviewProfileDescription()}. The final agreement depends on the funder's answers.`,
        `Where a clause is in the document because a particular state's law puts it there, that is noted under the heading. Most of this corpus is commercial drafting and says nothing there, which is itself information about where your hour is best spent.`,
      ],
    },
    {
      id: 'respond',
      title: 'How to send comments back',
      body: [
        `**Write them under the clause.** There is a box beneath every clause below. What you write is recorded against that clause, attributed to you from this link, and visible to you here afterwards — including our answer when we make one, so you never have to wonder whether something saved.`,
        `**A finding blocks the clause.** This is not a comment box: while a finding of yours is unanswered, the clause it names cannot be approved by anybody, including a different attorney. We clear it by answering in writing, and you see the answer in the same place you wrote the finding.`,
        `${replyTo} If you would rather mark up a document, ask and we will send this agreement as a file.`,
        `Recording a formal **approval** is still done by us, from your written sign-off, so that the bar number and admitting jurisdiction attached to it are ones you gave us rather than ones typed into a web form by whoever held the link. Findings go the other way and need no such ceremony, which is why one is a box on this page and the other is not.`,
        `${expiry} This text is confidential and unexecuted: no merchant or partner has been sent any of it.`,
      ],
    },
  ];
};
