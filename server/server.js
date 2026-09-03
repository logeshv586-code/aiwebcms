import 'dotenv/config';
import { createApp } from './src/app.js';

const port = Number(process.env.PORT || 5000);
if (process.env.NODE_ENV === 'production') {
  if (!process.env.JWT_SECRET || process.env.JWT_SECRET === 'development-only-change-me' || process.env.JWT_SECRET.length < 32) {
    throw new Error('JWT_SECRET must be set to a random value of at least 32 characters in production.');
  }
  if (!process.env.INTEGRATION_ENCRYPTION_KEY || process.env.INTEGRATION_ENCRYPTION_KEY.length < 32) {
    throw new Error('INTEGRATION_ENCRYPTION_KEY must be set to a random value of at least 32 characters in production.');
  }
}
const app = createApp();

app.listen(port, () => {
  console.log(`Commerce API running at http://localhost:${port}`);
});
