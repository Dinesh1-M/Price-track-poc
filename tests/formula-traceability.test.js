'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');
const readXlsxFile = require('read-excel-file/node');
const { calculatePricing } = require('../src/domain');

test('captures the supplied Margin Calculator reference and the known demo cost difference', async () => {
  const workbookPath = path.join(__dirname, '../data/Margin Calculator_new 1.xlsx');
  const sheets = await readXlsxFile(workbookPath);
  const onshore = sheets.find(sheet => sheet.sheet === 'Revenue & Cost_Onshore');
  const summary = sheets.find(sheet => sheet.sheet === 'Margin_Summary');
  assert.ok(onshore);
  assert.ok(summary);

  const cell = (sheet, row, column) => sheet.data[row - 1]?.[column - 1];
  assert.equal(cell(onshore, 9, 6), 1);
  assert.equal(cell(onshore, 9, 7), 1);
  assert.equal(cell(onshore, 9, 8), 0.5);
  assert.equal(cell(onshore, 9, 9), 42.3359375);
  assert.equal(cell(onshore, 9, 12), 3386.875);
  assert.equal(cell(onshore, 9, 13), 6773.75);
  assert.equal(cell(summary, 6, 3), 3386.875);
  assert.equal(cell(summary, 6, 4), 6773.75);
  assert.equal(cell(summary, 6, 5), 0.5);

  const result = calculatePricing([{
    id: 'WORKBOOK-SAMPLE',
    account: 'Abc',
    bu: 'R&M',
    workType: 'T&M',
    role: 'Data Engineer',
    grade: 'G3',
    location: 'India',
    classification: 'Onshore',
    hoursPerPeriod: 160,
    utilizationPct: 50,
    startDate: '2026-11-01',
    endDate: '2026-11-30',
    periods: 1,
    quantity: 1,
    costPerHour: 42.3359375,
    currency: 'USD'
  }], [{
    id: 'WORKBOOK-SAMPLE-RATE',
    scope: 'Client',
    account: 'Abc',
    bu: 'R&M',
    workType: 'T&M',
    role: 'Data Engineer',
    grade: 'G3',
    location: 'India',
    currency: 'USD',
    amount: 84.671875,
    status: 'Approved',
    startDate: '2026-11-01',
    endDate: '2026-11-30'
  }], {
    asOf: '2026-11-01',
    targetMarginPct: 50,
    currency: 'USD'
  });

  assert.deepEqual(result.exceptions, []);
  assert.equal(result.lineResults[0].cost, 6773.75);
  assert.equal(result.totalRevenue, 6773.75);
  assert.equal(result.contributionMarginPct, 0);
  assert.equal(result.lineResults[0].cost, cell(onshore, 9, 12) * 2);
});
