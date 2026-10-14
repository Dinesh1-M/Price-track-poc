# Financial dependency flow

```mermaid
flowchart LR
  RC[Source role / experience rate card] --> COST[Resolved onshore / offshore cost per hour]
  INPUT[People × months × hours × billability] --> LC[Line cost]
  COST --> LC
  CM[Target CM] --> SELL[Cost ÷ one minus target CM]
  LC --> SELL
  LC --> STREAM[Stream cost totals]
  SELL --> REV[Base revenue]
  STREAM --> BENCH[Bench loading]
  IP[Explicit product unit cost × units] --> TOTAL[Total eligible cost]
  STREAM --> TOTAL
  BENCH --> TOTAL
  IPREV[Explicit product revenue] --> REV
  REV --> OFFER[Commercial discount or explicit negotiated offer]
  TOTAL --> MARGIN[Contribution margin]
  OFFER --> MARGIN
  V[Normalized vertical ratios] --> GM[Projected GM]
  MARGIN --> GM
  TOTAL --> SIM[Source target-CM revenue simulations]
```

The full formula register preserves exact worksheet names, including trailing whitespace. Shared source formulas are expanded without changing the source workbook. Application line aggregation generalizes the workbook's resource rows; it is not a generic Excel execution engine. Discount and negotiated offer are explicit commercial scenario inputs. Unsupported source/Finance decisions remain blocking or visibly unavailable.
