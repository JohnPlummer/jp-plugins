# Technical Design: {Service or change name}

- **Owner:** {name}
- **Status:** Proposed | Accepted | Built | Superseded | Abandoned
- **Built by:** {commit or PR link, once Status is Built}
- **Current behaviour:** {link to the architecture page or runbook that now owns this, once Status is Built}

## 1. Overview

{What is being built or changed, and why. Scope, non-goals, and blast radius. Link the upstream PRD if there is one.}

## 2. Architecture

{Components and responsibilities. Data-flow diagram. Integrations affected. Key tech choices and why. Record any hard-to-reverse choice as an ADR and link it here.}

## 3. Data

{Data model. Classification (member PII / payment / internal). Retention. Migration if any.}

## 4. Security

{Authn/authz. Secrets management. Encryption in transit and at rest. Change to the auth boundary?}

## 5. Performance & Scale

{Expected load and growth. Latency/throughput targets. Scaling approach.}

## 6. Cost

{Build cost. Ongoing run cost. What drives cost as usage grows.}

## 7. Reliability & Operability

{SLO target. Observability. Backup and restore. Failure modes. Runbook owner.}

## 8. Delivery & Release

{Environments. Deploy mechanism. Rollback. Test strategy.}

## 9. Risks & Open Questions

{Risks, mitigations, open decisions.}
