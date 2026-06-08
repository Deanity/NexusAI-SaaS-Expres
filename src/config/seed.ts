import { connectDB } from '@/config/db';
import { Plan } from '@/modules/subscription/plan.model';
import mongoose from 'mongoose';

const plansToSeed = [
  {
    name: 'Free',
    slug: 'free',
    price: 0,
    currency: 'USD' as const,
    billingCycle: 'monthly' as const,
    creditsPerCycle: 100,
    features: {
      maxApiKeys: 1,
      maxConversations: 5,
      maxMessagesPerDay: 10,
      allowedModels: ['gemini-1.5-flash'],
      priorityQueue: false,
      analyticsRetentionDays: 30,
    },
    isActive: true,
  },
  {
    name: 'Starter',
    slug: 'starter',
    price: 900, // $9.00
    currency: 'USD' as const,
    billingCycle: 'monthly' as const,
    creditsPerCycle: 1000,
    features: {
      maxApiKeys: 3,
      maxConversations: 20,
      maxMessagesPerDay: 50,
      allowedModels: ['gemini-1.5-flash', 'gemini-1.5-pro'],
      priorityQueue: false,
      analyticsRetentionDays: 60,
    },
    isActive: true,
  },
  {
    name: 'Pro',
    slug: 'pro',
    price: 2900, // $29.00
    currency: 'USD' as const,
    billingCycle: 'monthly' as const,
    creditsPerCycle: 5000,
    features: {
      maxApiKeys: 5,
      maxConversations: -1,
      maxMessagesPerDay: -1,
      allowedModels: ['gemini-1.5-flash', 'gemini-1.5-pro'],
      priorityQueue: true,
      analyticsRetentionDays: 90,
    },
    isActive: true,
  },
  {
    name: 'Enterprise',
    slug: 'enterprise',
    price: 9900, // $99.00
    currency: 'USD' as const,
    billingCycle: 'monthly' as const,
    creditsPerCycle: 20000,
    features: {
      maxApiKeys: 20,
      maxConversations: -1,
      maxMessagesPerDay: -1,
      allowedModels: ['gemini-1.5-flash', 'gemini-1.5-pro'],
      priorityQueue: true,
      analyticsRetentionDays: 180,
    },
    isActive: true,
  },
];

const seed = async (): Promise<void> => {
  try {
    await connectDB();
    console.log('Seeding plans into database...');

    for (const planData of plansToSeed) {
      await Plan.findOneAndUpdate({ slug: planData.slug }, planData, {
        upsert: true,
        new: true,
      });
      console.log(`✔ Plan '${planData.name}' seeded/updated.`);
    }

    console.log('🎉 Database seeding completed successfully.');
    await mongoose.disconnect();
  } catch (error) {
    console.error('❌ Error seeding database:', error);
    process.exit(1);
  }
};

seed();
