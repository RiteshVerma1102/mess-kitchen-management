# ADR-002: Baseline first, learned model only when justified
Status: accepted.
Decision: semester-1 deliverable is a statistical baseline in TypeScript (moving average of same-weekday same-meal services, event adjustment factors, empirical confidence range). A Python service (Prophet or gradient boosting) is built only if baseline MAPE exceeds the agreed threshold after enough real data (propose: MAPE above 15 percent after 8 weeks, and at least 6 months of history before ML is trusted).
Why: ML on a problem with no data yet is the failure mode the project brief warns against. The baseline is explainable to a mess manager.
