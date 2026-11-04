# FEAT-001 — AWS inbound-email infrastructure (exact commands + JSON)

Account `597936860711`, profile `rlth-prod`, region `us-east-1` on every call.
AWS CLI: `C:\Program Files\Amazon\AWSCLIV2\aws.exe`.
Terminal echo is garbled on this Windows/PowerShell host, so every call was redirected
(`*>`) to a file under `.agents/tmp/` and read back; the exit code was captured with
`"$LASTEXITCODE" | Out-File ...exit.txt`.

All steps completed successfully (exit 0 on every mutating call).

---

## 0. Identity check

```
aws sts get-caller-identity --profile rlth-prod --region us-east-1
```
Result: `Account=597936860711`, `Arn=arn:aws:iam::597936860711:root`.

---

## 1. Create the inbound bucket

```
aws s3api create-bucket --bucket rlth-prod-inbound-email-597936860711 --region us-east-1 --profile rlth-prod
```
(us-east-1 takes no LocationConstraint.)
Result:
```json
{
  "Location": "/rlth-prod-inbound-email-597936860711",
  "BucketArn": "arn:aws:s3:::rlth-prod-inbound-email-597936860711"
}
```

---

## 2. Lock down the bucket

### 2a. Public access block (all four flags true)

```
aws s3api put-public-access-block --bucket rlth-prod-inbound-email-597936860711 --region us-east-1 --profile rlth-prod \
  --public-access-block-configuration "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### 2b. Default encryption — SSE-KMS (reuse existing key) + BucketKeyEnabled

```
aws s3api put-bucket-encryption --bucket rlth-prod-inbound-email-597936860711 --region us-east-1 --profile rlth-prod \
  --server-side-encryption-configuration file://.agents/tmp/bucket-encryption.json
```
`bucket-encryption.json`:
```json
{
  "Rules": [
    {
      "ApplyServerSideEncryptionByDefault": {
        "SSEAlgorithm": "aws:kms",
        "KMSMasterKeyID": "arn:aws:kms:us-east-1:597936860711:key/8907012f-0f1e-48f9-a0f0-c3e774edb986"
      },
      "BucketKeyEnabled": true
    }
  ]
}
```

### 2c. Lifecycle — expire prefix `inbound/` after 365 days

```
aws s3api put-bucket-lifecycle-configuration --bucket rlth-prod-inbound-email-597936860711 --region us-east-1 --profile rlth-prod \
  --lifecycle-configuration file://.agents/tmp/bucket-lifecycle.json
```
`bucket-lifecycle.json`:
```json
{
  "Rules": [
    {
      "ID": "expire-inbound-365",
      "Status": "Enabled",
      "Filter": { "Prefix": "inbound/" },
      "Expiration": { "Days": 365 }
    }
  ]
}
```

---

## 3. Bucket policy — allow SES to PutObject

```
aws s3api put-bucket-policy --bucket rlth-prod-inbound-email-597936860711 --region us-east-1 --profile rlth-prod \
  --policy file://.agents/tmp/inbound-bucket-policy.json
```
`inbound-bucket-policy.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AllowSESPuts",
      "Effect": "Allow",
      "Principal": { "Service": "ses.amazonaws.com" },
      "Action": "s3:PutObject",
      "Resource": "arn:aws:s3:::rlth-prod-inbound-email-597936860711/*",
      "Condition": {
        "StringEquals": { "aws:SourceAccount": "597936860711" },
        "ArnLike": { "aws:SourceArn": "arn:aws:ses:us-east-1:597936860711:receipt-rule-set/rlth-inbound:receipt-rule/*" }
      }
    }
  ]
}
```

---

## 4. KMS key policy — allow SES to use the key (KMS path chosen)

The existing key policy for `8907012f-0f1e-48f9-a0f0-c3e774edb986` had only the root
`AccountAdministration` statement; it was editable (root), so the **KMS path** was used
(not the SSE-S3 fallback). Read the current policy, then put the merged policy.

```
aws kms get-key-policy --key-id 8907012f-0f1e-48f9-a0f0-c3e774edb986 --policy-name default --region us-east-1 --profile rlth-prod --output text

