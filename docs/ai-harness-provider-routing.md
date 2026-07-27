# INSIGHT provider routing for Pi pilot

Status: operational policy for issue #112. Revisit when provider billing or plan
terms change.

## Principle

Choose the model-harness pairing by **useful output per unit of scarce usage**,
not by model name alone. Subscription-included work and metered usage-credit
work are different resources and must not be treated as interchangeable.

## Anthropic

### Sonnet

Default Sonnet implementation work to **native Claude Code** when the user's
Claude plan includes that interactive usage.

Do not use Sonnet through Pi merely for convenience. Pi's current Anthropic
subscription-auth path warns that third-party harness traffic may draw from
paid extra usage at per-token rates rather than the plan's included limits.
Use Sonnet in Pi only for a deliberately bounded harness comparison or when the
operator explicitly accepts metered extra-usage billing.

Keep `ANTHROPIC_API_KEY` unset when the intention is to use Claude Code's
subscription allowance; an environment API key changes billing to API
pay-as-you-go.

### Fable

Fable may be used in either native Claude Code or Pi when the operator has
explicitly chosen usage-credit billing and verified that the intended credit
balance applies.

The fact that both routes can draw from usage credits does **not** make Pi the
automatic default. Compare:

- output quality;
- task completion cost;
- harness reliability;
- tool-loop efficiency;
- human interventions.

Use native Claude Code when Anthropic's native harness produces better useful
output. Use Pi when INSIGHT's project-local prompts, safety gate, or provider
interchangeability materially improve the task.

Before a paid Fable run, verify the selected model in `/model` and inspect the
Claude Usage page before and after a tiny bounded call. Do not infer Fable
billing from a Sonnet warning alone.

## Other providers

- **Sol:** native Codex is the control arm for difficult architecture, rescue,
  broad debugging, and high-risk cross-file work.
- **Kimi/OpenRouter and other interchangeable API models:** Pi is the primary
  pilot harness.
- **Cheap mechanical models:** Pi may be used for bounded low-risk work after
  the task contract and checks are explicit.

## Runtime warning law

Provider documentation can change and different Anthropic integrations can be
metered differently. For Pi, treat Pi's current runtime billing warning and the
Claude Usage page as the operational source of truth. Stop before the first
meaningful call when the warning does not match the intended billing source.

## Repository law

Launch Pi from the task's dedicated worktree. The status bar must show the
expected repository and branch before any model is allowed to edit. A Pi
session launched from `main` does not load the unmerged harness files from PR
#113 and must remain read-only.
