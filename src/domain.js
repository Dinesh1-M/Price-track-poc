'use strict';

const PENDING_RULE_NOTICE = 'DEMO / UNAPPROVED: Finance has not approved the contribution-margin formula, eligible-cost definition, rounding policy, or target-gap formula.';
const {strategyFor}=require('./work-types');
const BU_CODES = ['TMT1', 'TMT2', 'R&M', 'CPG', 'HLS-A', 'HLS-CI', 'RAI', 'MMM'];

function round2(value) { return Math.round((Number(value) + Number.EPSILON) * 100) / 100; }
function isValidDate(date) { return !Number.isNaN(new Date(date).getTime()); }

function resolveRate(line, rates, asOf = new Date().toISOString().slice(0, 10), fallbackAllowed = true) {
  const eligible = rates.filter(r => r.status === 'Approved' && r.role === line.role && (!r.grade || r.grade === line.grade) && (!r.bu || r.bu === line.bu) && r.workType === line.workType && r.location === line.location && r.currency === line.currency && r.startDate <= asOf && (!r.endDate || r.endDate >= asOf));
  const client = eligible.filter(r => r.scope === 'Client' && r.account === line.account);
  if (client.length === 1) return { status: 'Resolved', rate: client[0], source: 'Client-specific rate' };
  if (client.length > 1) return { status: 'Conflict', exception: 'Multiple eligible client-specific rates match this resource line.' };
  const standard = eligible.filter(r => r.scope === 'Standard');
  if (fallbackAllowed && standard.length === 1) return { status: 'Resolved', rate: standard[0], source: 'Approved standard fallback' };
  if (standard.length > 1) return { status: 'Conflict', exception: 'Multiple eligible standard rates match this resource line.' };
  return { status: 'Missing', exception: 'No eligible approved rate exists for this resource line.' };
}

function calculatePricing(lines, rates, config = {}) {
  const asOf = config.asOf || new Date().toISOString().slice(0, 10);
  const fallbackAllowed = config.fallbackAllowed !== false;
  const targetMarginPct = Number(config.targetMarginPct ?? 40);
  const currency = config.currency || 'USD';
  const discountPct=Number(config.discountPct||0), colaPct=Number(config.colaPct||0);
  const lineResults = lines.map(line => {
    const errors = [];
    for (const field of ['bu','workType','role','grade','location','classification','startDate','endDate','hoursPerPeriod','utilizationPct','costPerHour','currency']) {
      if (line[field] === undefined || line[field] === null || line[field] === '') errors.push(`Missing ${field}`);
    }
    if (line.startDate && line.endDate && isValidDate(line.startDate) && isValidDate(line.endDate) && line.endDate < line.startDate) errors.push('End date precedes start date');
    if (line.utilizationPct !== undefined && (Number(line.utilizationPct) < 0 || Number(line.utilizationPct) > 100)) errors.push('Utilization must be between 0 and 100');
    if (line.hoursPerPeriod !== undefined && Number(line.hoursPerPeriod) <= 0) errors.push('Hours per period must be positive');
    const strategy=strategyFor(line.workType);if(!strategy)errors.push('Unsupported work type');
    const resolution = resolveRate(line, rates, asOf, fallbackAllowed);
    if (resolution.status !== 'Resolved') errors.push(resolution.exception);
    if (line.costPerHour === null || line.costPerHour === undefined || Number(line.costPerHour) < 0) errors.push('Cost input missing or invalid');
    for(const k of ['hoursPerPeriod','utilizationPct','periods','costPerHour','quantity']) {
      const value=Number(line[k] ?? (k==='quantity'?1:NaN));
      if(!Number.isFinite(value)||value<0||(['hoursPerPeriod','periods','quantity'].includes(k)&&value===0))errors.push(`${k} must be a valid non-negative/positive number`);
    }
    if(!Number.isInteger(Number(line.quantity??1)))errors.push('Resource quantity must be a whole number');
    for(const k of ['startDate','endDate'])if(!/^\d{4}-\d{2}-\d{2}$/.test(line[k]||'')||!isValidDate(line[k])||new Date(line[k]).toISOString().slice(0,10)!==line[k])errors.push(`Invalid ${k}`);
    if(line.currency!==currency)errors.push('Resource currency must match case currency; no FX integration is configured');
    if(resolution.rate&&(!Number.isFinite(Number(resolution.rate.amount))||Number(resolution.rate.amount)<=0))errors.push('Resolved rate must be positive');
    const periods = Number(line.periods ?? 1);
    const hours = Number(line.hoursPerPeriod || 0) * periods * Number(line.quantity ?? 1);
    const utilizedHours = hours * Number(line.utilizationPct || 0) / 100;
    const rate = resolution.rate ? Number(resolution.rate.amount) : null;
    const strategyResult=strategy?.calculate(hours,Number(line.utilizationPct||0),rate,Number(line.costPerHour));
    const revenue = rate === null ? null : round2(strategyResult?.revenue ?? utilizedHours * rate);
    const cost = line.costPerHour === null || line.costPerHour === undefined ? null : round2(strategyResult?.cost ?? hours * Number(line.costPerHour));
    return { ...line, strategyId:strategy?.id||null, billingBasis:strategy?.basis||null, formulaStatus:'DEMO_UNAPPROVED / PARITY_NOT_VERIFIED', costSource:'Manual sample provider', rateResolution: resolution.status, rateSource: resolution.source || null, rateId: resolution.rate?.id || null, resolvedRate: rate, totalHours: round2(hours), utilizedHours: round2(utilizedHours), revenue, cost, errors };
  });
  const unresolved = lineResults.filter(l => l.errors.length);
  if(!lines.length)unresolved.push({id:'EMPTY',errors:['Add at least one resource line.']});
  if(!Number.isFinite(discountPct)||discountPct<0||discountPct>=100||!Number.isFinite(colaPct)||colaPct<0||colaPct>100||config.offeredPrice!==undefined&&(!Number.isFinite(Number(config.offeredPrice))||Number(config.offeredPrice)<=0))unresolved.push({id:'TERMS',errors:['Invalid discount, COLA or offered price.']});
  const baseRevenue = lineResults.some(l => l.revenue === null) ? null : round2(lineResults.reduce((s,l) => s + l.revenue, 0));
  const adjustedRevenue=baseRevenue===null?null:round2(baseRevenue*(1+colaPct/100));
  const totalRevenue=adjustedRevenue===null?null:config.offeredPrice!==undefined?round2(Number(config.offeredPrice)):round2(adjustedRevenue*(1-discountPct/100));
  const totalCost = lineResults.some(l => l.cost === null) ? null : round2(lineResults.reduce((s,l) => s + l.cost, 0));
  const cmPct = totalRevenue === null || totalRevenue <= 0 || totalCost === null ? null : round2((totalRevenue - totalCost) / totalRevenue * 100);
  const targetRevenue = totalCost === null || targetMarginPct >= 100 ? null : round2(totalCost / (1 - targetMarginPct / 100));
  const pricingGap = totalRevenue === null || targetRevenue === null ? null : round2(targetRevenue - totalRevenue);
  return {
    lineResults, currency, preColaRevenue:baseRevenue, baseRevenue:adjustedRevenue, colaPct, discountPct:config.offeredPrice!==undefined&&adjustedRevenue>0?round2((1-totalRevenue/adjustedRevenue)*100):discountPct, discountAmount:adjustedRevenue===null?null:round2(adjustedRevenue-totalRevenue), totalRevenue, totalCost, contributionMarginPct: cmPct,
    targetMarginPct, targetRevenue, pricingGap,
    warnings: [PENDING_RULE_NOTICE, 'POC assumption: revenue = hours × utilization × resolved hourly rate; cost = total scheduled hours × cost per hour. Validate work-type-specific rules with Finance.'],
    exceptions: unresolved.map(l => ({ id: `EX-${l.id}`, lineId: l.id, severity: l.rateResolution === 'Conflict' ? 'High' : 'Medium', blocking: true, reason: l.errors.join('; ') }))
  };
}

