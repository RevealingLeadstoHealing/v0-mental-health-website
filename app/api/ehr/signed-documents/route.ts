import { NextResponse } from 'next/server';
import { requireEhrActor, requireRole, apiErrorResponse } from '../../../../lib/ehr/auth';
import { requireClientAccess } from '../../../../lib/ehr/authorization';
import { getClinicalRecord, appendAuditEvent } from '../../../../lib/ehr/dynamodb-store';
import { listSignedDocuments, preserveSignedDocuments } from '../../../../lib/ehr/signed-documents';
export async function GET(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ['client', 'provider', 'owner']);
    const clientId = new URL(request.url).searchParams.get('clientId') || actor.sub;
    await requireClientAccess(actor, clientId);
    const existing = await getClinicalRecord(actor.practiceId, clientId, 'ehr-module-snapshot', 'module_documents');
    // Preserve available legacy signatures without inventing historical versions.
    await preserveSignedDocuments(actor.practiceId, clientId, existing?.payload?.value);
    const documents = await listSignedDocuments(actor.practiceId, clientId);
    await appendAuditEvent(actor, { action: 'Viewed signed document copies', category: 'Document Access', clientId, entityType: 'signed-documents', summary: 'Accessed preserved client-signed documents.' });
    return NextResponse.json({ documents }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) { return apiErrorResponse(error); }
}
