import { describe, expect, it } from 'vitest';
import { INSTRUMENTS, MCA_INSTRUMENTS, merchantFacing } from '../../clauses/instruments';
import { libraryFor } from '../../clauses/library';
import { LOMBARD } from '../../clauses/parties';
import { JURISDICTION_NAMES, MCA_JURISDICTIONS } from '../../jurisdictions';
import { counselBriefing } from '../briefing';

/**
 * The context an attorney needs BEFORE the first clause, and the reason the
 * page could not be shipped without it.
 *
 * The review link was tested by opening it as counsel would, and what came back
 * was a funder's name, a clause count and 101 paragraphs of contract text. An
 * attorney reading that has not been told what business this is, who is asking,
 * what they are being asked to decide, what their approval would cause, which
 * of these documents they are holding, what is deliberately NOT in front of
 * them, or how to send a comment back. Every one of those is answerable from
 * what this package already knows, and none of them was on the page.
 *
 * WHY IT IS DERIVED RATHER THAN WRITTEN INTO THE ROUTE. Six agreements go out
 * on these links and they are not interchangeable: the ISO PRA is read by a
 * broker's counsel and is the one document a merchant must never be handed; the
 * Equipment Lease has a twin whose clauses are numbered identically. Prose
 * typed into a page renders the same sentences for all six, and the sentence
 * that is wrong for one of them is the one nobody notices.
 */
const base = {
  tenant: LOMBARD,
  clauseCount: 101,
  approvedCount: 0,
  unnumberedCount: 9,
  sender: { name: 'Shwet Prabhat', email: 'contracts@pacta.ink' },
  expiresAt: new Date('2026-09-22T00:00:00Z'),
  now: new Date('2026-09-08T00:00:00Z'),
};

const briefingFor = (instrument: (typeof MCA_INSTRUMENTS)[number]) =>
  counselBriefing({
    ...base,
    instrument,
    clauseCount: libraryFor(instrument).length,
    unnumberedCount: libraryFor(instrument).filter((clause) => clause.number === '').length,
  });

const text = (instrument: (typeof MCA_INSTRUMENTS)[number]) =>
  briefingFor(instrument)
    .flatMap((section) => [section.title, ...section.body])
    .join('\n');

