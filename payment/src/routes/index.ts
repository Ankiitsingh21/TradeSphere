import express from 'express';
import v1Routes from './v1';

const router = express.Router();
router.use('/payments', v1Routes);

export { router as paymentRouter };