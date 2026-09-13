// MODIFIED for BizRethink (overlay 083): checked-address connections and bounded
// response consumption share one full-operation deadline in the owned transport.
export {
  executeSafeWebhookCall as executeWebhookCall,
  type WebhookCallResult,
} from '@bizrethink/customizations/server-only/outbound/webhook';
