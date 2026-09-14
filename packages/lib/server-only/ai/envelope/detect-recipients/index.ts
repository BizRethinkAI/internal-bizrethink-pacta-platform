// MODIFIED for BizRethink (overlay 089): bounded resource work and trial/domain policy.
import { type AiBudget, withAiBudget } from '@bizrethink/customizations/server-only/resources/ai-budget';
import { prisma } from '@documenso/prisma';
import { DocumentStatus } from '@prisma/client';
import type { ImagePart, ModelMessage } from 'ai';
import { generateObject } from 'ai';
import { chunk } from 'remeda';

import { AppError, AppErrorCode } from '../../../../errors/app-error';
import { getFileServerSide } from '../../../../universal/upload/get-file.server';
import { getEnvelopeById } from '../../../envelope/get-envelope-by-id';
import { vertex } from '../../google';
import { pdfToImages } from '../../pdf-to-images';
import { SYSTEM_PROMPT } from './prompt';
import type { TDetectedRecipientSchema } from './schema';
import { ZDetectedRecipientsSchema } from './schema';

const MAX_PAGES_PER_CHUNK = 10;

const createImageContentParts = (images: Buffer[]) => {
  return images.map<ImagePart>((image) => ({
    type: 'image',
    image,
  }));
};

export type DetectRecipientsProgress = {
  pagesProcessed: number;
  totalPages: number;
  recipientsDetected: number;
};

export type DetectRecipientsFromEnvelopeOptions = {
  envelopeId: string;
  userId: number;
  teamId: number;
  onProgress?: (progress: DetectRecipientsProgress) => void;
};

export const detectRecipientsFromEnvelope = async ({
  envelopeId,
  userId,
  teamId,
  onProgress,
}: DetectRecipientsFromEnvelopeOptions) => {
  const envelope = await getEnvelopeById({
    id: {
      type: 'envelopeId',
      id: envelopeId,
    },
    userId,
    teamId,
    type: null,
  });

  if (envelope.status === DocumentStatus.COMPLETED) {
    throw new AppError(AppErrorCode.INVALID_REQUEST, {
      message: 'Cannot detect recipients for a completed envelope',
    });
  }

  const team = await prisma.team.findUniqueOrThrow({ where: { id: teamId }, select: { organisationId: true } });
  return withAiBudget({ userId, organisationId: team.organisationId }, async (budget) => {
    let allRecipients: TDetectedRecipientSchema[] = [];

    for (const item of envelope.envelopeItems) {
      budget.signal.throwIfAborted();
      const pdfBytes = await getFileServerSide(item.documentData);
      const recipients = await detectRecipientsFromPdf({ pdfBytes, onProgress, budget });

      allRecipients = mergeRecipients(allRecipients, recipients);
    }

    return allRecipients;
  });
};

export type DetectRecipientsFromPdfOptions = {
  budget: AiBudget;
  pdfBytes: Uint8Array;
  onProgress?: (progress: DetectRecipientsProgress) => void;
};

export const detectRecipientsFromPdf = async ({ pdfBytes, onProgress, budget }: DetectRecipientsFromPdfOptions) => {
  budget.signal.throwIfAborted();
  const pageImages = await pdfToImages(pdfBytes, { maxPages: budget.remainingPages() });
  budget.consumePages(pageImages.length);

  if (pageImages.length === 0) {
    return [];
  }

  const images = pageImages.map((p) => p.image);

  return await detectRecipientsFromImages({ images, onProgress, budget });
};

type DetectRecipientsFromImagesOptions = {
  budget: AiBudget;
  images: Buffer[];
  onProgress?: (progress: DetectRecipientsProgress) => void;
};

const formatDetectedRecipients = (recipients: TDetectedRecipientSchema[]) => {
  if (recipients.length === 0) {
    return '';
  }

  const formatted = recipients
    .map((r, i) => `${i + 1}. ${r.name || '(no name)'} - ${r.email || '(no email)'} - ${r.role}`)
    .join('\n');

  return `\n\nRecipients detected so far:\n${formatted}`;
};