aws kms put-key-policy --key-id 8907012f-0f1e-48f9-a0f0-c3e774edb986 --policy-name default --region us-east-1 --profile rlth-prod \
  --policy file://.agents/tmp/kms-new-policy.json
```
`kms-new-policy.json` (original root statement preserved, SES statement added):
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "AccountAdministration",
      "Effect": "Allow",
      "Principal": { "AWS": "arn:aws:iam::597936860711:root" },
      "Action": "kms:*",
      "Resource": "*"
    },
    {
      "Sid": "AllowSESToEncryptInboundEmail",
      "Effect": "Allow",
      "Principal": { "Service": "ses.amazonaws.com" },
      "Action": [ "kms:GenerateDataKey", "kms:Encrypt" ],
      "Resource": "*",
      "Condition": { "StringEquals": { "aws:SourceAccount": "597936860711" } }
    }
  ]
}
```

---

## 5. SES receiving

```
aws ses create-receipt-rule-set --rule-set-name rlth-inbound --region us-east-1 --profile rlth-prod

aws ses create-receipt-rule --rule-set-name rlth-inbound --rule file://.agents/tmp/ses-receipt-rule.json --region us-east-1 --profile rlth-prod

aws ses set-active-receipt-rule-set --rule-set-name rlth-inbound --region us-east-1 --profile rlth-prod
```
`ses-receipt-rule.json`:
```json
{
  "Name": "connect-to-s3",
  "Enabled": true,
  "TlsPolicy": "Require",
  "ScanEnabled": true,
  "Recipients": [ "connect@rlth.org" ],
  "Actions": [
    {
      "S3Action": {
        "BucketName": "rlth-prod-inbound-email-597936860711",
        "ObjectKeyPrefix": "inbound/",
        "KmsKeyArn": "arn:aws:kms:us-east-1:597936860711:key/8907012f-0f1e-48f9-a0f0-c3e774edb986"
      }
    }
  ]
}
```

---

## 6. Route53 MX (clean CREATE, done after rule set is active)

```
aws route53 change-resource-record-sets --hosted-zone-id Z03865162FVI3E11XJFH3 --region us-east-1 --profile rlth-prod \
  --change-batch file://.agents/tmp/mx-change.json
```
`mx-change.json`:
```json
{
  "Comment": "FEAT-001 add inbound MX for SES receiving",
  "Changes": [
    {
      "Action": "CREATE",
      "ResourceRecordSet": {
        "Name": "rlth.org.",
        "Type": "MX",
        "TTL": 300,
        "ResourceRecords": [ { "Value": "10 inbound-smtp.us-east-1.amazonaws.com" } ]
      }
    }
  ]
}
```
Result: `ChangeInfo.Id=/change/C0678722GPZCV0H4Y7QF`, `Status=PENDING`.
The existing 9 records (NS, SOA, `_dmarc` TXT, 5 DKIM CNAMEs) were left untouched.

---

## 7. Additive inline IAM policy on the Amplify SSR compute role

```
aws iam put-role-policy --role-name rlth-prod-amplify-ssr-compute --policy-name RlthEhrInboundEmail \
  --policy-document file://.agents/tmp/inbound-iam.json --profile rlth-prod --region us-east-1
```
`inbound-iam.json`:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Sid": "InboundBucketAccess",
      "Effect": "Allow",
      "Action": [ "s3:GetObject", "s3:ListBucket", "s3:DeleteObject" ],
      "Resource": [
        "arn:aws:s3:::rlth-prod-inbound-email-597936860711",
        "arn:aws:s3:::rlth-prod-inbound-email-597936860711/*"
      ]
    },
    {
      "Sid": "InboundKmsDecrypt",
      "Effect": "Allow",
      "Action": [ "kms:Decrypt", "kms:DescribeKey" ],
      "Resource": "arn:aws:kms:us-east-1:597936860711:key/8907012f-0f1e-48f9-a0f0-c3e774edb986"
    },
    {
      "Sid": "InboundSesSend",
      "Effect": "Allow",
      "Action": [ "ses:SendEmail", "ses:SendRawEmail" ],
      "Resource": "arn:aws:ses:us-east-1:597936860711:identity/rlth.org"
    }
  ]
}
```
The 5 existing inline policies were not modified.

---

## 8. Amplify branch env vars

Branch-level `environmentVariables` was empty `{}` before this call, so nothing was
overwritten.

```
aws amplify update-branch --app-id d1mwc7x488m8xn --branch-name aws-ehr-production \
  --environment-variables "EHR_INBOUND_EMAIL_BUCKET=rlth-prod-inbound-email-597936860711,EHR_INBOUND_EMAIL_REGION=us-east-1,EHR_INBOUND_EMAIL_PREFIX=inbound/,EHR_SES_FROM_ADDRESS=connect@rlth.org" \
  --profile rlth-prod --region us-east-1
