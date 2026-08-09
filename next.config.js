/** @type {import('next').NextConfig} */

// These values are inlined into the bundle at build time, so anything malformed here is
// compiled in and cannot be corrected from the deployment dashboard without a rebuild.
// Every value is trimmed, and the region is validated, before it reaches the build.
const DEFAULT_AWS_REGION = "us-east-1";
const DEFAULT_COGNITO_USER_POOL_ID = "us-east-1_BNbtAMN95";
const DEFAULT_COGNITO_USER_POOL_CLIENT_ID = "20r3lfn9rtsh6qr3k2q3slk82u";

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

// Normalised here, in Node, so the page can keep a strict `=== "true"` comparison.
// That comparison folds to a constant at build time, which lets the bundler drop the
// locked-mode UI entirely when demo mode is on, and the demo UI when it is off.
function resolveDemoEnabled() {
  return pick(process.env.NEXT_PUBLIC_RLTH_EHR_DEMO_ENABLED).toLowerCase() === "true"
    ? "true"
    : "false";
}

const nextConfig = {
  env: {
    NEXT_PUBLIC_RLTH_EHR_DEMO_ENABLED: resolveDemoEnabled(),
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