const isDuplicateRecipient = (recipient: TDetectedRecipientSchema, existing: TDetectedRecipientSchema) => {
  if (recipient.email && existing.email) {
    return recipient.email.toLowerCase() === existing.email.toLowerCase();
  }

  if (recipient.name && existing.name) {
    return recipient.name.toLowerCase() === existing.name.toLowerCase();
  }

  return false;
};

const mergeRecipients = (existingRecipients: TDetectedRecipientSchema[], newRecipients: TDetectedRecipientSchema[]) => {
  const merged = [...existingRecipients];

  for (const recipient of newRecipients) {
    const isDuplicate = merged.some((existing) => isDuplicateRecipient(recipient, existing));

    if (!isDuplicate) {
      merged.push(recipient);
    }
  }

  return merged;
};

const buildPromptText = (options: {
  chunkIndex: number;
  totalChunks: number;
  totalPages: number;
  startPage: number;
  endPage: number;
  detectedRecipients: TDetectedRecipientSchema[];
}) => {
  const { chunkIndex, totalChunks, totalPages, startPage, endPage, detectedRecipients } = options;

  const isFirstChunk = chunkIndex === 0;
  const isSingleChunk = totalChunks === 1;
  const batchNumber = chunkIndex + 1;
  const previouslyFoundText = formatDetectedRecipients(detectedRecipients);

  if (isSingleChunk) {
    return `Please analyze these ${totalPages} document page(s) and detect all recipients. Submit all detected recipients using the tool.`;
  }

  if (isFirstChunk) {
    return `This is a ${totalPages}-page document. I'll show you the pages in batches of ${MAX_PAGES_PER_CHUNK}.

Here are pages ${startPage}-${endPage} (batch ${batchNumber} of ${totalChunks}).

Please analyze these pages and submit any recipients you find using the tool. I will show you the remaining pages after.`;
  }

  return `Here are pages ${startPage}-${endPage} (batch ${batchNumber} of ${totalChunks}).${previouslyFoundText}

Please analyze these pages and submit any NEW recipients you find (not already listed above) using the tool.`;
};

const detectRecipientsFromImages = async ({ images, onProgress, budget }: DetectRecipientsFromImagesOptions) => {
  const imageChunks = chunk(images, MAX_PAGES_PER_CHUNK);

  const totalChunks = imageChunks.length;
  const totalPages = images.length;

  const messages: ModelMessage[] = [];
  let allRecipients: TDetectedRecipientSchema[] = [];

  for (const [chunkIndex, currentChunk] of imageChunks.entries()) {
    budget.signal.throwIfAborted();
    await budget.reserveProviderCalls(1);
    const startPage = chunkIndex * MAX_PAGES_PER_CHUNK + 1;
    const endPage = startPage + currentChunk.length - 1;

    const promptText = buildPromptText({
      chunkIndex,
      totalChunks,
      totalPages,
      startPage,
      endPage,
      detectedRecipients: allRecipients,
    });

    // Add user message with images for this chunk
    messages.push({
      role: 'user',
      content: [
        {
          type: 'text',
          text: promptText,
        },
        ...createImageContentParts(currentChunk),
      ],
    });

    const result = await generateObject({
      model: vertex('gemini-3-flash-preview'),
      maxOutputTokens: 4096,
      maxRetries: 0,
      abortSignal: budget.signal,
      system: SYSTEM_PROMPT,
      schema: ZDetectedRecipientsSchema,
      messages,
      temperature: 0.5,
    });

    const newRecipients = result.object?.recipients ?? [];

    // Merge new recipients into our accumulated list (handles duplicates)
    budget.signal.throwIfAborted();
    allRecipients = mergeRecipients(allRecipients, newRecipients);
    if (allRecipients.length > 100) {
      throw new AppError(AppErrorCode.LIMIT_EXCEEDED);
    }

    // Report progress (endPage represents pages processed so far)
    onProgress?.({
      pagesProcessed: endPage,
      totalPages,
      recipientsDetected: allRecipients.length,
    });

    // Add assistant response as context for next iteration
    messages.push({
      role: 'assistant',
      content: `Detected recipients: ${JSON.stringify(allRecipients)}`,
    });
  }

  return allRecipients;
};
