import { describe, it, expect, vi } from 'vitest';
import { SubscriptionPlatform, type NetworkClient } from '@sudobility/types';
import { fetchBackendSubscription } from './fetch-backend-subscription';

function createMockNetworkClient(
  response: unknown,
  status = 200
): NetworkClient {
  return {
    request: vi.fn(),
    get: vi.fn().mockResolvedValue({
      ok: status >= 200 && status < 300,
      status,
      statusText: 'OK',
      headers: {},
      data: response,
    }),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  };
}

describe('fetchBackendSubscription', () => {
  const baseUrl = 'https://api.example.com';
  const token = 'test-token-123';
  const userId = 'user-abc';

  it('fetches subscription successfully', async () => {
    const mockData = {
      hasSubscription: true,
      entitlements: ['pro'],
      platform: SubscriptionPlatform.Web,
      subscriptionStartedAt: '2024-01-01T00:00:00Z',
    };
    const client = createMockNetworkClient({
      success: true,
      data: mockData,
    });

    const result = await fetchBackendSubscription(
      client,
      baseUrl,
      token,
      userId
    );

    expect(result).toEqual(mockData);
    expect(client.get).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/users/${userId}/subscriptions`,
      {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
      }
    );
  });

  it('appends testMode query parameter', async () => {
    const client = createMockNetworkClient({
      success: true,
      data: {
        hasSubscription: false,
        entitlements: [],
        platform: null,
        subscriptionStartedAt: null,
      },
    });

    await fetchBackendSubscription(client, baseUrl, token, userId, true);

    expect(client.get).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/users/${userId}/subscriptions?testMode=true`,
      expect.any(Object)
    );
  });

  it('throws on empty userId', async () => {
    const client = createMockNetworkClient({});

    await expect(
      fetchBackendSubscription(client, baseUrl, token, '')
    ).rejects.toThrow('Invalid userId');
  });

  it('throws on userId exceeding 128 characters', async () => {
    const client = createMockNetworkClient({});
    const longId = 'a'.repeat(129);

    await expect(
      fetchBackendSubscription(client, baseUrl, token, longId)
    ).rejects.toThrow('Invalid userId');
  });

  it('throws on server error response', async () => {
    const client = createMockNetworkClient({
      success: false,
      error: 'Subscription service not configured',
    });

    await expect(
      fetchBackendSubscription(client, baseUrl, token, userId)
    ).rejects.toThrow('Subscription service not configured');
  });

  it('throws on empty response data', async () => {
    const client = createMockNetworkClient(undefined);

    await expect(
      fetchBackendSubscription(client, baseUrl, token, userId)
    ).rejects.toThrow('No data received from server');
  });

  it('encodes userId in URL', async () => {
    const specialUserId = 'user/with spaces';
    const client = createMockNetworkClient({
      success: true,
      data: {
        hasSubscription: false,
        entitlements: [],
        platform: null,
        subscriptionStartedAt: null,
      },
    });

    await fetchBackendSubscription(client, baseUrl, token, specialUserId);

    expect(client.get).toHaveBeenCalledWith(
      `${baseUrl}/api/v1/users/${encodeURIComponent(specialUserId)}/subscriptions`,
      expect.any(Object)
    );
  });
});
