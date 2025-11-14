const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const morgan = require('morgan');

module.exports = (app) => {
  try {
    app.use(helmet());
  } catch (e) {
    console.warn('helmet not available:', e.message);
  }

  // Basic rate limiter
  try {
    const limiter = rateLimit({ windowMs: 60 * 1000, max: 120 }); // 120 requests per minute
    app.use(limiter);
  } catch (e) {
    console.warn('rateLimit not available:', e.message);
  }

  // Request logging
  try {
    app.use(morgan('dev'));
  } catch (e) {
    console.warn('morgan not available:', e.message);
  }
};
