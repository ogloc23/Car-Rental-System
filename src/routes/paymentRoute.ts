import express, { Request, Response } from 'express';
import { verifyPayment } from '../services/paystack.js';
import { PrismaClient } from '@prisma/client';

const router = express.Router();
const prisma = new PrismaClient();

// Log activity function (unchanged)
async function logActivity(userId: string, action: string, resourceType?: string, resourceId?: string): Promise<void> {
  try {
    await prisma.activityLog.create({
      data: { userId, action, resourceType, resourceId },
    });
  } catch (logError) {
    console.error(`❌ Failed to log activity for user ${userId}:`, logError);
  }
}

// Handle payment callback at the root path
router.get('/', async (req: Request, res: Response) => {
  const { trxref, reference } = req.query;

  // Use reference if provided, fallback to trxref
  const paymentRef = (reference || trxref) as string | undefined;

  if (!paymentRef) {
    return res.status(400).json({ status: false, message: 'No reference or trxref provided.' });
  }

  try {
    const response = await verifyPayment(paymentRef);
    if (!response.status || !response.data) {
      return res.status(400).json({
        status: false,
        message: response.message || 'Payment verification failed.',
      });
    }

    const { amount, status, currency, customer, gateway_response } = response.data;
    const customerEmail = customer?.email?.toLowerCase().trim();

    if (!customerEmail) {
      return res.status(400).json({
        status: false,
        message: 'Payment verification failed: No email found.',
      });
    }

    const user = await prisma.user.findUnique({
      where: { email: customerEmail },
      select: { id: true },
    });

    if (!user) {
      return res.status(400).json({
        status: false,
        message: 'User not found. Cannot record payment.',
      });
    }

    const existingPayment = await prisma.payment.findUnique({
      where: { reference: paymentRef },
    });

    if (existingPayment) {
      return res.status(200).json({
        status: true,
        message: 'Payment already recorded.',
        data: existingPayment,
      });
    }

    if (status !== 'success') {
      await logActivity(user.id, `Payment failed: ${paymentRef} (${gateway_response || 'Unknown reason'})`, 'Payment');
      return res.redirect(`${process.env.SERVER_URL}/payment/failure`);
    }

    const newPayment = await prisma.payment.create({
      data: {
        userId: user.id,
        reference: paymentRef,
        email: customerEmail,
        amount: amount / 100, // Convert kobo/cents to main currency unit
        currency,
        status,
      },
    });

    await logActivity(user.id, `Payment verified via callback: ${paymentRef} (${amount / 100} ${currency})`, 'Payment', newPayment.id);
    return res.redirect(`${process.env.SERVER_URL}/payment/success`);
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';
    console.error('❌ Error handling callback:', error);
    return res.redirect(`${process.env.SERVER_URL}/payment/failure`);
  } finally {
    await prisma.$disconnect(); // Ensure Prisma client disconnects
  }
});

export default router;