#!/usr/bin/env node

/**
 * Simple test script to verify API logging is working
 * Run this while your dev server is running to test webhook endpoints
 */

const https = require('https');
const http = require('http');

const BASE_URL = 'http://localhost:3000';
const WEBHOOK_SECRET = process.env.WEBHOOK_SECRET || 'test-secret';

// Test data for V2 webhook
const v2WebhookData = {
  webhookId: `test-${Date.now()}`,
  event: 'deposit',
  amount: 50000,
  currency: 'COP',
  sourceTo: 'test@example.com',
  metadata: {
    timestamp: new Date().toISOString(),
    test: true
  }
};

// Test data for SMS webhook
const smsWebhookData = {
  webhookId: `sms-test-${Date.now()}`,
  message: 'Bancolombia le informa que se ha recibido un abono por $50,000.00 en su cuenta de ahorros 1234567890 el 15/12/2024 a las 14:30. Saldo disponible: $1,500,000.00'
};

function makeRequest(url, data, headers = {}) {
  return new Promise((resolve, reject) => {
    const urlObj = new URL(url);
    const isHttps = urlObj.protocol === 'https:';
    const client = isHttps ? https : http;
    
    const options = {
      hostname: urlObj.hostname,
      port: urlObj.port || (isHttps ? 443 : 80),
      path: urlObj.pathname,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${WEBHOOK_SECRET}`,
        'X-Timestamp': new Date().toISOString(),
        ...headers
      }
    };

    const req = client.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          body: data
        });
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify(data));
    req.end();
  });
}

async function testV2Webhook() {
  console.log('\n🧪 Testing V2 Webhook endpoint...');
  try {
    const response = await makeRequest(`${BASE_URL}/api/v2/webhook/transaction`, v2WebhookData);
    console.log(`✅ V2 Webhook Response: ${response.statusCode}`);
    console.log(`📄 Body: ${response.body}`);
  } catch (error) {
    console.error(`❌ V2 Webhook Error: ${error.message}`);
  }
}

async function testSMSWebhook() {
  console.log('\n🧪 Testing SMS Webhook endpoint...');
  try {
    const response = await makeRequest(`${BASE_URL}/api/webhook/sms`, smsWebhookData);
    console.log(`✅ SMS Webhook Response: ${response.statusCode}`);
    console.log(`📄 Body: ${response.body}`);
  } catch (error) {
    console.error(`❌ SMS Webhook Error: ${error.message}`);
  }
}

async function testHealthCheck() {
  console.log('\n🧪 Testing Health Check endpoints...');
  try {
    const v2Health = await makeRequest(`${BASE_URL}/api/v2/webhook/transaction`, {}, { method: 'GET' });
    console.log(`✅ V2 Health Check: ${v2Health.statusCode}`);
  } catch (error) {
    console.error(`❌ Health Check Error: ${error.message}`);
  }
}

async function runTests() {
  console.log('🚀 Starting API logging tests...');
  console.log(`📍 Base URL: ${BASE_URL}`);
  console.log(`🔑 Using webhook secret: ${WEBHOOK_SECRET ? 'Yes' : 'No'}`);
  
  await testHealthCheck();
  await testV2Webhook();
  await testSMSWebhook();
  
  console.log('\n✨ Tests completed! Check your dev server terminal for logs.');
  console.log('💡 If you don\'t see logs, try running: npm run dev:no-turbo');
}

runTests().catch(console.error);
