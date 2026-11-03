/**
 * RevenueCat Adapter Interface
 *
 * Platform-agnostic interface that abstracts RevenueCat SDK differences
 * between web (@revenuecat/purchases-js) and React Native (react-native-purchases).
 */

/**
 * Pricing phase information for trials and intro prices
 */
export interface AdapterPricingPhase {
  /** Duration in ISO 8601 format (e.g., "P7D", "P1M") */
  periodDuration: string | null;
  /** Price in standard units (not micros), null for free trials */
  price: number | null;
  /** Formatted price string, null for free trials */
  priceString: string | null;
  /** Number of billing cycles for this phase */
  cycleCount: number;
}

/**
 * Subscription option with trial and intro price information
 */
export interface AdapterSubscriptionOption {
  /** Unique identifier for this option */
  id: string;
  /** Trial phase information, null if no trial */
  trial: AdapterPricingPhase | null;
  /** Introductory price phase, null if no intro price */
  introPrice: AdapterPricingPhase | null;
}

/**
 * Product information from RevenueCat
 */
export interface AdapterProduct {
  /** Product ID from the store */
  identifier: string;
  /** Display title */
  title: string;
  /** Product description */
  description: string | null;
  /** Price in standard units (e.g., 9.99 not 9990000) */
  price: number;
  /** Formatted price string (e.g., "$9.99") */
  priceString: string;
  /** Currency code (e.g., "USD") */
  currencyCode: string;
  /** Billing period in ISO 8601 format (e.g., "P1M", "P1Y"), null for non-subscriptions */
  normalPeriodDuration: string | null;
  /** Available subscription options with offers */
  subscriptionOptions?: Record<string, AdapterSubscriptionOption>;
}

/**
 * Package containing a product
 */
export interface AdapterPackage {
  /** Package identifier (e.g., "pro_monthly") */
  identifier: string;
  /** Package type (e.g., "$rc_monthly", "custom") */
  packageType: string;
  /** The product in this package */
  product: AdapterProduct;
}

/**
 * Offering containing packages
 */
export interface AdapterOffering {
  /** Offering identifier */
  identifier: string;
  /** Offering metadata from RevenueCat dashboard */
  metadata: Record<string, unknown> | null;
  /** Available packages in this offering */
  availablePackages: AdapterPackage[];
}

/**
 * All offerings response
 */
export interface AdapterOfferings {
  /** Map of all offerings by identifier */
  all: Record<string, AdapterOffering>;
  /** Current/default offering */
  current: AdapterOffering | null;
}

/**
 * Entitlement info for a customer
 */
export interface AdapterEntitlementInfo {
  /** Entitlement identifier */
  identifier: string;
  /** Product that granted this entitlement */
  productIdentifier: string;
  /** Expiration date in ISO format, null for lifetime */
  expirationDate: string | null;
  /** Whether subscription will auto-renew */
  willRenew: boolean;
  /** Store where the entitlement was purchased (e.g., "app_store", "stripe") */
  store?: string;
}

/**
 * Customer info from RevenueCat
 */
export interface AdapterCustomerInfo {
  /** Set of active subscription product identifiers */
  activeSubscriptions: string[];
  /** Entitlements information */
  entitlements: {
    /** Active entitlements map */
    active: Record<string, AdapterEntitlementInfo>;
  };
  /** URL to manage subscription (upgrade/downgrade/cancel) */
  managementUrl?: string;
}

/**
 * Parameters for making a purchase
 */
export interface AdapterPurchaseParams {
  /** Package identifier to purchase */
  packageId: string;
  /** Offering identifier the package belongs to */
  offeringId: string;
  /** Customer email for web billing */
  customerEmail?: string;
}

/**
 * Result of a purchase operation
 */
export interface AdapterPurchaseResult {
  /** Updated customer info after purchase */
  customerInfo: AdapterCustomerInfo;
}

/**
 * RevenueCat Adapter Interface
 *
 * Implement this interface to provide platform-specific RevenueCat SDK integration.
 */
export interface SubscriptionAdapter {
  /**
   * Whether this adapter bills through native in-app purchase (Apple / Google
   * StoreKit/Play Billing) rather than web billing. Native IAP can purchase
   * against an anonymous app user; web billing requires a logged-in account.
   * `useIsUserSubscribable` reads this to decide whether a userId alone is
   * enough to subscribe. Defaults to false (web billing) when omitted.
   */
  usesNativeIap?: boolean;

  /**
   * Get all configured offerings
   * @param params Optional parameters like currency
   */
  getOfferings(params?: { currency?: string }): Promise<AdapterOfferings>;

  /**
   * Get current customer info including entitlements
   */
  getCustomerInfo(): Promise<AdapterCustomerInfo>;

  /**
   * Make a purchase
   * @param params Purchase parameters
   */
  purchase(params: AdapterPurchaseParams): Promise<AdapterPurchaseResult>;

  /**
   * Set the user ID for the subscription service.
   * Pass undefined to clear the user (logout).
   * The adapter should re-initialize RevenueCat with the new user.
   * @param userId User identifier, or undefined to clear
   * @param email Optional email for the user
   */
  setUserId?(userId: string | undefined, email?: string): Promise<void>;

  /**
   * Restore purchases from the App Store / Play Store.
   * On native platforms this re-syncs with the store; on web it falls back to getCustomerInfo.
   * @returns Updated customer info after restore
   */
  restorePurchases?(): Promise<AdapterCustomerInfo>;
}
