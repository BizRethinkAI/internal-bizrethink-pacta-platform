/** Shared by server and browser renders; never accept or serialize the raw error. */
export const logRenderError = (source: 'root' | 'embed', statusCode: number) => {
  const record = {
    event: 'render.failed',
    component: source === 'embed' ? 'embed_boundary' : 'root_boundary',
    statusCode: Number.isInteger(statusCode) && statusCode >= 100 && statusCode <= 599 ? statusCode : 500,
  };

  if (source === 'embed') {
    console.log(record);
    return;
  }

  console.error(record);
};
