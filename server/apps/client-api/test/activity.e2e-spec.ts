// apps/client-api/test/activity.e2e-spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ClientApiModule } from '../src/client-api.module';

describe('Activity (e2e)', () => {
  let app: INestApplication;
  let token: string;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ClientApiModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();

    const loginResponse = await request(app.getHttpServer())
      .post('/api/client/v1/auth/sms-login')
      .send({ phone: '13800000000', code: 'admin123', tenantId: 1 });
    token = loginResponse.body.data.access_token;
  });

  afterAll(async () => {
    await app.close();
  });

  describe('GET /api/client/v1/activities', () => {
    it('should return activities list', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/client/v1/activities')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', '1')
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.list).toBeDefined();
      expect(Array.isArray(response.body.data.list)).toBe(true);
    });

    it('should return 401 without token', async () => {
      await request(app.getHttpServer())
        .get('/api/client/v1/activities')
        .expect(401);
    });
  });

  describe('GET /api/client/v1/activities/:id', () => {
    it('should return activity details', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/client/v1/activities/1')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', '1')
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.id).toBeDefined();
    });
  });

  describe('GET /api/client/v1/activities/:id/seats', () => {
    it('should return seat information', async () => {
      const response = await request(app.getHttpServer())
        .get('/api/client/v1/activities/1/seats')
        .set('Authorization', `Bearer ${token}`)
        .set('X-Tenant-Id', '1')
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.version).toBeDefined();
      expect(response.body.data.left).toBeDefined();
    });
  });
});
