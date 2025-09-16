const crypto = require('crypto');

const validateWebhook = (source) => {
  return (req, res, next) => {
    console.log(`Validating ${source} webhook request`);

    if (source === 'monday' && process.env.MONDAY_WEBHOOK_SECRET) {
      const mondaySignature = req.get('Authorization');
      const secret = process.env.MONDAY_WEBHOOK_SECRET;

      if (!mondaySignature) {
        console.warn('Missing Monday.com webhook signature');
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: Missing signature'
        });
      }

      const body = JSON.stringify(req.body);
      const hash = crypto.createHmac('sha256', secret).update(body).digest('hex');

      if (hash !== mondaySignature) {
        console.warn('Invalid Monday.com webhook signature');
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: Invalid signature'
        });
      }
    }

    if (source === 'airbyte' && process.env.AIRBYTE_WEBHOOK_TOKEN) {
      const token = req.get('X-Airbyte-Token') || req.get('Authorization')?.replace('Bearer ', '');

      if (!token) {
        console.warn('Missing Airbyte webhook token');
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: Missing token'
        });
      }

      if (token !== process.env.AIRBYTE_WEBHOOK_TOKEN) {
        console.warn('Invalid Airbyte webhook token');
        return res.status(401).json({
          success: false,
          error: 'Unauthorized: Invalid token'
        });
      }
    }

    next();
  };
};

module.exports = { validateWebhook };