import { NextResponse } from 'next/server';
import { requireEhrActor, requireRole, ApiError, apiErrorResponse } from '../../../../../lib/ehr/auth';
import { appendAuditEvent } from '../../../../../lib/ehr/dynamodb-store';
import { sendSesV2 } from '../../../../../lib/ehr/ses-send';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

const FROM_ADDRESS = process.env.EHR_SES_FROM_ADDRESS || 'connect@rlth.org';

export async function POST(request: Request) {
  try {
    const actor = await requireEhrActor(request);
    requireRole(actor, ['owner', 'provider']);

    const body = (await request.json().catch(() => null)) as
      | { to?: unknown; subject?: unknown; text?: unknown; inReplyTo?: unknown }
      | null;
    if (!body) throw new ApiError(400, 'A JSON body is required.');

    const toRaw = Array.isArray(body.to) ? body.to : [body.to];
    const to = toRaw.filter((value): value is string => typeof value === 'string' && value.trim().length > 0).map((v) => v.trim());
    if (!to.length) throw new ApiError(400, 'At least one recipient is required.');

    const subject = typeof body.subject === 'string' ? body.subject : '';
    const text = typeof body.text === 'string' ? body.text : '';
    if (!text.trim()) throw new ApiError(400, 'Message text is required.');

    const inReplyTo = typeof body.inReplyTo === 'string' && body.inReplyTo.trim() ? body.inReplyTo.trim() : '';
    const headers = inReplyTo
      ? { 'In-Reply-To': inReplyTo, References: inReplyTo }
      : undefined;

    const result = await sendSesV2({
      from: FROM_ADDRESS,
      to,
      subject,
      text,
      replyTo: [FROM_ADDRESS],
      headers,
    });

    if (result.status === 'not-configured') throw new ApiError(503, 'Email sending is awaiting connection.');
    if (!result.ok) throw new ApiError(502, 'The email could not be sent.');

    await appendAuditEvent(actor, {
      action: 'Sent email',
      category: 'Email',
      entityType: 'outbound-email',
      summary: 'Provider sent an email from connect@rlth.org',
    });

    return NextResponse.json({ status: 'sent' });
  } catch (error) {
    return apiErrorResponse(error);
  }
}
