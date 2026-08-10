import { GetObjectCommand, S3Client } from "@aws-sdk/client-s3";
import { GetMedicalScribeJobCommand, StartMedicalScribeJobCommand, TranscribeClient } from "@aws-sdk/client-transcribe";

export const healthScribeRegion = process.env.EHR_HEALTHSCRIBE_REGION || "us-east-1";
export const healthScribeBucket = process.env.EHR_HEALTHSCRIBE_BUCKET || "";
export const healthScribeKmsKeyArn = process.env.EHR_HEALTHSCRIBE_KMS_KEY_ARN || "";
export const healthScribeDataRoleArn = process.env.EHR_HEALTHSCRIBE_DATA_ROLE_ARN || "";

export const healthScribe = new TranscribeClient({ region: healthScribeRegion });
export const healthScribeS3 = new S3Client({ region: healthScribeRegion });

export function assertHealthScribeConfigured() {
  if (!healthScribeBucket || !healthScribeKmsKeyArn || !healthScribeDataRoleArn) {
    throw new Error("AWS HealthScribe production resources are not configured.");
  }
}

export async function startHealthScribeJob(input: {
  jobName: string;
  mediaKey: string;
  noteTemplate: "GIRPP" | "BIRP" | "SIRP" | "DAP" | "BEHAVIORAL_SOAP";
  practiceId: string;
  clientId: string;
}) {
  assertHealthScribeConfigured();
  return healthScribe.send(new StartMedicalScribeJobCommand({
    MedicalScribeJobName: input.jobName,
    Media: { MediaFileUri: `s3://${healthScribeBucket}/${input.mediaKey}` },
    OutputBucketName: healthScribeBucket,
    OutputEncryptionKMSKeyId: healthScribeKmsKeyArn,
    DataAccessRoleArn: healthScribeDataRoleArn,
    Settings: {
      ShowSpeakerLabels: true,
      MaxSpeakerLabels: 2,
      ClinicalNoteGenerationSettings: { NoteTemplate: input.noteTemplate },
    },
  }));
}

export async function getHealthScribeJob(jobName: string) {
  assertHealthScribeConfigured();
  return healthScribe.send(new GetMedicalScribeJobCommand({ MedicalScribeJobName: jobName }));
}

export async function readS3Json(uri?: string) {
  if (!uri) return null;
  let bucket = healthScribeBucket;
  let key = "";
  if (uri.startsWith("s3://")) {
    const value = uri.slice(5);
    const separator = value.indexOf("/");
    bucket = value.slice(0, separator);
    key = value.slice(separator + 1);
  } else {
    const parsed = new URL(uri);
    const virtualHosted = parsed.hostname.match(/^(.+)\.s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/i);
    if (virtualHosted) {
      bucket = virtualHosted[1];
      key = decodeURIComponent(parsed.pathname.replace(/^\//, ""));
    } else if (/^s3(?:[.-][a-z0-9-]+)?\.amazonaws\.com$/i.test(parsed.hostname)) {
      const [pathBucket, ...pathKey] = decodeURIComponent(parsed.pathname.replace(/^\//, "")).split("/");
      bucket = pathBucket || healthScribeBucket;
      key = pathKey.join("/");
    }
  }
  if (!bucket || !key) throw new Error("AWS HealthScribe returned an invalid S3 output URI.");
  const response = await healthScribeS3.send(new GetObjectCommand({ Bucket: bucket, Key: key }));
  const text = await response.Body?.transformToString();
  return text ? JSON.parse(text) : null;
}
