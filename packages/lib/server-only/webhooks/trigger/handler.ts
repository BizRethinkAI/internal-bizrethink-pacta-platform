// MODIFIED for BizRethink (overlay 090): redact server diagnostics before transport.
import { createServerConsole } from '@bizrethink/customizations/server-only/logging/server-console';
import { jobs } from '../../../jobs/client';
import { verify } from '../../crypto/verify';
import { getAllWebhooksByEventTrigger } from '../get-all-webhooks-by-event-trigger';
import { ZTriggerWebhookBodySchema } from './schema';

const serverConsole = createServerConsole('packages/lib/server-only/webhooks/trigger/handler');

export type HandlerTriggerWebhooksResponse =
  | {
      success: true;
      message: string;
    }
  | {
      success: false;
      error: string;
    };

// Todo: [Webhooks] delete after deployment.
export const handlerTriggerWebhooks = async (req: Request) => {
  const signature = req.headers.get('x-webhook-signature');

  if (typeof signature !== 'string') {
    serverConsole.log('Missing signature');
    return Response.json({ success: false, error: 'Missing signature' }, { status: 400 });
  }

  const body = await req.json();

  const valid = verify(body, signature);

  if (!valid) {
    serverConsole.log('Invalid signature');
    return Response.json({ success: false, error: 'Invalid signature' }, { status: 400 });
  }

  const result = ZTriggerWebhookBodySchema.safeParse(body);

  if (!result.success) {
    serverConsole.log('Invalid request body');
    return Response.json({ success: false, error: 'Invalid request body' }, { status: 400 });
  }

  const { event, data, userId, teamId } = result.data;

  const allWebhooks = await getAllWebhooksByEventTrigger({ event, userId, teamId });

  await Promise.allSettled(
    allWebhooks.map(async (webhook) => {
      await jobs.triggerJob({
        name: 'internal.execute-webhook',
        payload: {
          event,
          webhookId: webhook.id,
          data,
        },
      });
    }),
  );

  return Response.json({ success: true, message: 'Webhooks queued for execution' }, { status: 200 });
};
