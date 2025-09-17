const apiKeyAuth = (req, res, next) => {
  const apiKey = process.env.API_KEY;

  if (!apiKey || apiKey === '') {
    console.warn('API_KEY environment variable not set - authentication disabled');
    return next();
  }

  const providedKey = req.query.api_key || req.query.apiKey || req.query.key;

  if (!providedKey) {
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'API key is required. Please provide it as a query parameter (e.g., ?api_key=YOUR_KEY)'
    });
  }

  if (providedKey !== apiKey) {
    console.warn(`Invalid API key attempt from IP: ${req.ip}`);
    return res.status(401).json({
      error: 'Unauthorized',
      message: 'Invalid API key'
    });
  }

  next();
};

module.exports = { apiKeyAuth };