describe('the counsel briefing', () => {
  /**
   * Every agreement that can go out on a link has to arrive with a briefing.
   * A missing one is not a blank panel — it is an attorney reading contract
   * text with no idea what they are looking at, which is the state this test
   * was written to end.
   */
  it.each(MCA_INSTRUMENTS)('%s arrives with a briefing', (instrument) => {
    const sections = briefingFor(instrument);

    expect(sections.length).toBeGreaterThan(0);

    for (const section of sections) {
      expect(section.title.trim().length).toBeGreaterThan(0);
      expect(section.body.length).toBeGreaterThan(0);

      for (const paragraph of section.body) {
        expect(paragraph.trim().length).toBeGreaterThan(0);
      }
    }
  });

  /**
   * THE SAME RULE THE CLAUSE BODIES ARE HELD TO, applied to the prose around
   * them. `openLibrary` resolves `{{funder}}` before counsel sees a clause,
   * because asking an attorney to approve text no document contains is the
   * defect. A briefing that says "{{funder}} is asking you to read this" is the
   * same defect one layer out, and would be more embarrassing rather than less.
   */
  it.each(MCA_INSTRUMENTS)('%s leaves no placeholder unresolved', (instrument) => {
    expect(text(instrument)).not.toMatch(/\{\{|\}\}/);
  });

  it.each(MCA_INSTRUMENTS)('%s names who is asking and on whose paper', (instrument) => {
    expect(text(instrument)).toContain(LOMBARD.parties.funder);
  });

  /**
   * WHAT THE DOCUMENT IS, IN THE READER'S OWN TERMS. A lawyer engaged to read
   * one of these has to know which of the six is in front of them and who signs
   * opposite, because the answer changes what the reading is for.
   */
  it.each(MCA_INSTRUMENTS)('%s names itself and its counterparty', (instrument) => {
    const body = text(instrument);

    expect(body).toContain(INSTRUMENTS[instrument].title);
    expect(body.toLowerCase()).toContain(
      { merchant: 'merchant', 'iso-partner': 'iso partner', processor: 'processor' }[
        INSTRUMENTS[instrument].counterparty
      ],
    );
  });

  /**
   * THE ISO PRA IS THE ONE A MERCHANT NEVER SEES, and `instruments.ts` already
   * says why that is not a detail: its §2.6 exists because California and New
   * York regulate what a broker may put in front of a recipient. An attorney
   * reading it must be told they are reading the agreement that governs how a
   * merchant is *not* to be sold to — otherwise they review it as if a merchant
   * were the audience.
   */
  it('tells the reader of a non-merchant document that no merchant sees it', () => {
    for (const instrument of MCA_INSTRUMENTS) {
      /*
        Asserted against the section that describes the DOCUMENT, not the whole
        briefing. The closing paragraph tells every reader that none of this
        text has been sent to a merchant or a partner — true of all six, and it
        would satisfy a whole-page match while saying nothing about who the
        counterparty is. The claim under test belongs to `counterpartyNote`.
      */
      const document = briefingFor(instrument)
        .filter((section) => section.id === 'document')
        .flatMap((section) => section.body)
        .join('\n');

      const saysMerchantNeverSeesIt = /never (?:handed to|shown to|sees)|no merchant/i.test(document);

      expect(saysMerchantNeverSeesIt, instrument).toBe(!merchantFacing().includes(instrument));
    }
  });

  /**
   * WHAT IS DELIBERATELY NOT IN FRONT OF THEM.
   *
   * Two things, and both are billable hours if unsaid. An MCA deal is a SET of
   * documents and this link carries exactly one, so counsel has to know the
   * other five exist rather than assume the set is complete. And the state
   * disclosure forms are a separate surface entirely — the regulator's
   * prescribed words, quoted verbatim, not ours to redraft — so an attorney who
   * starts marking up disclosure language is spending an hour on text no
   * approval of theirs can change.
   */
  it.each(MCA_INSTRUMENTS)('%s names the other five agreements it does not carry', (instrument) => {
    const body = text(instrument);

    for (const other of MCA_INSTRUMENTS.filter((id) => id !== instrument)) {
      expect(body, `does not mention ${other}`).toContain(INSTRUMENTS[other].title);
    }
  });

  it.each(MCA_INSTRUMENTS)('%s puts the prescribed disclosures out of scope by name', (instrument) => {
    const body = text(instrument);

    expect(body.toLowerCase()).toMatch(/disclosure/);

    for (const jurisdiction of MCA_JURISDICTIONS) {
      expect(body, `does not name ${jurisdiction}`).toContain(JURISDICTION_NAMES[jurisdiction]);
    }
  });

  /**
   * THE TWIN WARNING GOES TO THE TWO DOCUMENTS THAT HAVE A TWIN, AND NOWHERE
   * ELSE. REVIEW-02's finding is that a fix applied to one and not the other is
   * a divergence nothing checks for — `twins.ts` is the something that checks,
   * but only after the fix is written. Counsel proposing a change to §3.2 of
   * the Equipment Lease is proposing it to two live templates and should be
   * told so while proposing it.
   *
   * Asserted as an exact set so a seventh instrument cannot quietly inherit a
   * warning about a twin it does not have.
   */
  it('warns about the twin on exactly the two documents that are twins', () => {
    const warned = MCA_INSTRUMENTS.filter((instrument) => /twin|identical|lands twice/i.test(text(instrument)));

    expect([...warned].sort()).toEqual(['equipment-lease', 'subscription']);
  });

  /**
   * WHAT AN APPROVAL DOES. The reader is not being asked for an opinion in the
   * abstract: `assertPublishable` refuses to let any of this reach a merchant
   * until an approval names the attorney who read it, and the approval carries
   * their bar and their admitting jurisdiction. Someone deciding how carefully
   * to read is entitled to know that is the consequence.
   */
  it.each(MCA_INSTRUMENTS)('%s says what an approval causes and what it carries', (instrument) => {
    const body = text(instrument).toLowerCase();

    expect(body).toMatch(/bar number|bar and/);
    expect(body).toMatch(/admitted|admission|jurisdiction/);
    expect(body).toMatch(/until an approval|cannot be sent|may not be sent|not be sent/);
  });

  /**
   * HOW TO SEND SOMETHING BACK — the omission that made the page unusable
   * rather than merely thin.
   *
   * This page takes no findings, and that is a decision `link.ts` and the
   * router both defend: MCA findings live in the `lombard-contracts` manifests
   * and a second register would drift from the first. But "we deliberately do
   * not collect your comments here" is only a defensible design if the page
   * says where they go instead. Without it, a read-only page reads as an
   * oversight and counsel has nowhere to put a sentence.
   */
  it.each(MCA_INSTRUMENTS)('%s tells the reader where comments go', (instrument) => {
    expect(text(instrument)).toContain(base.sender.email);
  });

  it('says who sent the link when it knows, and does not invent one when it does not', () => {
    const named = counselBriefing({ ...base, instrument: 'frpa' });
    const anonymous = counselBriefing({ ...base, instrument: 'frpa', sender: null });

    expect(named.flatMap((s) => s.body).join('\n')).toContain('Shwet Prabhat');

    const body = anonymous.flatMap((s) => s.body).join('\n');

    expect(body).not.toContain('Shwet Prabhat');
    expect(body).not.toContain('null');
    expect(body).not.toContain('undefined');
    // Still has to say where a comment goes, even with no sender on the row.
    expect(body.toLowerCase()).toMatch(/repl(y|ies)|whoever sent|the person who sent/);
  });

  /**
   * THE BRIEFING DESCRIBES THE PAGE THE READER IS ACTUALLY ON.
   *
   * It told counsel each clause "carries a short reference in the margin".
   * There is no margin: the slug sits inline on the heading row, beside the
   * number and the heading. On the forty clauses the document leaves unheaded
   * it is the only thing on that row, which is exactly the case where a reader
   * following the instruction would look somewhere the reference is not.
   *
   * A briefing that misdescribes its own page is worse than one that says
   * nothing, because the reader trusts it to navigate — so this pins the claim
   * to what the route renders rather than to what would have been tidier.
   */
  it.each(MCA_INSTRUMENTS)('%s does not promise a margin the page does not have', (instrument) => {
    const body = text(instrument);

    expect(body).not.toMatch(/in the margin/i);
    expect(body).toMatch(/beside/i);
  });

  /**
   * HOW LONG THEY HAVE. A fortnight is the link's life, and an attorney
   * planning when to read it is exactly the person who needs the date.
   */
  it('prints the expiry as a date, and says so when there is none', () => {
    expect(
      counselBriefing({ ...base, instrument: 'frpa' })
        .flatMap((s) => s.body)
        .join('\n'),
    ).toMatch(/22 September 2026/);

    const forever = counselBriefing({ ...base, instrument: 'frpa', expiresAt: null })
      .flatMap((s) => s.body)
      .join('\n');

    expect(forever).not.toMatch(/expire[sd] on/);
    expect(forever.toLowerCase()).toMatch(/until it is revoked|does not expire/);
  });

  /*
    THE ASSERTION THAT STOOD HERE IS DELETED, NOT WEAKENED, AND THIS RECORDS WHY.

    It was `does not claim earlier findings are accounted for when the register
    is unreadable` — that a briefing built with `findingsReadable: false` says
    so rather than letting an empty findings list read as a clean bill. Its
    subject no longer exists: ADR 0012 closed *"Do findings render to reviewing
    counsel? **No.**"*, the `history` section is gone, and `findingsReadable` is
    no longer an input to this function or a field on the counsel payload.

    The distinction it guarded still has consequences, and they are on the staff
    side where the decision is taken: `findingsHold` refuses an approval when the
    register cannot be read, and `approval-is-reachable.test.ts` asserts that.
    `counsel-surface.test.ts` asserts the other half — that the briefing now
    describes no register at all.
  */

  /**
   * The count of what already carries an approval is the reader's answer to
   * "has anyone done this before me". Nought is the honest and current answer
   * and it must not be dressed up.
   */
  it('states plainly when no clause has ever been approved', () => {
    const body = counselBriefing({ ...base, instrument: 'frpa', approvedCount: 0 })
      .flatMap((s) => s.body)
      .join('\n')
      .toLowerCase();

    expect(body).toMatch(/no clause in this agreement has been approved|none of (them|these)/);
  });
});
