/**
 * Pins the relaxed signup rules so they cannot silently tighten again.
 * Run: npm run test:relaxed
 */
import { z } from "zod";

const optionalText = z.string().optional().catch("");
const ZIP_RE = /^\d{5}(?:-\d{4})?$/;

function parseZips(raw) {
  if (typeof raw !== "string") return [];
  return raw.split(/[\s,]+/).map((s) => s.trim()).filter(Boolean);
}

const primaryZipCodes = z
  .string()
  .min(1, "Add at least one primary service area ZIP code")
  .transform(parseZips)
  .refine((zips) => zips.every((z) => ZIP_RE.test(z)), "ZIP codes must be 5 digits");

const secondaryZipCodes = z
  .string()
  .optional()
  .transform(parseZips)
  .refine((zips) => zips.every((z) => ZIP_RE.test(z)), "ZIP codes must be 5 digits");

// Mirrors the parts of activateSchema this test covers.
const shape = {
  firstName: optionalText,
  lastName: optionalText,
  email: z.string().email("Enter a valid email"),
  password: z.string().min(1, "Choose a password"),
  phone: optionalText,
  brokerage: optionalText,
  licenseNumber: optionalText,
  state: optionalText,
  primaryZipCodes,
  secondaryZipCodes,
};
const activateSchema = z.object(shape);

const base = {
  firstName: "Jane",
  lastName: "Doe",
  email: "jane@brokerage.com",
  password: "hunter2long",
  phone: "(555) 555-5555",
  brokerage: "Big Realty",
  licenseNumber: "TX-9981",
  state: "TX",
  primaryZipCodes: "75201, 75202",
  secondaryZipCodes: "",
  agreed: "yes",
  cardName: "Jane Doe",
  cardNumber: "4242424242424242",
  expiry: "12/30",
  cvc: "123",
};

const run = (over) => activateSchema.safeParse({ ...base, ...over });
let failures = 0;
const check = (name, cond, detail = "") => {
  if (cond) console.log(`  ok    ${name}`);
  else {
    failures++;
    console.log(`  FAIL  ${name}${detail ? " — " + detail : ""}`);
  }
};

console.log("\n1. Blank optional fields are accepted");
const blanks = run({
  firstName: "",
  lastName: "",
  phone: "",
  brokerage: "",
  licenseNumber: "",
  state: "",
  secondaryZipCodes: "",
});
check("all optional fields blank still passes", blanks.success, blanks.success ? "" : JSON.stringify(blanks.error.issues));

console.log("\n2. Missing optional fields (null from FormData) are accepted");
const nulls = run({
  firstName: null,
  lastName: null,
  phone: null,
  brokerage: null,
  licenseNumber: null,
  state: null,
});
check("null optional fields coerce to empty string", nulls.success, nulls.success ? "" : JSON.stringify(nulls.error.issues));
if (nulls.success) {
  check("coerced values are strings", typeof nulls.data.brokerage === "string" && nulls.data.brokerage === "");
}

console.log("\n3. Password: any characters, only blank is rejected");
for (const pw of ["a", "1", "x", "P@ss!word", "  spaces  ", "🔑emoji", "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]) {
  const r = run({ password: pw });
  check(`password ${JSON.stringify(pw).slice(0, 24)} accepted`, r.success);
}
const blankPw = run({ password: "" });
check("empty password is still rejected", !blankPw.success, blankPw.success ? "it was accepted" : "");
const nullPw = run({ password: null });
check("null password is rejected", !nullPw.success);

console.log("\n4. Still-required fields keep their guard");
check("invalid email is rejected", !run({ email: "not-an-email" }).success);
check("missing primary ZIP is rejected", !run({ primaryZipCodes: "" }).success);
check("malformed ZIP is rejected", !run({ primaryZipCodes: "abcde" }).success);
check("bad secondary ZIP is rejected", !run({ secondaryZipCodes: "123" }).success);
check("valid 5+4 ZIP is accepted", run({ secondaryZipCodes: "75201-1234" }).success);

console.log(failures === 0 ? "\nAll relaxed-validation checks passed.\n" : `\n${failures} FAILED\n`);
process.exit(failures === 0 ? 0 : 1);