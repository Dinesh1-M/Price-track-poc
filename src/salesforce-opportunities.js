'use strict';

const fs = require('node:fs');
const path = require('node:path');
const readXlsxFile = require('read-excel-file/node');

const WORKBOOK_PATH = path.resolve(process.env.SALESFORCE_WORKBOOK_PATH||path.join(__dirname, '../data/Salesforce sythetic data.xlsx'));
let cache;

function normalizedHeader(value) {
  return String(value ?? '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');
}

function text(row, headers, name) {
  const column = headers.get(normalizedHeader(name));
  const value = column === undefined ? '' : row[column];
  return String(value ?? '').trim();
}

function value(row, headers, name) {
  const column = headers.get(normalizedHeader(name));
  return column === undefined ? '' : row[column];
}

function excelDate(value) {
  if (value instanceof Date && !Number.isNaN(value.getTime())) return value.toISOString().slice(0, 10);
  if (typeof value === 'number' && Number.isFinite(value)) {
    return new Date(Date.UTC(1899, 11, 30) + value * 86400000).toISOString().slice(0, 10);
  }
  const input = String(value ?? '').trim();
  if (!input) return '';
  if (/^\d{4}-\d{2}-\d{2}(?:T.*)?$/.test(input)) return input.slice(0, 10);
  const dmy = input.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (dmy) return `${dmy[3]}-${dmy[2].padStart(2, '0')}-${dmy[1].padStart(2, '0')}`;
  return '';
}

function parseAmount(value) {
  const input = String(value ?? '').trim();
  const currency = input.match(/\b([A-Z]{3})\b/)?.[1] || '';
  const amountText = input.replace(/,/g, '').match(/-?\d+(?:\.\d+)?/);
  const amount = amountText ? Number(amountText[0]) : null;
  return { amount: Number.isFinite(amount) ? amount : null, currency };
}

function mapRow(row, headers) {
  const opportunityId = text(row, headers, 'Opportunity ID');
  const { amount, currency } = parseAmount(text(row, headers, 'Amount'));
  const projectStartDate = excelDate(value(row, headers, 'Project Start Date'));
  const projectEndDate = excelDate(value(row, headers, 'Project End Date'));
  const start = projectStartDate ? new Date(`${projectStartDate}T00:00:00Z`) : null;
  const end = projectEndDate ? new Date(`${projectEndDate}T00:00:00Z`) : null;
  const durationMonths = start && end
    ? Math.max(1, (end.getUTCFullYear() - start.getUTCFullYear()) * 12 + end.getUTCMonth() - start.getUTCMonth() + 1)
    : null;

  return {
    sourceOpportunityId: opportunityId,
    opportunityId,
    proposalNumber: text(row, headers, 'Proposal Number'),
    parentAccountId: text(row, headers, 'Parent Account ID'),
    accountId: text(row, headers, 'Account ID'),
    account: text(row, headers, 'Account Name'),
    owner: text(row, headers, 'Opportunity Owner'),
    opportunityName: text(row, headers, 'Opportunity Name'),
    stage: text(row, headers, 'Stage'),
    fiscalPeriod: text(row, headers, 'Fiscal Period'),
    amount,
    currency,
    probability: text(row, headers, 'Probability (%)'),
    age: value(row, headers, 'Age'),
    createdDate: excelDate(value(row, headers, 'Created Date')),
    parentAccount: text(row, headers, 'Parent Account'),
    historicalCtProposalNumber: text(row, headers, 'Historical CT Proposal Number'),
    peProposalNumber: text(row, headers, 'PE Proposal Number'),
    proposalDate: excelDate(value(row, headers, 'Proposal Date')),
    proposalSubmissionDate: excelDate(value(row, headers, 'Proposal Submission Date')),
    lastModifiedDate: excelDate(value(row, headers, 'Last Modified Date')),
    quarterlyAccruedValues: Object.fromEntries([1,2,3,4].map(q=>['Q'+q,parseAmount(text(row, headers, 'Q'+q+' Accrued Value'))])),
    sourceFields: Object.fromEntries([...headers].map(([header,column])=>[header,row[column] instanceof Date?excelDate(row[column]):row[column]??''])),
    closeDate: excelDate(value(row, headers, 'Close Date')),
    nextStep: text(row, headers, 'Next Step'),
    type: text(row, headers, 'Type'),
    sourceOpportunityType: text(row, headers, 'Opportunity Type'),
    projectStartDate,
    projectEndDate,
    durationMonths,
    solutionsServices: text(row, headers, 'Solutions/Services'),
    products: text(row, headers, 'Products'),
    vertical: text(row, headers, 'Vertical'),
    subVertical: text(row, headers, 'Sub-Vertical'),
    capability: text(row, headers, 'Primary Capability'),
    primaryFunctionality: text(row, headers, 'Primary Functionality'),
    leadSource: text(row, headers, 'Lead Source'),
    sourceOfLead: text(row, headers, 'Source of Lead'),
    contactRole: text(row, headers, 'Contact Role')
  };
}

