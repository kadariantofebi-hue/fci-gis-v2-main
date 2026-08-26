import { describe, expect, it } from 'vitest';
import { getHealth, getHealthDegraded, getHealthDown, getHealthFailing, type HealthPayload } from './health';
import type { ApiResponse } from '$shared/envelope';

describe('health service mock', () => {
  it('getHealth returns ok envelope with all services up', async () => {
    const res: ApiResponse<HealthPayload> = await getHealth();
    expect(res.success).toBe(true);
    if (res.success) {
      const data: HealthPayload = res.data;
      expect(data.status).toBe('ok');
      expect(data.services.db.status).toBe('up');
      expect(data.services.redis.status).toBe('up');
      expect(data.services.minio.status).toBe('up');
      expect(data.services.queue.status).toBe('up');
      expect(res.meta?.path).toBe('/api/v1/health');
    }
  });

  it('getHealthDegraded returns degraded envelope with minio down', async () => {
    const res: ApiResponse<HealthPayload> = await getHealthDegraded();
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.status).toBe('degraded');
      expect(res.data.services.minio.status).toBe('down');
    }
  });

  it('getHealthDown returns down envelope with minio and queue down', async () => {
    const res: ApiResponse<HealthPayload> = await getHealthDown();
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.status).toBe('down');
      expect(res.data.services.minio.status).toBe('down');
      expect(res.data.services.queue.status).toBe('down');
    }
  });

  it('getHealthFailing returns INTERNAL_ERROR envelope (not ok)', async () => {
    const res: ApiResponse<HealthPayload> = await getHealthFailing();
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.code).toBe('INTERNAL_ERROR');
    }
  });
});
