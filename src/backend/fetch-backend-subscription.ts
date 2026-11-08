import type {
  BackendSubscriptionResult,
  NetworkClient,
} from '@sudobility/types';

interface BackendResponse {
  success: boolean;
  data?: BackendSubscriptionResult;
  error?: string;
}

export async function fetchBackendSubscription(
  networkClient: NetworkClient,
  baseUrl: string,
  token: string,
  userId: string,
  testMode?: boolean,
  /**
   * Whether the caller is on a native-IAP platform (App Store / Play Store /
   * Mac App Store). The backend admits an anonymous (guest) caller to read
   * their own subscription only when this is set — on native IAP a guest can
   * hold a real subscription bought against their anonymous app-user id.
   * Omitted/false for web billing, where an anonymous caller is still rejected.
   */
  nativeIap?: boolean
): Promise<BackendSubscriptionResult> {
  if (!userId || userId.length === 0 || userId.length > 128) {
    throw new Error(`Invalid userId: "${userId}". Expected 1-128 characters`);
  }

  const endpoint = `/api/v1/users/${encodeURIComponent(userId)}/subscriptions`;
  const params = new URLSearchParams();
  if (testMode) params.set('testMode', 'true');
  if (nativeIap) params.set('nativeIap', 'true');
  const query = params.toString();
  const url = query
    ? `${baseUrl}${endpoint}?${query}`
    : `${baseUrl}${endpoint}`;

  const response = await networkClient.get<BackendResponse>(url, {
    headers: {
      Authorization: `Bearer ${token}`,
      'Content-Type': 'application/json',
    },
  });

  if (!response.data) {
    throw new Error('No data received from server');
  }

  const body = response.data;
  if (!body.success || !body.data) {
    throw new Error(body.error ?? 'Failed to fetch subscription status');
  }

  return body.data;
}
