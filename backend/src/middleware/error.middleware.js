// 404 handler >> reached only when no route above it matched the request.
export const notFound = (req, res, next) => {
  const error = new Error(`Not Found - ${req.originalUrl}`);
  error.statusCode = 404;
  next(error);
};


export const errorHandler = (err, req, res, next) => {
  const statusCode =
    err.statusCode || (res.statusCode && res.statusCode !== 200 ? res.statusCode : 500);


  console.error(`[${req.method}] ${req.originalUrl} ->`, err);

  res.status(statusCode).json({
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "production" ? {} : { stack: err.stack }),
  });
};
