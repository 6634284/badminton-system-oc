// apps/client-api/test/auth.e2e-spec.ts

import { Test, TestingModule } from '@nestjs/testing';
import { INestApplication } from '@nestjs/common';
import * as request from 'supertest';
import { ClientApiModule } from '../src/client-api.module';

describe('Auth (e2e)', () => {
  let app: INestApplication;

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [ClientApiModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  describe('POST /api/client/v1/auth/wx-login', () => {
    it('should login with mock wechat code', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/client/v1/auth/wx-login')
        .send({ code: 'test_code_123', tenant_id: 1 })
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.access_token).toBeDefined();
      expect(response.body.data.refresh_token).toBeDefined();
      expect(response.body.data.user_id).toBeDefined();
      expect(response.body.data.expires_in).toBe(7200);
    });

    it('should return error for missing code', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/client/v1/auth/wx-login')
        .send({ tenant_id: 1 })
        .expect(400);

      expect(response.body.code).not.toBe(0);
    });
  });

  describe('POST /api/client/v1/auth/sms-login', () => {
    it('should login with valid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/client/v1/auth/sms-login')
        .send({ phone: '13800000000', code: 'admin123', tenantId: 1 })
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.access_token).toBeDefined();
    });

    it('should return error for invalid credentials', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/client/v1/auth/sms-login')
        .send({ phone: '13800000000', code: 'wrong', tenantId: 1 })
        .expect(401);

      expect(response.body.code).not.toBe(0);
    });
  });

  describe('POST /api/client/v1/auth/refresh', () => {
    it('should refresh token', async () => {
      const loginResponse = await request(app.getHttpServer())
        .post('/api/client/v1/auth/wx-login')
        .send({ code: 'test_code_456', tenant_id: 1 });

      const refreshToken = loginResponse.body.data.refresh_token;

      const response = await request(app.getHttpServer())
        .post('/api/client/v1/auth/refresh')
        .send({ refresh_token: refreshToken })
        .expect(200);

      expect(response.body.code).toBe(0);
      expect(response.body.data.access_token).toBeDefined();
    });

    it('should return error for invalid refresh token', async () => {
      const response = await request(app.getHttpServer())
        .post('/api/client/v1/auth/refresh')
        .send({ refresh_token: 'invalid_token' })
        .expect(401);

      expect(response.body.code).not.toBe(0);
    });
  });
});
