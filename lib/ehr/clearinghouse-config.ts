import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { getAwsRegion } from "./aws-runtime";
import { parseClearinghouseConfig, type ClearinghouseConfig } from "./clearinghouse";

let cached: { config: ClearinghouseConfig; loadedAt: number } | null = null;
const CACHE_MS = 5 * 60 * 1000;

export type ClearinghouseConfigResult = { config?: ClearinghouseConfig; reason?: string };

// The Stedi API key and practice billing identity live in one AWS Secrets Manager
// JSON secret; only the secret ARN is exposed to the runtime environment.
export async function loadClearinghouseConfig(): Promise<ClearinghouseConfigResult> {
  if (cached && Date.now() - cached.loadedAt < CACHE_MS) return { config: cached.config };
  const secretId = process.env.EHR_CLEARINGHOUSE_SECRET_ARN;
  if (!secretId) {
    return { reason: "No clearinghouse is connected (EHR_CLEARINGHOUSE_SECRET_ARN is not set)." };
  }
  const client = new SecretsManagerClient({ region: getAwsRegion() });
  const result = await client.send(new GetSecretValueCommand({ SecretId: secretId }));
  const { config, missing } = parseClearinghouseConfig(result.SecretString || "");
  if (!config) return { reason: `Clearinghouse setup is incomplete: ${missing.join(", ")}.` };
  cached = { config, loadedAt: Date.now() };
  return { config };
}
