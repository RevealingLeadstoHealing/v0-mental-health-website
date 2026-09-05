# Incoming fax processing — source prepared, delivery not activated

Adapted from the supplied inbound-fax blueprint: verify a completed PDF, isolate the practice, prevent duplicate deliveries, and publish an unassigned inbox entry. The dedicated AWS S3 ingestion path replaces the unverified vendor-header and arbitrary-download-URL examples. No vendor or carrier has been selected by this code.

## Contract with the eventual receiving software

The receiving software must write a completed PDF to a dedicated private, versioned S3 bucket using KMS encryption. Use `inbound-faxes/<practiceId>/...pdf`, `ContentType: application/pdf`, and stable metadata `fax-id` identifying the original delivery across retries. PDFs are limited to 40 MiB. Client upload credentials must have no write access to this bucket. A PDF header check is not malware scanning; any required scanning/quarantine must happen before this trusted delivery prefix is populated.

An S3 ObjectCreated notification invokes the bundled `index.handler`. Lambda requires an account- and bucket-restricted resource policy; do not expose a function URL. Configure bucket/prefix/suffix filters, asynchronous failure destination, alarms and retry recovery. Enable versioning before receiving anything. Ingestion uses the event's exact object version, so overwrites cannot change a received document behind the provider's back.

Worker variables: `EHR_FAX_BUCKET`, `EHR_FAX_REGION`, `EHR_FAX_PRACTICE_ID`, `EHR_FAX_PROVIDER_ID` (Cognito subject), `EHR_FAX_KMS_KEY_ARN`, `EHR_RECORDS_TABLE`, `EHR_AWS_REGION` (clinical table region). Bundle `index.mjs`, `ingest.mjs` and the existing AWS SDK dependencies.

Grant the worker GetObjectVersion for the dedicated inbound prefix, KMS Decrypt for its key, and DynamoDB PutItem for the practice partition. Give the EHR compute role GetObjectVersion/KMS Decrypt for reviewed downloads; its existing clinical-table query and audit permissions remain necessary. Set `EHR_FAX_BUCKET` and `EHR_FAX_REGION` on the EHR deployment only after resources and permissions are configured.

## Provider inbox

`GET /api/ehr/fax/inbox` lists the authenticated provider's fax metadata, or the owner's practice inbox. Pagination is confined to that practice partition. `?id=<fax id>` returns an audited five-minute download URL for the recorded version. Client and billing roles are denied. This endpoint is connected to the existing fax inbox component. Ingestion keys are separate from generic client records and do not attach documents by caller number or guessed patient identity.

Chart assignment and outgoing transmission remain disabled. The reception software, Lambda deployment, bucket configuration and an end-to-end fax test are still required. Merely setting a bucket variable does not establish fax delivery.

Tests cover duplicate delivery without resetting assignment, retry after a storage failure, foreign bucket/practice rejection, version binding, and file checks. No live fax has been received or sent as part of this source change.
