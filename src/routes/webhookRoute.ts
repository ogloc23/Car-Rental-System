import express, { Request, Response } from 'express';
import crypto from 'crypto';
import { verifyPayment } from '../services/paystack.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

async function logActivity(userId: string, action: string, resourceType?: string, resourceId?: string): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: { userId, action, resourceType, resourceId },
    });
  } catch (logError) {
    console.error(`❌ Failed to log activity for user ${userId}:`, logError);
  }
}

router.post('/webhook', express.json(), async (req: Request, res: Response): Promise<void> => {
  try {
    const secret = process.env.PAYSTACK_SECRET_KEY;
    if (!secret) {
      console.error('❌ PAYSTACK_SECRET_KEY is missing in environment variables.');
      res.status(500).json({ message: 'Server configuration error.' });
      return;
    }

    const hash = crypto
      .createHmac('sha512', secret)
      .update(JSON.stringify(req.body))
      .digest('hex');

    if (hash !== req.headers['x-paystack-signature']) {
      console.warn('⚠️ Invalid Paystack signature detected.');
      res.status(400).json({ message: 'Invalid Paystack signature' });
      return;
    }

    const { event, data } = req.body;
    if (event === 'charge.success') {
      console.log('🔄 Verifying payment with reference:', data.reference);
      const payment = await verifyPayment(data.reference);

      if (!payment.status || !payment.data) {
        console.warn('⚠️ Payment verification failed:', payment.message);
        res.status(400).json({ message: payment.message || 'Payment verification failed.' });
        return;
      }

      const { amount, status, currency, customer } = payment.data;
      const customerEmail = customer?.email?.toLowerCase().trim();
      const amountInNaira = amount / 100;

      if (!customerEmail) {
        console.warn('⚠️ No customer email in payment data.');
        res.status(400).json({ message: 'No customer email provided.' });
        return;
      }

      const user = await prisma.user.findUnique({
        where: { email: customerEmail },
        select: { id: true },
      });

      if (!user) {
        console.warn('⚠️ User not found for email:', customerEmail);
        res.status(400).json({ message: 'User not found.' });
        return;
      }

      let paymentRecord = await prisma.payment.findUnique({
        where: { reference: data.reference },
      });

      if (!paymentRecord) {
        paymentRecord = await prisma.payment.create({
          data: {
            userId: user.id,
            reference: data.reference,
            email: customerEmail,
            amount: amountInNaira,
            currency,
            status,
          },
        });
        console.log('✅ Created new payment record:', paymentRecord);
      } else if (paymentRecord.status !== status) {
        paymentRecord = await prisma.payment.update({
          where: { reference: data.reference },
          data: { status, amount: amountInNaira },
        });
        console.log('✅ Updated payment status to:', status);
      }

      if (status === 'success') {
        await logActivity(
          user.id,
          `Payment confirmed via webhook: ${data.reference} (${amountInNaira} ${currency})`,
          'Payment',
          paymentRecord.id
        );
      } else if (status === 'failed') {
        await logActivity(user.id, `Payment failed via webhook: ${data.reference}`, 'Payment', paymentRecord.id);
        console.warn('❌ Payment status updated to FAILED.');
      } else {
        console.log('⌛ Payment status:', status, '- No further action.');
      }
    }

    res.sendStatus(200); // Always return 200 for webhooks
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error handling Paystack webhook:', error);
    res.status(500).json({ message: `Internal server error: ${errorMessage}` });
  }
});

export default router;