import { createRequire } from 'node:module';
import { Worker } from 'node:worker_threads';
import { AppError } from '@documenso/lib/errors/app-error';
import { withResourceSlot } from './admission';

export const MAX_PDF_BYTES = 128 * 1024 * 1024;
export const MAX_PDF_PAGES = 1000;
export const MAX_IMAGE_BYTES = 8 * 1024 * 1024;
const MAX_PROCESSING_MS = 30_000;
const retained = globalThis as typeof globalThis & { __pactaMediaBytes?: number };
const moduleRequire = createRequire(import.meta.url);
// Resolve through the package that owns these installed dependencies. This
// survives the app/router bundles and Docker's workspace dependency pruning;
// it does not depend on a TypeScript worker file being copied into build/.
const dependencyRequire = createRequire(moduleRequire.resolve('@documenso/lib/package.json'));

type MediaOperation =
  | 'normalize'
  | 'count-pages'
  | 'fill-form'
  | 'render'
  | 'avatar'
  | 'avatar-load'
  | 'logo'
  | 'logo-load';
const workerSource = String.raw`
const { parentPort, workerData } = require('node:worker_threads');
const { pathToFileURL } = require('node:url');
(async () => {
  const { operation, bytes, flattenForm, modules, maxPages, maxOutputBytes, scale, formValues } = workerData;
  let output;
  if (operation === 'render') {
    const { Canvas, Image, Path2D } = require(modules.canvas);
    globalThis.Image = Image;
    globalThis.Path2D = Path2D;
    const pdfjs = await import(pathToFileURL(modules.pdfjs).href);
    pdfjs.GlobalWorkerOptions.workerSrc = pathToFileURL(modules.pdfjsWorker).href;
    const checkCanvas = (width, height) => {
      if (!Number.isFinite(width * height) || width <= 0 || height <= 0 || width * height > 4_000_000 || width > 4096 || height > 4096) {
        throw new Error('Canvas exceeds the rendering limit.');
      }
    };
    function CanvasFactory() {}
    CanvasFactory.prototype.create = function(width, height) {
      checkCanvas(width, height);
      const canvas = new Canvas(width, height);
      canvas.gpu = false;
      return { canvas, context: canvas.getContext('2d') };
    };
    CanvasFactory.prototype.reset = function(target, width, height) {
      checkCanvas(width, height);
      target.canvas.width = width;
      target.canvas.height = height;
    };
    CanvasFactory.prototype.destroy = function(target) {
      if (target.canvas) { target.canvas.width = 0; target.canvas.height = 0; }
      target.canvas = null; target.context = null;
    };
    const task = pdfjs.getDocument({ data: bytes, CanvasFactory, maxImageSize: 16_000_000, isEvalSupported: false });
    const pdf = await task.promise;
    try {
      if (pdf.numPages > maxPages) { throw new Error('Too many pages for AI processing.'); }
      const images = [];
      let totalBytes = 0;
      for (let pageNumber = 1; pageNumber <= pdf.numPages; pageNumber++) {
        const page = await pdf.getPage(pageNumber);
        const original = page.getViewport({ scale });
        const adjustment = Math.min(1, 4096 / original.width, 4096 / original.height, Math.sqrt(4_000_000 / (original.width * original.height)));
        const viewport = page.getViewport({ scale: scale * adjustment });
        const width = Math.floor(viewport.width);
        const height = Math.floor(viewport.height);
        checkCanvas(width, height);
        const canvas = new Canvas(width, height);
        canvas.gpu = false;
        await page.render({ canvas, canvasContext: canvas.getContext('2d'), viewport }).promise;
        const image = await canvas.toBuffer('jpeg');
        totalBytes += image.byteLength;
        if (totalBytes > 24 * 1024 * 1024) { throw new Error('Rendered images exceed the output limit.'); }
        images.push({ pageNumber, image: image.toString('base64'), width, height, mimeType: 'image/jpeg' });
        page.cleanup();
        canvas.width = 0; canvas.height = 0;
      }
      output = Buffer.from(JSON.stringify(images));
    } finally {
      await pdf.destroy();
      await task.destroy();
    }
  } else if (operation === 'count-pages') {
    const { PDFDocument } = require(modules.cantoo);
    let pages = null;
    try {
      pages = (await PDFDocument.load(bytes, { updateMetadata: false })).getPageCount();
    } catch {}
    if (pages !== null && pages > maxPages) {
      throw new Error('PDF page limit exceeded.');
    }
    output = Buffer.from(JSON.stringify(pages));
  } else if (operation === 'normalize' || operation === 'fill-form') {
    const { PDF } = await import(pathToFileURL(modules.pdf).href);
    const document = await PDF.load(bytes);
    if (document.isEncrypted || document.getPageCount() > maxPages) {
      throw new Error('PDF cannot be processed within the document limits.');
    }
    if (operation === 'normalize') { document.flattenLayers(); }
    const form = document.getForm();
    if (operation === 'fill-form' && form) {
      form.fill(Object.fromEntries(Object.entries(formValues).map(([key, value]) => [key, typeof value === 'boolean' ? value : String(value)])));
    }
    if (operation === 'normalize' && flattenForm && form) {
      form.flatten();
      document.flattenAnnotations();
    }
    output = await document.save({ incremental: operation === 'fill-form' });
  } else {
    const sharp = require(modules.sharp);
    sharp.cache(false);
    sharp.concurrency(1);
    let image = sharp(Buffer.from(bytes), { limitInputPixels: 16_000_000, sequentialRead: true }).timeout({ seconds: 10 });
    if (operation === 'avatar') {
      image = image.resize(512, 512).jpeg({ quality: 75 });
    } else if (operation === 'avatar-load') {
      image = image.jpeg();
    } else if (operation === 'logo') {
      image = image.resize(512, 512, { fit: 'inside', withoutEnlargement: true }).png({ quality: 80 });
    } else {
      image = image.png({ quality: 80 });
    }
    output = await image.toBuffer();
  }
  if (output.byteLength > maxOutputBytes) {
    throw new Error('Processed file exceeds the output limit.');
  }
  parentPort.postMessage({ ok: true, bytes: output });
})().catch(() => parentPort.postMessage({ ok: false }));
`;

