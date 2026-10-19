/**
 * Sécurité isServiceRoleToken : pas de confiance au payload JWT non signé.
 * Exécution : deno test --allow-env supabase/functions/_shared/supabaseApiKeys.test.ts
 *            ou : node --test --experimental-strip-types supabase/functions/_shared/supabaseApiKeys.test.ts
 */
import { describe, it } from "node:test";
import assert from "node:assert/strict";
import {
  isServiceRoleTokenFrom,
  listSupabaseSecretKeysFrom,
  timingSafeEqualString,
} from "./supabaseApiKeys.ts";

/** JWT non signé avec payload role=service_role (attaque forgée). */
function forgedServiceRoleJwt(): string {
  const header = Buffer.from(JSON.stringify({ alg: "none", typ: "JWT" })).toString(
    "base64url",
  );
  const payload = Buffer.from(
    JSON.stringify({ role: "service_role", iss: "forge" }),
  ).toString("base64url");
  return `${header}.${payload}.`;
}

describe("timingSafeEqualString", () => {
  it("accepte les chaînes égales", () => {
    assert.equal(timingSafeEqualString("abc", "abc"), true);
  });

  it("rejette longueurs ou contenus différents", () => {
    assert.equal(timingSafeEqualString("abc", "abd"), false);
    assert.equal(timingSafeEqualString("abc", "ab"), false);
  });
});

describe("isServiceRoleTokenFrom", () => {
  const secrets = ["srv-secret-legacy", "sb_secret_testkey"];

  it("JWT non signé {role:service_role} → refusé", () => {
    assert.equal(isServiceRoleTokenFrom(forgedServiceRoleJwt(), secrets), false);
  });

  it("vraie clé secrète → accepté", () => {
    assert.equal(isServiceRoleTokenFrom("srv-secret-legacy", secrets), true);
    assert.equal(isServiceRoleTokenFrom("sb_secret_testkey", secrets), true);
  });

  it("vide → refusé", () => {
    assert.equal(isServiceRoleTokenFrom("", secrets), false);
    assert.equal(isServiceRoleTokenFrom("   ", secrets), false);
    assert.equal(isServiceRoleTokenFrom("srv-secret-legacy", []), false);
  });
});

describe("listSupabaseSecretKeysFrom (helpers durcis PR#21)", () => {
  it("lit legacy + JSON sb_secret_", () => {
    const keys = listSupabaseSecretKeysFrom((name) => {
      if (name === "SUPABASE_SERVICE_ROLE_KEY") return " legacy-jwt ";
      if (name === "SUPABASE_SECRET_KEYS") {
        return JSON.stringify({ default: "sb_secret_a", kpmc_2026: "sb_secret_b" });
      }
      return undefined;
    });
    assert.deepEqual(keys, ["legacy-jwt", "sb_secret_a", "sb_secret_b"]);
  });

  it("JSON invalide : conserve legacy, pas de throw", () => {
    const keys = listSupabaseSecretKeysFrom((name) => {
      if (name === "SUPABASE_SERVICE_ROLE_KEY") return "legacy";
      if (name === "SUPABASE_SECRET_KEYS") return "{not-json";
      return undefined;
    });
    assert.deepEqual(keys, ["legacy"]);
  });
});
