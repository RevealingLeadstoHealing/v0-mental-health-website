/** @type {import('next').NextConfig} */
const nextConfig = {
  env: {
    NEXT_PUBLIC_AWS_REGION: "us-east-1",
    NEXT_PUBLIC_COGNITO_USER_POOL_ID: "us-east-1_BNbtAMN95",
    NEXT_PUBLIC_COGNITO_USER_POOL_CLIENT_ID: "20r3lfn9rtsh6qr3k2q3slk82u",
    NEXT_PUBLIC_RLTH_AWS_FOUNDATION_READY: "true",
  },
};

module.exports = nextConfig;
