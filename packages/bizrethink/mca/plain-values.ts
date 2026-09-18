import { z } from 'zod';

/**
 * The value primitives every MCA answer is built from.
 *
 * WHY THESE ARE SHARED RATHER THAN RE-DECLARED. A value a person types ends up
 * inside compiled legal text, and the compiler and the publisher both treat
 * certain character sequences as instructions:
 *
 *   `{{field:…}}`  a binding the compiler substitutes
 *   `{{funder}}`   a role token the compiler substitutes
 *   `[[clause:…]]` a cross-reference the numbering engine resolves
 *   `«name»`       the marker `injectMcaWidgets` turns into an AcroForm widget
 *
 * So an entity whose legal name contained `«merchant_legal_name»` would put a
 * second widget of that name onto a published page — one the funder never
 * asked for and the caller would fill. `ZMcaProviderProfile` guarded against
 * this from the start; `ZMcaEntity` was written without the guard, and ADR 0026
 * makes the entity the thing whose text reaches the page. These exist so the
 * two cannot drift again.
 */

/** A typed answer that cannot introduce a template directive or a line break. */
export const line = (max = 240) =>
  z
    .string()
    .trim()
    .min(1)
    .max(max)
    .refine(
      (value) => !/\{\{|\[\[|«|»/.test(value) && [...value].every((character) => character.charCodeAt(0) >= 32),
      'Enter a plain value, without template markers or line breaks.',
    );

/** The same, where empty is a complete answer rather than a missing one. */
export const optionalLine = (max = 240) => z.union([z.literal(''), line(max)]);

export const email = z.string().trim().email().max(254);

/** No symbol, two decimals at most — the shape the transaction layer validates. */
export const money = z
  .string()
  .trim()
  .regex(/^(0|[1-9]\d{0,11})(\.\d{1,2})?$/, 'Enter a dollar amount, for example 500.00.');

/**
 * One row of the completed Appendix A.
 *
 * The shape is not invented here: `frpa.appendix-a-fees-collectible` says a fee
 * may be charged only if the completed Appendix identifies it "by its name, its
 * dollar amount or a lawful calculation method, the person to whom it is paid,
 * what it is for, and when it is charged". These are those five, and the
 * either/or is why `basis` exists rather than two optional strings.
 *
 * A fee not listed here is $0.00 by the clause's own terms, so an empty
 * schedule is a complete answer, not a missing one.
 *
 * Lives here rather than on the profile because the ENTITY carries the fee
 * schedule under ADR 0026, and an entity importing from the profile it replaces
 * is the wrong way round.
 */
export const ZMcaFee = z.discriminatedUnion('basis', [
  z
    .object({
      basis: z.literal('amount'),
      name: line(200),
      amount: money,
      payee: line(200),
      purpose: line(400),
      when: line(400),
    })
    .strict(),
  z
    .object({
      basis: z.literal('method'),
      name: line(200),
      method: line(400),
      payee: line(200),
      purpose: line(400),
      when: line(400),
    })
    .strict(),
]);

export type McaFee = z.infer<typeof ZMcaFee>;
