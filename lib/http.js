export const sendJson = (res, statusCode, body) => res.status(statusCode).json(body);

export const methodNotAllowed = (res, allowedMethods) =>
  sendJson(res, 405, { error: `Method not allowed. Use: ${allowedMethods.join(', ')}` });

export const parseRequestBody = (req) => {
  if (!req?.body) {
    return {};
  }

  if (typeof req.body === 'string') {
    return JSON.parse(req.body);
  }

  return req.body;
};
