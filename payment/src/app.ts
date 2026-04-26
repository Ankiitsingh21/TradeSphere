import express from 'express';
import { currentUser, errorHandler } from '@showsphere/common';
import cookieSession from 'cookie-session';
import { paymentRouter } from './routes';

const app = express();

app.set('trust proxy', true);

// CRITICAL: Webhook route MUST use raw body — before express.json()
// Stripe needs raw Buffer to verify signature
app.use(
  '/api/payments/webhook',
  express.raw({ type: 'application/json' }),
);

app.use(express.json());

app.use(
  cookieSession({
    signed: false,
    secure: false,
  }),
);

app.use(currentUser);
app.use('/api', paymentRouter);
app.use(errorHandler);

export { app };