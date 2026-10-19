import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { probeSimulateServiceRoleAuth } from "./auth.ts";

function forgedServiceRoleJwt(): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ role: "service_role" })).toString("base64url");
  return `${header}.${payload}.`;
}

const secrets = ["real-service-role-key", "sb_secret_real"];

describe("simulate-order-webhook service_role auth", () => {
  it("jeton forgé non signé avec role: service_role → 401", () => {
    const req = new Request("http://local/simulate-order-webhook", {
      headers: { Authorization: `Bearer ${forgedServiceRoleJwt()}` },
    });
    const res = probeSimulateServiceRoleAuth(req, secrets);
    assert.equal(res.status, 401);
  });

  it("vraie clé secrète → 200", () => {
    const req = new Request("http://local/simulate-order-webhook", {
      headers: { Authorization: "Bearer real-service-role-key" },
    });
    const res = probeSimulateServiceRoleAuth(req, secrets);
    assert.equal(res.status, 200);
  });

  it("vraie clé sb_secret_ via apikey → 200", () => {
    const req = new Request("http://local/simulate-order-webhook", {
      headers: { apikey: "sb_secret_real" },
    });
    const res = probeSimulateServiceRoleAuth(req, secrets);
    assert.equal(res.status, 200);
  });

  it("rien → 401", () => {
    const res = probeSimulateServiceRoleAuth(new Request("http://local/simulate-order-webhook"), secrets);
    assert.equal(res.status, 401);
  });

  it("liste vide → 401", () => {
    const req = new Request("http://local/simulate-order-webhook", {
      headers: { Authorization: "Bearer real-service-role-key" },
    });
    assert.equal(probeSimulateServiceRoleAuth(req, []).status, 401);
  });
});
