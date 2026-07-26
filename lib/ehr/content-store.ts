import { GetCommand, PutCommand } from "@aws-sdk/lib-dynamodb";
import { rlthAwsFoundation } from "../rlth-aws-foundation";
import { getDynamoDocumentClient } from "./aws-runtime";
import { defaultSiteContent, type SiteContent } from "../site-content";

const CONTENT_PK = "SITE#rlth";
const CONTENT_SK = "CONTENT#website";

export async function getSiteContent(): Promise<SiteContent> {
  try {
    const dynamo = getDynamoDocumentClient();
    const result = await dynamo.send(
      new GetCommand({
        TableName: rlthAwsFoundation.clinicalRecordsTableName,
        Key: { PK: CONTENT_PK, SK: CONTENT_SK },
      })
    );
    if (result.Item?.content && typeof result.Item.content === "object") {
      return { ...defaultSiteContent, ...(result.Item.content as Partial<SiteContent>) };
    }
  } catch {
    // Fall through to defaults if DynamoDB is unavailable
  }
  return { ...defaultSiteContent };
}

export async function saveSiteContent(content: SiteContent): Promise<void> {
  const dynamo = getDynamoDocumentClient();
  await dynamo.send(
    new PutCommand({
      TableName: rlthAwsFoundation.clinicalRecordsTableName,
      Item: {
        PK: CONTENT_PK,
        SK: CONTENT_SK,
        content,
        updatedAt: new Date().toISOString(),
      },
    })
  );
}
