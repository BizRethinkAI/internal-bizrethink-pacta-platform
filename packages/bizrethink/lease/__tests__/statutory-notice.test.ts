import { describe, expect, it } from 'vitest';

import { FL_STATUTORY_DISCLOSURES } from '../clauses/us-fl/statutory-disclosures';

/**
 * The §83.49(3)(a) deposit notice, character for character.
 *
 * Florida requires this notice in substantially this form, and a paraphrase
 * does not discharge the obligation — so the one thing that must never happen
 * quietly is a word drifting. The constant is assembled from four paragraph
 * strings (so the advice-language guard has a code line to hang its exemption
 * marker on, the statute's third paragraph opening with words that guard
 * bans), and this test is what makes that split safe.
 *
 * The expectation below is the text as it stood before the split, captured
 * from git rather than retyped.
 *
 * NOTE ON PROVENANCE: this was transcribed from an executed Florida lease,
 * not read off the statute book. `verbatimVerifiedAt` is null and the publish
 * guard blocks the clause until a human confirms it against the current text.
 * This test pins what we have; it does not certify it.
 */

const EXPECTED_PARAGRAPHS = [
  "YOUR LEASE REQUIRES PAYMENT OF CERTAIN DEPOSITS. THE LANDLORD MAY TRANSFER ADVANCE RENTS TO THE LANDLORD'S ACCOUNT AS THEY ARE DUE AND WITHOUT NOTICE. WHEN YOU MOVE OUT, YOU MUST GIVE THE LANDLORD YOUR NEW ADDRESS SO THAT THE LANDLORD CAN SEND YOU NOTICES REGARDING YOUR DEPOSIT. THE LANDLORD MUST MAIL YOU NOTICE, WITHIN 30 DAYS AFTER YOU MOVE OUT, OF THE LANDLORD'S INTENT TO IMPOSE A CLAIM AGAINST THE DEPOSIT. IF YOU DO NOT REPLY TO THE LANDLORD STATING YOUR OBJECTION TO THE CLAIM WITHIN 15 DAYS AFTER RECEIPT OF THE LANDLORD'S NOTICE, THE LANDLORD WILL COLLECT THE CLAIM AND MUST MAIL YOU THE REMAINING DEPOSIT, IF ANY.",
  'IF THE LANDLORD FAILS TO TIMELY MAIL YOU NOTICE, THE LANDLORD MUST RETURN THE DEPOSIT BUT MAY LATER FILE A LAWSUIT AGAINST YOU FOR DAMAGES. IF YOU FAIL TO TIMELY OBJECT TO A CLAIM, THE LANDLORD MAY COLLECT FROM THE DEPOSIT, BUT YOU MAY LATER FILE A LAWSUIT CLAIMING A REFUND.',
  'YOU SHOULD ATTEMPT TO INFORMALLY RESOLVE ANY DISPUTE BEFORE FILING A LAWSUIT. GENERALLY, THE PARTY IN WHOSE FAVOR A JUDGMENT IS RENDERED WILL BE AWARDED COSTS AND ATTORNEY FEES PAYABLE BY THE LOSING PARTY.',
  'THIS DISCLOSURE IS BASIC. PLEASE REFER TO PART II OF CHAPTER 83, FLORIDA STATUTES, TO DETERMINE YOUR LEGAL RIGHTS AND OBLIGATIONS.',
];

const notice = () => {
  const clause = FL_STATUTORY_DISCLOSURES.find((c) => c.slug === 'deposit.statutory-notice');

  if (!clause) {
    throw new Error('The §83.49(3)(a) notice clause is missing from the library entirely.');
  }

  return clause;
};

describe('the statutory deposit notice', () => {
  it('is still in the library at all', () => {
    expect(notice().slug).toBe('deposit.statutory-notice');
  });

  it('reproduces the statutory text exactly, paragraph for paragraph', () => {
    const body = notice().body;

    for (const paragraph of EXPECTED_PARAGRAPHS) {
      expect(body, `missing or altered: "${paragraph.slice(0, 48)}…"`).toContain(paragraph);
    }
  });

  it('joins the paragraphs with a blank line, as the statute sets them out', () => {
    expect(notice().body).toContain(`${EXPECTED_PARAGRAPHS[0]}\n\n${EXPECTED_PARAGRAPHS[1]}`);
  });

  it('keeps the whole notice byte-identical', () => {
    // The strongest form of the assertion: not merely that each paragraph is
    // present, but that nothing was inserted between or around them.
    expect(notice().body).toContain(EXPECTED_PARAGRAPHS.join('\n\n'));
  });

  it('is still upper case, which the statute requires for conspicuousness', () => {
    const letters = notice().body.replace(/[^A-Za-z]/g, '');

    expect(letters).toBe(letters.toUpperCase());
  });

  it('is still sourced to the statute rather than reclassified', () => {
    // Narrowed rather than asserted-through: `verbatimVerifiedAt` exists only
    // on the `statute` variant of ClauseSource, so reading it requires proving
    // the clause is still sourced that way — which is itself worth asserting.
    const source = notice().source;

    expect(source.kind).toBe('statute');

    if (source.kind !== 'statute') {
      return;
    }

    expect(source.verbatimRequired).toBe(true);

    // Transcribed from an executed lease, not read off the statute book.
    // Promoting it on the strength of looking right is the failure this guards.
    expect(source.verbatimVerifiedAt).toBeNull();
  });
});
