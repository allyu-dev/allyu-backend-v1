import { test } from "node:test";
import assert from "node:assert/strict";
import { buildDeployment } from "./deploy-lightsail.mjs";

const credentials = JSON.stringify({ project_id: "demo", client_email: "demo@example.com", private_key: "test\nkey" });
test("deployment preserves JSON credentials and exposes the health endpoint", () => {
  const result = buildDeployment("allyu-demo", "registry/api@sha256:abc", credentials);
  assert.equal(result.containers.api.image, "registry/api@sha256:abc");
  assert.deepEqual(JSON.parse(result.containers.api.environment.FIREBASE_SERVICE_ACCOUNT_JSON), JSON.parse(credentials));
  assert.equal(result.publicEndpoint.healthCheck.path, "/health");
  assert.equal(result.publicEndpoint.containerPort, 3000);
  assert.equal(result.containers.api.ports[3000], "HTTP");
});
test("invalid credentials or missing deployment inputs fail before calling AWS", () => {
  assert.throws(() => buildDeployment("demo", "image", "{}"));
  assert.throws(() => buildDeployment("demo", "image", "invalid"));
  assert.throws(() => buildDeployment("", "image", credentials));
  assert.throws(() => buildDeployment("demo", "", credentials));
});
