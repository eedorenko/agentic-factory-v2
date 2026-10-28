# Team

This file is the factory's team directory. Every agent reads it (via AGENTS.md)
to know who to ask for help, who to escalate to, and what each team member
(agent or human) is responsible for.

## Agents

One agent = one role. No combined hats. In the human world, people wear
multiple hats because humans are expensive. In the agentic world, agents
are cheap and specialized agents are better — focused instructions, clear
responsibility, no confusion.

Any agent can ask any other agent based on the descriptions below. If an
agent is unsure whom to ask, ask @orchestrator — it knows the team and
can route the question. The orchestrator also detects when someone is
asking the wrong agent and redirects.

### Pipeline Agents

| Handle | Role | Workflow | What they do |
| --- | --- | --- | --- |
| @triager | Triager | triager.md | Classifies, prioritizes, and routes incoming issues. Moves issues from Backlog to Ready (or Blocked). Answers "is this a duplicate?" and backlog questions. Has backlog context. |
| @executor | Executor | executor.md | Implements tasks via multi-run Goal pattern: plans if complex, codes, runs tests, runs the program, verifies Definition of Done, creates PRs. Moves issues: Ready → In Progress → In Review → Testing → Done. |
| @reviewer | Reviewer | reviewer.md | Multi-lens code review (Functional, Standards, Security, Readiness). Assigns Copilot as reviewer, incorporates its findings. Submits proper GitHub reviews (APPROVE/REQUEST_CHANGES). Severity taxonomy + depth tiers. |
| @orchestrator | Orchestrator | orchestrator.md | Monitors the project board. Detects stuck states, nudges agents. Routes misaddressed questions. Enforces escalation policy. Creates and maintains the project board. Pure plumbing — no product or technical decisions. |

### Knowledge Agents

| Handle | Role | Workflow | What they do |
| --- | --- | --- | --- |
| @architect | Architect | architect.md | Answers design and architecture questions. Reviews trade-offs, patterns, system coherence. Consulted by executor and reviewer when design decisions arise. Has codebase understanding. |
| @qa | QA Specialist | (future) | Test strategy, coverage gaps, acceptance criteria, edge cases. |

### Feedback Agents

| Handle | Role | What they do |
| --- | --- | --- |
| @sre | SRE Agent | Detects + diagnoses production anomalies, creates incident/bug issues |
| @analyst | Analyst | Analyzes usage patterns, business metrics, user feedback. Proposes features and enhancements. Creates issues that feed back to the triager. |
| @healer | Healer | Scores agent performance, creates harness improvement issues |

## Humans

| Handle | Responsibility | Areas | Escalate when |
| --- | --- | --- | --- |
| @eedorenko | Tech lead / Product owner | All areas | Agent is uncertain, high-risk decisions, architectural changes |

## Project Board

State is tracked via a GitHub Project board, not labels. Project auto-add
puts new issues on the board with no Status (treat empty as Backlog); the
Orchestrator adds any it misses. Agents move issues between columns using
the `update_project` safe-output with `fields: {"Status": "<column>"}`.
(`set_issue_field` is NOT for this — it sets GitHub Issue Fields, not
Project columns.)

| Column | Meaning | Moved here by | Next |
| --- | --- | --- | --- |
| Backlog | New issue, not yet triaged (empty Status) | Auto-add | Ready or Blocked |
| Ready | Triaged, approved for execution | Advisor | In Progress |
| Blocked | Waiting for input or clarification | Any agent | Ready (when unblocked) |
| In Progress | Executor is working on it | Executor | In Review |
| In Review | PR created, waiting for review | Executor | In Progress or Testing |
| Testing | Review approved, PR merged, validating | Executor | Done |
| Done | Verified, issue closed | Executor | — |

**Transitions:**
- Triager: Backlog → Ready (or → Blocked if needs-info)
- Executor: Ready → In Progress → In Review → Testing → Done
- Executor: In Review → In Progress (if reviewer requests changes)
- Reviewer: monitors In Review column
- Orchestrator: monitors all columns, detects stuck items, nudges
- Any agent: → Blocked (when stuck)
- Any agent: Blocked → previous column (when unblocked)

**Labels** are kept only for classification (bug, feature, complex, risky),
NOT for state tracking. State lives on the project board.

## Routing Rules

Any agent can ask any other agent. Read the agent descriptions above to
find the right one. If unsure, ask @orchestrator — it will route your
question to the right agent.

1. **Trivial decision** → just decide, don't ask anyone
2. **Is this a duplicate? Priority? Scope?** → @triager
3. **Architecture/design question** → @architect
4. **Test strategy question** → @qa
5. **Operational/safety concern** → @sre
6. **Usage patterns, feature opportunity** → @analyst
7. **Need input from issue reporter** → @mention the issue author directly
8. **Uncertain or high-risk** → @mention human from this file
9. **Don't know whom to ask** → @orchestrator (it routes for you)
10. **Wrong agent asked you** → redirect to the right agent with context,
    or tell @orchestrator so it can learn the routing pattern

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
