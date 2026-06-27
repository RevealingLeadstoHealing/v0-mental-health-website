/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_AWS_REGION: "us-east-2",
    NEXT_PUBLIC_COGNITO_USER_POOL_ID: "us-east-2_kSd3RAPsl",
    NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID: "64q7036m6i0sl68t9an6dqksnn",
    NEXT_PUBLIC_RLTH_AWS_FOUNDATION_READY: "true",
  },
};

module.exports = nextConfig;