const runMediaTask = async (
  operation: MediaOperation,
  bytes: Uint8Array,
  options: {
    flattenForm?: boolean;
    timeoutMs?: number;
    maxPages?: number;
    scale?: number;
    formValues?: Record<string, string | boolean | number>;
  } = {},
) => {
  const pdf =
    operation === 'normalize' || operation === 'count-pages' || operation === 'render' || operation === 'fill-form';
  const maximum = pdf ? MAX_PDF_BYTES : MAX_IMAGE_BYTES;
  const failed = () =>
    new AppError('INVALID_DOCUMENT_FILE', {
      statusCode: 400,
      message: pdf
        ? 'The PDF is invalid or exceeds the processing limits.'
        : 'The image is invalid or exceeds the processing limits.',
    });
  if (bytes.byteLength === 0 || bytes.byteLength > maximum) {
    throw failed();
  }
  const currentBytes = retained.__pactaMediaBytes ?? 0;
  if (currentBytes + bytes.byteLength > 256 * 1024 * 1024) {
    throw new AppError('TOO_MANY_REQUESTS', {
      statusCode: 429,
      message: 'File processing capacity is busy. Try again shortly.',
    });
  }
  retained.__pactaMediaBytes = currentBytes + bytes.byteLength;
  try {
    return await withResourceSlot('media-worker', 2, async () => {
      const timeoutMs = Number.isFinite(options.timeoutMs)
        ? Math.max(1, Math.min(MAX_PROCESSING_MS, options.timeoutMs!))
        : MAX_PROCESSING_MS;
      const worker = new Worker(workerSource, {
        eval: true,
        workerData: {
          operation,
          bytes,
          flattenForm: options.flattenForm ?? true,
          modules: {
            pdf: dependencyRequire.resolve('@libpdf/core'),
            sharp: dependencyRequire.resolve('sharp'),
            cantoo: dependencyRequire.resolve('@cantoo/pdf-lib'),
            canvas: dependencyRequire.resolve('@documenso/skia-canvas'),
            pdfjs: dependencyRequire.resolve('pdfjs-dist/legacy/build/pdf.mjs'),
            pdfjsWorker: dependencyRequire.resolve('pdfjs-dist/legacy/build/pdf.worker.mjs'),
          },
          maxPages: options.maxPages ?? MAX_PDF_PAGES,
          maxOutputBytes: operation === 'render' ? 33 * 1024 * 1024 : maximum,
          scale: options.scale ?? 2,
          formValues: options.formValues,
        },
        // V8 heap bounds complement input/pixel caps. External buffers and native
        // memory still require the deployment's container memory/CPU limits.
        resourceLimits: { maxOldGenerationSizeMb: 256, maxYoungGenerationSizeMb: 32, stackSizeMb: 4 },
      });
      try {
        return await new Promise<Buffer>((resolve, reject) => {
          const timer = setTimeout(() => reject(failed()), timeoutMs);
          const finish = (operation: () => void) => {
            clearTimeout(timer);
            operation();
          };
          worker.once('message', (message: { ok: boolean; bytes?: Uint8Array }) =>
            finish(() => {
              if (!message.ok || !message.bytes || message.bytes.byteLength > maximum) {
                reject(failed());
              } else {
                resolve(Buffer.from(message.bytes));
              }
            }),
          );
          worker.once('error', () => finish(() => reject(failed())));
          worker.once('exit', () => finish(() => reject(failed())));
        });
      } finally {
        await worker.terminate();
      }
    });
  } finally {
    retained.__pactaMediaBytes = Math.max(0, (retained.__pactaMediaBytes ?? bytes.byteLength) - bytes.byteLength);
  }
};

