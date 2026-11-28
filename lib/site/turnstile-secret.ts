import { GetSecretValueCommand, SecretsManagerClient } from "@aws-sdk/client-secrets-manager";
import { getAwsRegion } from "../ehr/aws-runtime";

let cached: { arn: string; value: string; expires: number } | undefined;

export async function loadTurnstileSecret(): Promise<string> {
  const arn = process.env.TURNSTILE_SECRET_ARN;
  if (!arn) return process.env.TURNSTILE_SECRET_KEY || "";
  if (cached?.arn === arn && cached.expires > Date.now()) return cached.value;
  const client = new SecretsManagerClient({ region: getAwsRegion() });
  const result = await client.send(new GetSecretValueCommand({ SecretId: arn }), { abortSignal: AbortSignal.timeout(5000) });
  const value = result.SecretString?.trim() || "";
  if (!value) throw new Error("Turnstile secret is empty");
  cached = { arn, value, expires: Date.now() + 5 * 60 * 1000 };
  return value;
}
