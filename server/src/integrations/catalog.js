export const integrationCatalog = [
  {
    category: 'PAYMENT', provider: 'STRIPE', name: 'Stripe', description: 'Accept cards and supported local methods through Stripe Checkout.',
    configFields: [
      { key: 'publishableKey', label: 'Publishable key', placeholder: 'pk_live_…' },
      { key: 'successUrl', label: 'Success URL', placeholder: 'Leave blank to use the storefront payment-complete page' },
      { key: 'cancelUrl', label: 'Cancel URL', placeholder: 'Leave blank to return to checkout' }
    ],
    secretFields: [{ key: 'secretKey', label: 'Secret key', placeholder: 'sk_live_…' }, { key: 'webhookSecret', label: 'Webhook signing secret (recommended)', placeholder: 'whsec_…' }]
  },
  {
    category: 'PAYMENT', provider: 'RAZORPAY', name: 'Razorpay', description: 'Accept cards, UPI and other Razorpay methods.',
    configFields: [{ key: 'keyId', label: 'Key ID', placeholder: 'rzp_live_…' }],
    secretFields: [{ key: 'keySecret', label: 'Key secret' }, { key: 'webhookSecret', label: 'Webhook secret (recommended)' }]
  },
  {
    category: 'STORAGE', provider: 'CLOUDINARY', name: 'Cloudinary', description: 'Upload CMS media directly to Cloudinary.',
    configFields: [{ key: 'cloudName', label: 'Cloud name' }, { key: 'folder', label: 'Upload folder', placeholder: 'store-media' }],
    secretFields: [{ key: 'apiKey', label: 'API key' }, { key: 'apiSecret', label: 'API secret' }]
  },
  {
    category: 'STORAGE', provider: 'S3', name: 'S3-compatible storage', description: 'Use AWS S3 or a compatible object-storage provider.',
    configFields: [
      { key: 'bucket', label: 'Bucket' }, { key: 'region', label: 'Region', placeholder: 'ap-south-1' },
      { key: 'endpoint', label: 'Custom endpoint', placeholder: 'Optional for S3-compatible providers' },
      { key: 'publicBaseUrl', label: 'Public/CDN base URL', placeholder: 'https://cdn.example.com' },
      { key: 'forcePathStyle', label: 'Force path style', type: 'boolean' }
    ],
    secretFields: [{ key: 'accessKeyId', label: 'Access key ID' }, { key: 'secretAccessKey', label: 'Secret access key' }]
  },
  {
    category: 'EMAIL', provider: 'SMTP', name: 'SMTP email', description: 'Send transactional email through your own SMTP provider.',
    configFields: [
      { key: 'host', label: 'SMTP host' }, { key: 'port', label: 'Port', type: 'number', placeholder: '587' },
      { key: 'secure', label: 'Use TLS/SSL immediately', type: 'boolean' }, { key: 'fromName', label: 'From name' },
      { key: 'fromEmail', label: 'From email' }, { key: 'username', label: 'Username' }
    ],
    secretFields: [{ key: 'password', label: 'Password / app password' }]
  },
  {
    category: 'SMS', provider: 'TWILIO', name: 'Twilio SMS', description: 'Send transactional SMS through Twilio.',
    configFields: [{ key: 'accountSid', label: 'Account SID' }, { key: 'fromNumber', label: 'From phone number' }],
    secretFields: [{ key: 'authToken', label: 'Auth token' }]
  },
  {
    category: 'WHATSAPP', provider: 'META', name: 'WhatsApp Cloud API', description: 'Connect a Meta WhatsApp Business phone number.',
    configFields: [{ key: 'phoneNumberId', label: 'Phone number ID' }, { key: 'businessAccountId', label: 'Business account ID' }, { key: 'apiVersion', label: 'Graph API version', placeholder: 'v21.0' }],
    secretFields: [{ key: 'accessToken', label: 'Permanent access token' }]
  },
  {
    category: 'SHIPPING', provider: 'SHIPROCKET', name: 'Shiprocket', description: 'Connect Shiprocket for shipping operations when merchant credentials are available.',
    configFields: [{ key: 'email', label: 'Shiprocket login email' }, { key: 'pickupPostcode', label: 'Pickup postcode' }, { key: 'pickupLocation', label: 'Pickup location name', placeholder: 'Primary' }, { key: 'defaultWeightKg', label: 'Default package weight (kg)', type: 'number', placeholder: '0.5' }, { key: 'defaultLengthCm', label: 'Default length (cm)', type: 'number', placeholder: '10' }, { key: 'defaultBreadthCm', label: 'Default breadth (cm)', type: 'number', placeholder: '10' }, { key: 'defaultHeightCm', label: 'Default height (cm)', type: 'number', placeholder: '10' }],
    secretFields: [{ key: 'password', label: 'Shiprocket password' }]
  },
  {
    category: 'SHIPPING', provider: 'CUSTOM_API', name: 'Custom shipping API', description: 'Connect any shipping or delivery service that exposes HTTP endpoints.',
    configFields: [
      { key: 'healthUrl', label: 'Health/test URL' }, { key: 'quoteUrl', label: 'Quote URL' },
      { key: 'createShipmentUrl', label: 'Create shipment URL' }, { key: 'trackingUrl', label: 'Tracking URL' }
    ],
    secretFields: [{ key: 'bearerToken', label: 'Bearer token' }]
  },
  {
    category: 'WEBHOOK', provider: 'CUSTOM', name: 'Custom webhook', description: 'Send store events to another system without changing source code.',
    configFields: [{ key: 'url', label: 'Webhook URL' }, { key: 'events', label: 'Events (comma separated)', placeholder: 'order.created,form.submitted' }],
    secretFields: [{ key: 'signingSecret', label: 'Signing secret' }]
  }
];

export function findIntegrationSpec(category, provider) {
  return integrationCatalog.find((item) => item.category === category && item.provider === provider) || null;
}
