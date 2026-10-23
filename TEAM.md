# Team

This file is the factory's team directory. Every agent reads it (via AGENTS.md)
to know who to ask for help, who to escalate to, and what each team member
(agent or human) is responsible for.

## Pipeline Agents

| Handle | Agent | Workflow | What they handle |
| --- | --- | --- | --- |
| @advisor | Advisor | advisor.md | Triages issues, answers product questions, makes priority/scope decisions. The product knowledge center. |
| @executor | Execution Agent | executor.md | Implements tasks via multi-run Goal pattern: plans if complex, codes, runs tests, runs the program, verifies Definition of Done, opens PRs. Communicates via issue and PR comments. |
| @reviewer | Review Agent | reviewer.md | Multi-lens code review (Functional, Standards, Security, Readiness). Assigns Copilot as reviewer, incorporates its findings. Submits proper GitHub reviews (APPROVE/REQUEST_CHANGES). Severity taxonomy: Critical/High/Medium/Low. Depth tiers based on risk labels. |
| @orchestrator | Orchestrator | orchestrator.md | Monitors pipeline health, detects stuck states, nudges agents via @mentions. Enforces Escalation Policy table. Runs after every agent completes + every 30m. Pure plumbing — no product decisions. |

## Feedback Agents

| Handle | Agent | What they handle |
| --- | --- | --- |
| @sre | SRE Agent | Detects + diagnoses production anomalies, creates incident/bug issues |
| @analyst | Analyst | Analyzes usage patterns and trends, creates feature/enhancement issues |
| @healer | Healer | Scores agent performance, creates harness improvement issues |

## Verify Agents (Future)

| Handle | Agent | Workflow | What they handle |
| --- | --- | --- | --- |
| @architect | Architecture Agent | (future) | Design patterns, architectural tradeoffs, system coherence |
| @qa | QA Agent | (future) | Test strategy, coverage gaps, acceptance criteria, edge cases |

## Humans

| Handle | Responsibility | Areas | Escalate when |
| --- | --- | --- | --- |
| @eedorenko | Tech lead / Product owner | All areas | Agent is uncertain, high-risk decisions, architectural changes |

## Project Board

State is tracked via a GitHub Project board, not labels. The Orchestrator
creates and maintains the project. Agents move issues between columns
using `set_issue_field` with field name `Status`.

| Column | Meaning | Moved here by | Next |
| --- | --- | --- | --- |
| Backlog | New issue, not yet triaged | Auto (on creation) | Ready or Blocked |
| Ready | Triaged, approved for execution | Advisor | In Progress |
| Blocked | Waiting for input or clarification | Any agent | Ready (when unblocked) |
| In Progress | Executor is working on it | Executor | In Review |
| In Review | PR created, waiting for review | Executor | In Progress or Testing |
| Testing | Review approved, PR merged, validating | Executor | Done |
| Done | Verified, issue closed | Executor | — |

**Transitions:**
- Advisor: Backlog → Ready (or → Blocked if needs-info)
- Executor: Ready → In Progress → In Review → Testing → Done
- Executor: In Review → In Progress (if reviewer requests changes)
- Reviewer: monitors In Review column
- Orchestrator: monitors all columns, detects stuck items, nudges
- Any agent: → Blocked (when stuck)
- Any agent: Blocked → previous column (when unblocked)

**Labels** are kept only for classification (bug, feature, complex, risky),
NOT for state tracking. State lives on the project board.

## Routing Rules

When an agent needs input, choose the best responder:

1. **Trivial decision** → just decide, don't ask anyone
2. **Routine product question** → @advisor
3. **Architecture/design question** → @architect
4. **Test strategy question** → @qa
5. **Operational/safety concern** → @sre
6. **Need input from issue reporter** → @mention the issue author directly
7. **Uncertain or high-risk** → @mention human from this file with your suggestion
8. **Wrong agent asked you** → redirect to the right agent with context

## Escalation Policy

The Orchestrator enforces these rules. Agents should also be aware of what's
expected of them — if you see yourself as the target, act before the
Orchestrator has to nudge you.

| Condition | Threshold | Action | Target |
| --- | --- | --- | --- |
| Issue in Ready, not picked up | 10 min | "Pick up issue #N" | @executor |
| Issue in In Progress, no PR, no comment | 24h | "What's blocking?" | @executor |
| Issue in In Review, no review submitted | 1h | "Review PR for #N" | @reviewer |
| Issue in Blocked, no response | 48h | Re-escalate with context | human from TEAM.md |
| Issue in Blocked, response arrived | immediate | Move back to previous column, notify agent | original agent |
| @mention unanswered | 1h | Nudge the mentioned agent | mentioned agent |
| @mention unanswered | 4h | Escalate to human | human from TEAM.md |
| Issue in Done but PR not merged | 5 min | Move back to In Review, notify | @executor |
| 5+ issues in In Progress | — | Warn about capacity | @advisor |

## Anti-Loop Rules

- Never @mention yourself in your response
- Never respond to your own comments
- If a comment doesn't contain your @handle, call noop
- Check comment author — if it's github-actions[bot] with your signature, noop
