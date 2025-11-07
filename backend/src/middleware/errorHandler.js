export const errorHandler = (err, req, res, next) => {
  console.error("Error:", err.stack);
  const status = err.status || 500;
  res.status(status).json({
    message: err.message || "Internal Server Error",
    ...(process.env.NODE_ENV === "development" && { stack: err.stack }), // Debug mode
  });
};
