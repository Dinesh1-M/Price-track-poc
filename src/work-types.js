 'use strict';
// Explicit demo strategies preserve the pre-existing arithmetic; workbook parity is not verified.
const strategies={
 'T&M':{id:'DEMO-TM-HOURLY-1',basis:'Utilized scheduled hours at an hourly selling rate',calculate:(hours,utilization,rate,cost)=>({revenue:hours*utilization/100*rate,cost:hours*cost})},
 'FTE':{id:'DEMO-FTE-HOURS-1',basis:'Explicit FTE quantity, period hours and billability; no universal 160-hour rule',calculate:(hours,utilization,rate,cost)=>({revenue:hours*utilization/100*rate,cost:hours*cost})},
 'Program':{id:'DEMO-PROGRAM-EFFORT-1',basis:'Demo effort-based program estimate; fixed-price/milestone policy pending',calculate:(hours,utilization,rate,cost)=>({revenue:hours*utilization/100*rate,cost:hours*cost})},
 'Product':{id:'DEMO-PRODUCT-EFFORT-1',basis:'Demo effort-based product estimate; IP/licensing allocation policy pending',calculate:(hours,utilization,rate,cost)=>({revenue:hours*utilization/100*rate,cost:hours*cost})}
};
function strategyFor(type){return strategies[type];}
module.exports={strategies,strategyFor};