function canAccessCase(user, c) {
  if (!user || !c) return false;
  if(user.enabled===false||c.archivedLegacy)return false;
  if(c.ownershipHold&&user.role!=='Admin')return false;
  if(user.role==='Client Partner'&&Array.isArray(user.opportunityIds))return user.opportunityIds.includes(c.opportunityId);
  if(user.role==='Admin')return user.commercialAccess===true;
  if (['CFO', 'EVP Finance'].includes(user.role)) return true;
  if (user.role === 'Finance') return c.financeVisible !== false && (c.assignedUsers||[]).includes(user.id);
  if (user.role === 'Client Partner') return c.account === user.account;
  if (user.role === 'BU Head') return user.buWideAccess ? c.bu === user.bu : c.assignedUsers.includes(user.id);
  return c.assignedUsers.includes(user.id);
}

function canSeeCost(user, c) {
  if (!canAccessCase(user,c)) return false;
  if(user.role==='Client Partner'||user.costVisible===false)return false;
  return ['Finance','CFO','EVP Finance','BU SPOC'].includes(user.role) || user.costVisible === true;
}

function validateClosedWon(c, versionId) {
  const v = c.versions.find(x => x.id === versionId);
  if (!v) return { ok: false, reason: 'Version not found.' };
  if (v.status !== 'Approved' && v.status !== 'Agreed') return { ok: false, reason: 'Only an approved and agreed version can be linked to Closed Won.' };
  if (c.agreedVersionId !== versionId) return { ok: false, reason: 'The selected version is not the case’s final agreed version.' };
  if(c.stage && (c.stage!=='Contract & Launch'||!c.contractEvidence?.trim()))return {ok:false,reason:'Complete Contract & Launch and record evidence first.'};
  if(v.approvals && (!v.approvals.length||!v.approvals.every(a=>a.status==='Approved')))return {ok:false,reason:'All approval steps must be approved.'};
  if(v.revision!==undefined&&v.revision!==c.revision)return {ok:false,reason:'Pricing changed after this version. Submit and agree a new version.'};
  if(c.exceptions?.some(e=>e.status==='Open'&&e.blocking))return {ok:false,reason:'Resolve blocking exceptions before closing.'};
  return { ok: true };
}

module.exports = { PENDING_RULE_NOTICE, BU_CODES, round2, resolveRate, calculatePricing, canAccessCase, canSeeCost, validateClosedWon };
