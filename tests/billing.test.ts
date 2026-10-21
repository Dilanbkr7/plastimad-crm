import assert from "node:assert/strict";
import test from "node:test";
import { isAvailablePaymentMethod, validateBillingDocument } from "../lib/orders/billing";

test("billing accepts omitted documents but rejects partial or unsupported details", () => {
  for (const type of [undefined, null, ""]) {
    for (const number of [undefined, null, ""]) assert.equal(validateBillingDocument(type, number), null);
  }
  for (const type of [undefined, "", "PASAPORTE", "cedula"]) {
    assert.ok(validateBillingDocument(type, "0123456789"));
  }
  assert.ok(validateBillingDocument("CEDULA", 1234567890));
  assert.ok(validateBillingDocument("RUC", null));
  assert.ok(validateBillingDocument("CEDULA", ""));
  assert.ok(validateBillingDocument("PASAPORTE", ""));
  assert.ok(validateBillingDocument("", " "));
});

test("billing validates length and digits without losing leading zeros", () => {
  assert.equal(validateBillingDocument("CEDULA", "0123456789"), null);
  assert.equal(validateBillingDocument("RUC", "0123456789001"), null);
  for (const number of ["", "123456789", "01234567890", "0123456789 ", "012345678a", "01234-6789"]) {
    assert.ok(validateBillingDocument("CEDULA", number));
  }
  assert.ok(validateBillingDocument("RUC", "0123456789"));
  assert.ok(validateBillingDocument("RUC", "01234567890011"));
});

test("new orders only accept cash on delivery", () => {
  assert.equal(isAvailablePaymentMethod("CONTRAENTREGA"), true);
  for (const method of ["TRANSFERENCIA", "PAYPHONE", "DEUNA", "", "OTRO"]) {
    assert.equal(isAvailablePaymentMethod(method), false);
  }
});
