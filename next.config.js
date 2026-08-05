/** @type {import('next').NextConfig} */

// These values are inlined into the bundle at build time, so anything malformed here is
// compiled in and cannot be corrected from the deployment dashboard without a rebuild.
// Every value is trimmed, and the region is validated, before it reaches the build.
const DEFAULT_AWS_REGION = "us-east-2";
const DEFAULT_COGNITO_USER_POOL_ID = "us-east-2_kSd3RAPsl";
const DEFAULT_COGNITO_USER_POOL_CLIENT_ID = "64q7036m6i0sl68t9an6dqksnn";

const AWS_REGION_PATTERN = /^[a-z]{2}(-gov)?-[a-z]+-\d$/;

function pick(...values) {
  for (const value of values) {
    const trimmed = typeof value === "string" ? value.trim() : "";
    if (trimmed) return trimmed;
  }
  return "";
}

function resolveRegion() {
  const configured = pick(process.env.EHR_AWS_REGION, process.env.NEXT_PUBLIC_AWS_REGION);
  return AWS_REGION_PATTERN.test(configured) ? configured : DEFAULT_AWS_REGION;
}

const cognitoUserPoolClientId = pick(
  process.env.NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID,
  process.env.NEXT_PUBLIC_COGNITO_CLIENT_ID,
  DEFAULT_COGNITO_USER_POOL_CLIENT_ID
);

const nextConfig = {
  env: {
    NEXT_PUBLIC_AWS_REGION: resolveRegion(),
    NEXT_PUBLIC_COGNITO_USER_POOL_ID: pick(
      process.env.NEXT_PUBLIC_COGNITO_USER_POOL_ID,
      DEFAULT_COGNITO_USER_POOL_ID
    ),
    NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID: cognitoUserPoolClientId,
    NEXT_PUBLIC_COGNITO_CLIENT_ID: cognitoUserPoolClientId,
    NEXT_PUBLIC_RLTH_AWS_FOUNDATION_READY: pick(
      process.env.NEXT_PUBLIC_RLTH_AWS_FOUNDATION_READY,
      "true"
    ),
  },
};

module.exports = nextConfig;
