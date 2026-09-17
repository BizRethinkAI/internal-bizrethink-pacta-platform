# feat/mca-publication-field-plan — what a merchant-ready page must carry

**Stacked on `feat/mca-recipient-contract` (#290), which is stacked on #289.**
Merge those first.

**What this is:** the specification the merchant-ready renderer will consume,
derived once from the two pinned contracts. Still no behaviour change — the
renderer is untouched.

## The three lists

Every live widget name lands in exactly one of them, and which one is the whole
parity question:

| | meaning |
|---|---|
| `marked` | the page prints `«name»` and `injectMcaWidgets` puts a widget there |
| `printed` | the builder **knows** the value at publication and sets it in type — no widget, so a value the platform sends for it lands nowhere |
| `absent` | the builder cannot produce it at all |

`printed` and `absent` are both breaks, and they break differently. A printed
name is a deliberate difference — the funder's own address does not need
re-sending per deal — but the caller keeps sending it and nothing says so. An
absent name is a hole in the document.

The partition is asserted total and disjoint against the live contract, so a
name cannot go missing between the map and the plan.

## The parity number

Across the four distinct live templates the builder would produce — the lease
and the subscription share one — **72 of 89 widget names are produced**.
Seventeen values a caller sends today would go nowhere: six because the builder
sets them in type at publication, eleven because it cannot produce them.

| instrument | marked | printed | absent |
|---|---|---|---|
| frpa | 37 | 2 | 3 |
| equipment-lease / subscription | 22 | 2 | 4 |
| iso-pra | 6 | 2 | 1 |
| permission-to-release | 7 | 0 | 3 |

Pinned, so closing a gap — or opening one — is a diff here rather than something
somebody has to go and measure again. `parityShortfall(instrument)` returns the
lost names with a reason in words, which is the form worth reporting: not "we
model 37 of 42 fields" but "five values you send today would go nowhere."

**Two of my predicted counts were wrong** before the test ran — the lease has
four absent rather than three, and the permission-to-release has seven marked
rather than five. The measured numbers are in the file; the guesses are not.

## Why it is derived and not written down again

The renderer, the injector and any parity report all need the same three lists.
`injectMcaWidgets` refuses a marker it was not told to expect *and* an expected
name that never appears, so the renderer and the injector must work from one
list or neither can publish. This is that list, and nothing else computes it.

`rN` is numbered from the **order** of the signers, not from the stored
`signingOrder`: the token is a position in the recipient list Documenso builds,
so a gap in published numbers must not become a gap in the tokens.

Asserted too: no marked widget ever sits on a signer's binding. A signature that
became a widget would be sender-writable and ship permanently blank.

## Not in this change

The renderer still emits values and `[to complete]`, and still bans the banner
nowhere. Nothing calls this. The next piece is the render mode itself, which
consumes the plan and is mechanical once the plan is right.
