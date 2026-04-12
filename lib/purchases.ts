/**
 * RevenueCat Purchases Service Layer
 *
 * Handles subscription management via RevenueCat SDK.
 * All subscription logic goes through this file.
 *
 * Setup required:
 * 1. Create RevenueCat account at https://app.revenuecat.com
 * 2. Create a project and add iOS + Android apps
 * 3. Configure products in App Store Connect & Google Play Console
 * 4. Add API keys below
 */

import { Platform, Linking } from 'react-native';
import Purchases, {
  PurchasesOffering,
  PurchasesPackage,
  CustomerInfo,
  LOG_LEVEL,
} from 'react-native-purchases';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';

// ─── Configuration ─────────────────────────────────────
// Replace these with your actual RevenueCat API keys
const REVENUECAT_API_KEY_IOS = 'YOUR_REVENUECAT_IOS_API_KEY';
const REVENUECAT_API_KEY_ANDROID = 'YOUR_REVENUECAT_ANDROID_API_KEY';

// The entitlement identifier configured in RevenueCat dashboard
const ENTITLEMENT_ID = 'pro';

// ─── Initialize ────────────────────────────────────────

export async function initializePurchases(userId: string): Promise<void> {
  const apiKey = Platform.OS === 'ios'
    ? REVENUECAT_API_KEY_IOS
    : REVENUECAT_API_KEY_ANDROID;

  if (apiKey.startsWith('YOUR_')) {
    console.warn('[Purchases] RevenueCat API key not configured. Skipping initialization.');
    return;
  }

  Purchases.setLogLevel(LOG_LEVEL.DEBUG);

  await Purchases.configure({
    apiKey,
    appUserID: userId,
  });
}

// ─── Check Subscription Status ─────────────────────────

export async function checkSubscriptionStatus(): Promise<{
  isActive: boolean;
  isTrial: boolean;
  expirationDate: string | null;
  productIdentifier: string | null;
}> {
  try {
    const customerInfo = await Purchases.getCustomerInfo();
    const entitlement = customerInfo.entitlements.active[ENTITLEMENT_ID];

    if (entitlement) {
      return {
        isActive: true,
        isTrial: entitlement.periodType === 'TRIAL',
        expirationDate: entitlement.expirationDate,
        productIdentifier: entitlement.productIdentifier,
      };
    }

    return {
      isActive: false,
      isTrial: false,
      expirationDate: null,
      productIdentifier: null,
    };
  } catch (error) {
    console.error('[Purchases] Failed to check subscription:', error);
    return {
      isActive: false,
      isTrial: false,
      expirationDate: null,
      productIdentifier: null,
    };
  }
}

// ─── Get Available Offerings ───────────────────────────

export async function getOfferings(): Promise<PurchasesOffering | null> {
  try {
    const offerings = await Purchases.getOfferings();
    return offerings.current;
  } catch (error) {
    console.error('[Purchases] Failed to get offerings:', error);
    return null;
  }
}

// ─── Purchase a Package ────────────────────────────────

export async function purchasePackage(
  pkg: PurchasesPackage,
): Promise<{
  success: boolean;
  customerInfo?: CustomerInfo;
  error?: string;
}> {
  try {
    const { customerInfo } = await Purchases.purchasePackage(pkg);
    const isActive = !!customerInfo.entitlements.active[ENTITLEMENT_ID];

    return {
      success: isActive,
      customerInfo,
    };
  } catch (error: any) {
    // User cancelled
    if (error.userCancelled) {
      return { success: false, error: 'cancelled' };
    }
    console.error('[Purchases] Purchase failed:', error);
    return { success: false, error: error.message || '구매 처리 중 오류가 발생했습니다.' };
  }
}

// ─── Restore Purchases ─────────────────────────────────

export async function restorePurchases(): Promise<{
  isActive: boolean;
  customerInfo?: CustomerInfo;
}> {
  try {
    const customerInfo = await Purchases.restorePurchases();
    const isActive = !!customerInfo.entitlements.active[ENTITLEMENT_ID];
    return { isActive, customerInfo };
  } catch (error) {
    console.error('[Purchases] Restore failed:', error);
    return { isActive: false };
  }
}

// ─── Listen for Subscription Changes ───────────────────

export function addSubscriptionListener(
  callback: (isActive: boolean) => void,
  userId?: string,
): () => void {
  const listener = Purchases.addCustomerInfoUpdateListener(async (info) => {
    const entitlement = info.entitlements.active[ENTITLEMENT_ID];
    const isActive = !!entitlement;
    callback(isActive);

    // Sync subscription status to Firestore
    if (userId) {
      try {
        const userRef = doc(db, 'users', userId);
        await updateDoc(userRef, {
          'subscription.status': isActive ? 'active' : 'expired',
          'subscription.plan': entitlement?.productIdentifier || null,
          'subscription.expiresAt': entitlement?.expirationDate || null,
        });
      } catch (error) {
        console.error('[Purchases] Failed to sync subscription to Firestore:', error);
      }
    }
  });

  return () => {
    listener.remove();
  };
}

// ─── Manage Subscription (opens native settings) ──────

export async function openManageSubscriptions(): Promise<void> {
  try {
    if (Platform.OS === 'ios') {
      await Linking.openURL('https://apps.apple.com/account/subscriptions');
    } else {
      await Linking.openURL('https://play.google.com/store/account/subscriptions');
    }
  } catch (error) {
    console.error('[Purchases] Failed to open subscription management:', error);
  }
}
