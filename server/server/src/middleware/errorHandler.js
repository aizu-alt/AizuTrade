// Express 4/5 error wrapper & standardized error response handler
export const asyncHandler = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch(next);

export function errorHandler(err, _req, res, _next) {
  console.error(`[Server Error] ${err.name || "Error"}: ${err.message}`);
  if (err.name === "ValidationError") {
    const msg = Object.values(err.errors || {}).map((e) => e.message).join(", ") || "Validation error";
    return res.status(400).json({ error: true, message: msg, status: 400 });
  }
  if (err.name === "CastError") {
    return res.status(400).json({ error: true, message: "Invalid ID format.", status: 400 });
  }
  const status = Number(err.status || err.statusCode) || 500;
  res.status(status).json({
    error: true,
    message: err.message || "An unexpected server error occurred.",
    status,
  });
}