export const normalizeBoundedPdf = (
  bytes: Buffer,
  options: {
    flattenForm?: boolean;
    timeoutMs?: number;
    maxPages?: number;
    scale?: number;
    formValues?: Record<string, string | boolean | number>;
  } = {},
) => runMediaTask('normalize', bytes, options);

export const processBoundedImage = (
  operation: Exclude<MediaOperation, 'normalize' | 'count-pages' | 'fill-form' | 'render'>,
  input: Uint8Array | string,
) => {
  if (typeof input === 'string' && input.length > Math.ceil(MAX_IMAGE_BYTES / 3) * 4) {
    throw new AppError('INVALID_DOCUMENT_FILE', { statusCode: 400, message: 'The image exceeds the size limit.' });
  }
  return runMediaTask(operation, typeof input === 'string' ? Buffer.from(input, 'base64') : input);
};

export const countBoundedPdfPages = async (bytes: Uint8Array): Promise<number | null> => {
  const result = await runMediaTask('count-pages', bytes);
  return JSON.parse(result.toString('utf8')) as number | null;
};

export type BoundedPdfImage = { pageNumber: number; image: Buffer; width: number; height: number; mimeType: string };
export const renderBoundedPdf = async (
  bytes: Uint8Array,
  options: { scale?: number; maxPages?: number } = {},
): Promise<BoundedPdfImage[]> => {
  const maxPages = options.maxPages ?? 20;
  const scale = options.scale ?? 2;
  if (
    !Number.isSafeInteger(maxPages) ||
    maxPages < 1 ||
    maxPages > 20 ||
    !Number.isFinite(scale) ||
    scale <= 0 ||
    scale > 4
  ) {
    throw new AppError('INVALID_DOCUMENT_FILE', {
      statusCode: 400,
      message: 'The PDF exceeds the AI processing limits.',
    });
  }
  const result = await runMediaTask('render', bytes, { maxPages, scale });
  const images = JSON.parse(result.toString('utf8')) as (Omit<BoundedPdfImage, 'image'> & { image: string })[];
  return images.map((page) => ({ ...page, image: Buffer.from(page.image, 'base64') }));
};

export const fillBoundedPdfForm = ({
  pdf,
  formValues,
}: {
  pdf: Buffer;
  formValues: Record<string, string | boolean | number>;
}) => {
  if (Object.keys(formValues).length > 1000 || JSON.stringify(formValues).length > 1024 * 1024) {
    throw new AppError('INVALID_REQUEST', { statusCode: 400, message: 'Form values exceed the processing limit.' });
  }
  return runMediaTask('fill-form', pdf, { formValues });
};
