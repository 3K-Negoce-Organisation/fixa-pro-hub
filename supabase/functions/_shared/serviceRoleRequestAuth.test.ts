import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  authorizeServiceRoleRequest,
  extractPresentedSecret,
  secretMatchesAny,
  timingSafeEqualString,
} from "./serviceRoleRequestAuth.ts";
import { listSupabaseSecretKeysFrom } from "./supabaseApiKeys.ts";

function forgedServiceRoleJwt(): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString("base64url");
  const payload = Buffer.from(JSON.stringify({ role: "service_role", iss: "forge" })).toString(
    "base64url",
  );
  return `${header}.${payload}.`;
}

describe("timingSafeEqualString", () => {
  it("accepte les chaînes égales", () => {
    assert.equal(timingSafeEqualString("abc", "abc"), true);
  });

  it("rejette les longueurs ou contenus différents", () => {
    assert.equal(timingSafeEqualString("abc", "abd"), false);
    assert.equal(timingSafeEqualString("abc", "ab"), false);
  });
});

describe("extractPresentedSecret / secretMatchesAny", () => {
  it("Bearer prioritaire, apikey sinon ; vide → null", () => {
    assert.equal(
      extractPresentedSecret(
        new Request("http://l", { headers: { Authorization: "Bearer a", apikey: "b" } }),
      ),
      "a",
    );
    assert.equal(
      extractPresentedSecret(new Request("http://l", { headers: { apikey: "b" } })),
      "b",
    );
    assert.equal(extractPresentedSecret(new Request("http://l")), null);
  });

  it("refuse présenté vide ; ignore entrées vides ; liste vide refuse tout", () => {
    assert.equal(secretMatchesAny("", ["x"]), false);
    assert.equal(secretMatchesAny("x", ["", "  "]), false);
    assert.equal(authorizeServiceRoleRequest(
      new Request("http://l", { headers: { Authorization: "Bearer x" } }),
      [],
    ), false);
  });

  it("JWT forgé role service_role non accepté", () => {
    const req = new Request("http://l", {
      headers: { Authorization: `Bearer ${forgedServiceRoleJwt()}` },
    });
    assert.equal(authorizeServiceRoleRequest(req, ["real-key"]), false);
  });
});

describe("listSupabaseSecretKeysFrom", () => {
  it('SECRET_KEYS = "pas du json" → legacy seule', () => {
    assert.deepEqual(
      listSupabaseSecretKeysFrom((name) => {
        if (name === "SUPABASE_SERVICE_ROLE_KEY") return "legacy-secret";
        if (name === "SUPABASE_SECRET_KEYS") return "pas du json";
        return undefined;
      }),
      ["legacy-secret"],
    );
  });

  it('SECRET_KEYS = {"a":123} → ignore non-string', () => {
    assert.deepEqual(
      listSupabaseSecretKeysFrom((name) => {
        if (name === "SUPABASE_SECRET_KEYS") return '{"a":123}';
        return undefined;
      }),
      [],
    );
  });
});
