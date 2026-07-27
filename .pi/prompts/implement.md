---
description: Implement one bounded task with evidence
argument-hint: "<issue, task, or acceptance contract>"
---

Implement this bounded task:

$ARGUMENTS

Work in five stages:

1. **Environment gate**
   - print `pwd`, remote, branch, HEAD and `git status --short`;
   - stop on the wrong repository, branch, task, or contaminated context.

2. **Contract**
   - read the governing issue/spec and directly affected code;
   - state the intended outcome, exact file boundary, protected files and checks;
   - stop before editing if product/scientific judgment or scope expansion is required.

3. **Implementation**
   - make the smallest coherent change;
   - preserve unrelated changes;
   - do not commit, push or create a PR unless this request explicitly says so.

4. **Verification**
   - run focused checks first;
   - run `scripts/ai/check.ps1` with the appropriate scope when the task reaches a stable state;
   - do not weaken or delete tests to make the task pass.

5. **Evidence**
   - run `scripts/ai/snapshot.ps1`;
   - report exact changed files, checks, failures, limitations and final status.

Stop when the contract is satisfied. Do not convert the task into a repository audit or unrelated cleanup.