```
Resulting branch `environmentVariables`:
```json
{
  "EHR_INBOUND_EMAIL_BUCKET": "rlth-prod-inbound-email-597936860711",
  "EHR_INBOUND_EMAIL_PREFIX": "inbound/",
  "EHR_INBOUND_EMAIL_REGION": "us-east-1",
  "EHR_SES_FROM_ADDRESS": "connect@rlth.org"
}
```

---

## Verification (read-back)

| Acceptance criterion | Command | Result |
|---|---|---|
| Bucket exists | `aws s3api head-bucket --bucket rlth-prod-inbound-email-597936860711 --region us-east-1 --profile rlth-prod` | exit 0 (no 404) |
| Encryption = SSE-KMS | `aws s3api get-bucket-encryption ...` | `aws:kms`, key `8907012f-...`, `BucketKeyEnabled=true` |
| Public access block | `aws s3api get-public-access-block ...` | all four flags `true` |
| Lifecycle | `aws s3api get-bucket-lifecycle-configuration ...` | rule `expire-inbound-365`, prefix `inbound/`, 365 days |
| SES active rule set | `aws ses describe-active-receipt-rule-set --region us-east-1 --profile rlth-prod` | `rlth-inbound` / `connect-to-s3`, S3Action → inbound bucket prefix `inbound/` |
| Route53 10 records | `aws route53 list-resource-record-sets --hosted-zone-id Z03865162FVI3E11XJFH3 ...` | 9 original + 1 MX `10 inbound-smtp.us-east-1.amazonaws.com` TTL 300; DKIM/_dmarc/NS/SOA unchanged |
| IAM policy added | `aws iam list-role-policies --role-name rlth-prod-amplify-ssr-compute` + `aws iam get-role-policy --policy-name RlthEhrInboundEmail` | 5 original + `RlthEhrInboundEmail`; 3 statements (S3, KMS, SES) present |
| SES sending not broken | `aws sesv2 send-email --from-email-address connect@rlth.org --destination ToAddresses=connect@rlth.org --content "Simple={...}" --region us-east-1 --profile rlth-prod` | exit 0, `MessageId` returned |

### Pending on DNS propagation (operator to confirm)
- End-to-end inbound: a real email to `connect@rlth.org` landing as an object under
  `s3://rlth-prod-inbound-email-597936860711/inbound/`. The MX change is `PENDING`
  (TTL 300); confirm after propagation. The send smoke test above was addressed to
  `connect@rlth.org`, so it should appear in the bucket once MX propagates.

### Final values for FEAT-002 / FEAT-003
- Bucket ARN: `arn:aws:s3:::rlth-prod-inbound-email-597936860711`
- KMS key: `arn:aws:kms:us-east-1:597936860711:key/8907012f-0f1e-48f9-a0f0-c3e774edb986`
- Encryption path used: **SSE-KMS** (reused existing key; key policy updated for SES)
- Object key prefix: `inbound/`
- SES receipt rule set / rule: `rlth-inbound` / `connect-to-s3`
- FROM address: `connect@rlth.org`
- Env vars (Amplify branch `aws-ehr-production`, app `d1mwc7x488m8xn`):
  - `EHR_INBOUND_EMAIL_BUCKET=rlth-prod-inbound-email-597936860711`
  - `EHR_INBOUND_EMAIL_REGION=us-east-1`
  - `EHR_INBOUND_EMAIL_PREFIX=inbound/`
  - `EHR_SES_FROM_ADDRESS=connect@rlth.org`
