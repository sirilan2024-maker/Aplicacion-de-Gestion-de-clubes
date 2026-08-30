import {
  getFamilyFeesAction,
  getPlayerFeesAction,
  getFeePaymentsAction,
  downloadPaymentReceiptAction,
  downloadFeeReceiptAction
} from "../src/app/actions/treasury-actions";
import { POST as uploadAvatarPOST } from "../src/app/api/upload-avatar/route";
import { POST as clasificarActasPOST } from "../src/app/api/partidos/clasificar-actas/route";
import { POST as asignarActaPOST } from "../src/app/api/partidos/asignar-acta/route";
import { GET as getActaUrlGET } from "../src/app/api/partidos/get-acta-url/route";
import { NextRequest } from "next/server";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string) {
  if (condition) {
    console.log("  PASS: " + testName);
    passed++;
  } else {
    console.error("  FAIL: " + testName);
    failed++;
  }
}

async function runTests() {
  console.log("=== TEST SUITE P02: SEGURIDAD Y AUTORIZACIÓN ===");

  // 1. Test /api/upload-avatar sin autenticación
  try {
    const formData = new FormData();
    const file = new File(["fake-image"], "avatar.jpg", { type: "image/jpeg" });
    formData.append("file", file);
    formData.append("playerId", "00000000-0000-0000-0000-000000000000");

    const req = new NextRequest("http://localhost:3000/api/upload-avatar", {
      method: "POST",
      body: formData,
    });

    const res = await uploadAvatarPOST(req);
    assert(res.status === 401 || res.status === 403, "/api/upload-avatar rechaza petición no autenticada (Status: " + res.status + ")");
  } catch (err: any) {
    assert(false, "/api/upload-avatar error inesperado: " + err.message);
  }

  // 2. Test /api/partidos/clasificar-actas sin autenticación
  try {
    const formData = new FormData();
    const req = new NextRequest("http://localhost:3000/api/partidos/clasificar-actas", {
      method: "POST",
      body: formData,
    });

    const res = await clasificarActasPOST(req);
    assert(res.status === 401 || res.status === 403, "/api/partidos/clasificar-actas rechaza petición no autenticada (Status: " + res.status + ")");
  } catch (err: any) {
    assert(false, "/api/partidos/clasificar-actas error: " + err.message);
  }

  // 3. Test /api/partidos/asignar-acta sin autenticación
  try {
    const req = new NextRequest("http://localhost:3000/api/partidos/asignar-acta", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pendingPath: "test.pdf", partidoId: "00000000-0000-0000-0000-000000000000" }),
    });

    const res = await asignarActaPOST(req);
    assert(res.status === 401 || res.status === 403, "/api/partidos/asignar-acta rechaza petición no autenticada (Status: " + res.status + ")");
  } catch (err: any) {
    assert(false, "/api/partidos/asignar-acta error: " + err.message);
  }

  // 4. Test /api/partidos/get-acta-url sin autenticación
  try {
    const req = new NextRequest("http://localhost:3000/api/partidos/get-acta-url?partidoId=00000000-0000-0000-0000-000000000000");
    const res = await getActaUrlGET(req);
    assert(res.status === 401 || res.status === 403, "/api/partidos/get-acta-url rechaza petición no autenticada (Status: " + res.status + ")");
  } catch (err: any) {
    assert(false, "/api/partidos/get-acta-url error: " + err.message);
  }

  // 5. Test getFamilyFeesAction sin autenticación
  try {
    await getFamilyFeesAction("00000000-0000-0000-0000-000000000000");
    assert(false, "getFamilyFeesAction debería haber lanzado error de autenticación");
  } catch (err: any) {
    assert(err.message.includes("No autenticado") || err.message.includes("autenticado"), "getFamilyFeesAction bloquea acceso no autenticado: " + err.message);
  }

  // 6. Test getPlayerFeesAction sin autenticación
  try {
    await getPlayerFeesAction("00000000-0000-0000-0000-000000000000");
    assert(false, "getPlayerFeesAction debería haber lanzado error");
  } catch (err: any) {
    assert(err.message.includes("No autenticado") || err.message.includes("autenticado"), "getPlayerFeesAction bloquea acceso no autenticado: " + err.message);
  }

  // 7. Test getFeePaymentsAction sin autenticación
  try {
    await getFeePaymentsAction("00000000-0000-0000-0000-000000000000");
    assert(false, "getFeePaymentsAction debería haber lanzado error");
  } catch (err: any) {
    assert(err.message.includes("No autenticado") || err.message.includes("autenticado"), "getFeePaymentsAction bloquea acceso no autenticado: " + err.message);
  }

  // 8. Test downloadPaymentReceiptAction sin autenticación
  try {
    await downloadPaymentReceiptAction("00000000-0000-0000-0000-000000000000");
    assert(false, "downloadPaymentReceiptAction debería haber lanzado error");
  } catch (err: any) {
    assert(err.message.includes("No autenticado") || err.message.includes("autenticado"), "downloadPaymentReceiptAction bloquea acceso no autenticado: " + err.message);
  }

  // 9. Test downloadFeeReceiptAction sin autenticación
  try {
    await downloadFeeReceiptAction("00000000-0000-0000-0000-000000000000");
    assert(false, "downloadFeeReceiptAction debería haber lanzado error");
  } catch (err: any) {
    assert(err.message.includes("No autenticado") || err.message.includes("autenticado"), "downloadFeeReceiptAction bloquea acceso no autenticado: " + err.message);
  }

  console.log(`\nRESUMEN P02: ${passed} PASSED / ${failed} FAILED`);
  if (failed > 0) process.exit(1);
}

runTests();