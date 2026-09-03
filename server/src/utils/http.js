export function asyncRoute(handler) {
  return (req, res, next) => Promise.resolve(handler(req, res, next)).catch(next);
}

export function notFound(req, res) {
  res.status(404).json({ message: 'Resource not found' });
}

export function errorHandler(error, req, res, next) {
  if (res.headersSent) return next(error);
  const status = error.status || 500;
  const message = status >= 500 && process.env.NODE_ENV === 'production'
    ? 'Something went wrong. Please try again.'
    : error.message || 'Something went wrong.';
  if (status >= 500) console.error(error);
  res.status(status).json({ message });
}

export function httpError(status, message) {
  const error = new Error(message);
  error.status = status;
  return error;
}