async function readWorkbook(filePath = WORKBOOK_PATH) {
  let stat;
  try {
    stat = fs.statSync(filePath);
  } catch (error) {
    if (error.code === 'ENOENT') {
      return { available: false, sourceFile: path.basename(filePath), items: [], warnings: ['The supplied Salesforce opportunity workbook is not available.'] };
    }
    throw error;
  }
  if (cache?.filePath === filePath && cache.mtimeMs === stat.mtimeMs && cache.size === stat.size) return cache.data;

  const worksheets = await readXlsxFile(filePath);
  const worksheet = worksheets.find(sheet => sheet.sheet === 'Sheet1') || worksheets[0];
  if (!worksheet) throw new Error('The Salesforce opportunity workbook does not contain a worksheet.');
  const rows = worksheet.data;
  if (!Array.isArray(rows) || !rows.length) throw new Error(`Worksheet "${worksheet.sheet}" is empty.`);

  const headers = new Map();
  rows[0].forEach((header, column) => headers.set(normalizedHeader(header), column));
  if (!headers.has(normalizedHeader('Opportunity ID')) || !headers.has(normalizedHeader('Account Name')) || !headers.has(normalizedHeader('Opportunity Name'))) {
    throw new Error(`Worksheet "${worksheet.sheet}" is missing required Opportunity ID, Account Name, or Opportunity Name columns.`);
  }

  const mapped = [];
  const seen = new Set();
  const duplicates = new Set();
  let missingReferences = 0;
  rows.slice(1).forEach(row => {
    const item = mapRow(row, headers);
    if (!item.opportunityId) {
      if (item.account || item.opportunityName) missingReferences++;
      return;
    }
    if (seen.has(item.opportunityId)) {
      duplicates.add(item.opportunityId);
      return;
    }
    seen.add(item.opportunityId);
    mapped.push(item);
  });

  const items = mapped.filter(item => !duplicates.has(item.opportunityId) && item.account && item.opportunityName);
  const warnings = [];
  if (missingReferences) warnings.push(`${missingReferences} row(s) without an Opportunity ID were excluded.`);
  if (duplicates.size) warnings.push(`${duplicates.size} duplicate Opportunity ID(s) were excluded.`);
  const data = {
    available: true,
    sourceFile: path.basename(filePath),
    worksheet: worksheet.sheet,
    rowCount: rows.length - 1,
    columns: rows[0].map((name,column)=>({name:String(name).trim(),key:normalizedHeader(name),populatedCount:rows.slice(1).filter(row=>row[column]!==null&&row[column]!==undefined&&String(row[column]).trim()!=='').length})),
    usableCount: items.length,
    items,
    warnings
  };
  cache = { filePath, mtimeMs: stat.mtimeMs, size: stat.size, data };
  return data;
}

async function listOpportunities({ account, owner, search = '', stage = '' } = {}) {
  const dataset = await readWorkbook();
  if (!dataset.available) return dataset;
  const query = String(search).trim().toLowerCase();
  const accountKey = String(account ?? '').trim().toLowerCase();
  const items = dataset.items.filter(item => {
    if(owner&&item.owner.trim().toLowerCase()!==String(owner).trim().toLowerCase())return false;
    if (accountKey && item.account.toLowerCase() !== accountKey) return false;
    if (stage && item.stage.toLowerCase() !== String(stage).trim().toLowerCase()) return false;
    return !query || [
      item.sourceOpportunityId, item.proposalNumber, item.account, item.opportunityName,
      item.stage, item.owner, item.vertical, item.subVertical, item.capability
    ].some(value => String(value ?? '').toLowerCase().includes(query));
  });
  return { ...dataset, items, visibleCount: items.length };
}

async function findOpportunity(opportunityId) {
  const dataset = await readWorkbook();
  return dataset.items.find(item => item.sourceOpportunityId === opportunityId) || null;
}

module.exports = { WORKBOOK_PATH, readWorkbook, listOpportunities, findOpportunity };
