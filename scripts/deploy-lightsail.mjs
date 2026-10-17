import { spawnSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

export function buildDeployment(serviceName, image, credentials) {
  if (!serviceName || !image) throw new Error("Service name and image are required.");
  const account = JSON.parse(credentials);
  if (!account.project_id || !account.client_email || !account.private_key) {
    throw new Error("Firebase credentials must contain project_id, client_email and private_key.");
  }
  return {
    serviceName,
    containers: {
      api: {
        image,
        ports: { "3000": "HTTP" },
        environment: {
          NODE_ENV: "production",
          PORT: "3000",
          FIREBASE_SERVICE_ACCOUNT_JSON: JSON.stringify(account),
        },
      },
    },
    publicEndpoint: {
      containerName: "api",
      containerPort: 3000,
      healthCheck: {
        path: "/health",
        successCodes: "200",
        intervalSeconds: 10,
        timeoutSeconds: 5,
        healthyThreshold: 2,
        unhealthyThreshold: 3,
      },
    },
  };
}

function aws(args) {
  const result = spawnSync("aws", [...args, "--output", "json", "--no-cli-pager"], {
    encoding: "utf8",
    timeout: 120_000,
    env: { ...process.env, AWS_PAGER: "", AWS_CLI_AUTO_PROMPT: "off" },
  });
  // Never print AWS responses/errors: deployment responses may contain credentials.
  if (result.error || result.status !== 0) {
    throw new Error(`AWS command ${args[1]} failed; check region, IAM and service configuration.`);
  }
  return JSON.parse(result.stdout);
}

async function deploy() {
  const serviceName = process.env.LIGHTSAIL_SERVICE_NAME;
  const payload = buildDeployment(serviceName, process.env.DEPLOY_IMAGE, process.env.FIREBASE_SERVICE_ACCOUNT_JSON);
  const directory = mkdtempSync(join(tmpdir(), "allyu-deploy-"));
  let version;
  try {
    const file = join(directory, "deployment.json");
    writeFileSync(file, JSON.stringify(payload), { mode: 0o600 });
    version = aws([
      "lightsail", "create-container-service-deployment",
      "--cli-input-json", `file://${file}`,
      "--query", "containerService.nextDeployment.version",
    ]);
    if (!Number.isInteger(version)) throw new Error("AWS did not return a deployment version.");
  } finally {
    rmSync(directory, { recursive: true, force: true });
  }
  for (let attempt = 0; attempt < 90; attempt++) {
    const service = aws([
      "lightsail", "get-container-services", "--service-name", serviceName,
      "--query", "containerServices[0].{url:url,current:currentDeployment.{version:version,state:state},next:nextDeployment.{version:version,state:state}}",
    ]);
    if (service?.current?.version === version && service.current.state === "ACTIVE") {
      const response = await fetch(`${service.url.replace(/\/$/, "")}/health`, { signal: AbortSignal.timeout(15000) });
      if (!response.ok) throw new Error("Deployment is active but /health failed.");
      console.log(`Deployment ${version} ready: ${service.url}`);
      return;
    }
    if ([service?.current, service?.next].some(d => d?.version === version && d.state === "FAILED")) {
      throw new Error("Deployment failed; inspect container logs in Lightsail.");
    }
    console.log(`Waiting for deployment ${version} (${attempt + 1}/90)...`);
    await new Promise(resolve => setTimeout(resolve, 10000));
  }
  throw new Error("Timed out waiting for deployment; inspect Lightsail before retrying.");
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  deploy().catch(error => {
    // JSON parsing errors can include secret fragments; never print their message.
    console.error(error instanceof SyntaxError ? "Invalid Firebase credentials JSON." : error.message);
    process.exitCode = 1;
  });
}
