import {
  updateFeeStatusAction,
  deleteFeeAction,
  updateFeeDetailsAction,
  addPartialPaymentAction,
  updateFeeAmountAction,
} from "../src/app/actions/treasury-actions";
import { updateRegistrationEmailAction } from "../src/app/actions/inscriptions-actions";
import { updateStaffProfileAction } from "../src/app/actions/club-actions";
import { deleteTeam } from "../src/lib/teams-actions";

let passed = 0;
let failed = 0;

function assert(condition: boolean | undefined | null, testName: string) {
  if (condition) {
    console.log("  PASS: " + testName);
    passed++;
  } else {
    console.error("  FAIL: " + testName);
    failed++;
  }
}

async function runTests() {
  console.log("=== TEST SUITE P03: ACCESO ANONIMO / NO AUTENTICADO ===");

  const fakeId = "00000000-0000-0000-0000-000000000000";

  // 1. updateFeeStatusAction
  try {
    await updateFeeStatusAction(fakeId, "pagado");
    assert(false, "updateFeeStatusAction deberia haber bloqueado la llamada");
  } catch (err: any) {
    assert(err.message.includes("No autenticado") || err.message.includes("autenticado"), "updateFeeStatusAction bloquea llamada anonima: " + err.message);
  }

  // 2. deleteFeeAction
  try {
    await deleteFeeAction(fakeId);
    assert(false, "deleteFeeAction deberia haber bloqueado la llamada");
  } catch (err: any) {
    assert(err.message.includes("No autenticado") || err.message.includes("autenticado"), "deleteFeeAction bloquea llamada anonima: " + err.message);
  }

  // 3. updateFeeDetailsAction
  try {
    await updateFeeDetailsAction(fakeId, { concept: "Test" });
    assert(false, "updateFeeDetailsAction deberia haber bloqueado la llamada");
  } catch (err: any) {
    assert(err.message.includes("No autenticado") || err.message.includes("autenticado"), "updateFeeDetailsAction bloquea llamada anonima: " + err.message);
  }

  // 4. addPartialPaymentAction
  try {
    await addPartialPaymentAction(fakeId, 5000, "transfer");
    assert(false, "addPartialPaymentAction deberia haber bloqueado la llamada");
  } catch (err: any) {
    assert(err.message.includes("No autenticado") || err.message.includes("autenticado"), "addPartialPaymentAction bloquea llamada anonima: " + err.message);
  }

  // 5. updateFeeAmountAction
  try {
    await updateFeeAmountAction(fakeId, 10000, "ajuste");
    assert(false, "updateFeeAmountAction deberia haber bloqueado la llamada");
  } catch (err: any) {
    assert(err.message.includes("No autenticado") || err.message.includes("autenticado"), "updateFeeAmountAction bloquea llamada anonima: " + err.message);
  }

  // 6. updateRegistrationEmailAction
  try {
    const res = await updateRegistrationEmailAction(fakeId, "new@test.com", fakeId);
    assert(!res.success && (res.error?.includes("No autenticado") || res.error?.includes("autenticado")), "updateRegistrationEmailAction bloquea llamada anonima: " + res.error);
  } catch (err: any) {
    assert(false, "updateRegistrationEmailAction error inesperado: " + err.message);
  }

  // 7. updateStaffProfileAction
  try {
    const res = await updateStaffProfileAction(fakeId, { phone: "123", dni: "X", birth_date: "2000-01-01", license_number: "L" });
    assert(!res.success && (res.error?.includes("No autenticado") || res.error?.includes("autenticado")), "updateStaffProfileAction bloquea llamada anonima: " + res.error);
  } catch (err: any) {
    assert(false, "updateStaffProfileAction error inesperado: " + err.message);
  }

  // 8. deleteTeam
  try {
    const res = await deleteTeam(fakeId);
    assert(!!res.error && (res.error.includes("No autenticado") || res.error.includes("autenticado")), "deleteTeam bloquea llamada anonima: " + res.error);
  } catch (err: any) {
    assert(false, "deleteTeam error inesperado: " + err.message);
  }

  console.log(`\nRESUMEN P03 ANONIMO: ${passed} PASSED / ${failed} FAILED`);
  if (failed > 0) process.exit(1);
}

runTests();