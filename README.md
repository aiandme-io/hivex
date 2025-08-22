# HiveX — Community AI Security Projects

[![Site](https://img.shields.io/badge/site-hivex.aiandme.io-0b7285)](https://hivex.aiandme.io)
[![Data](https://img.shields.io/badge/data-data.hivex.aiandme.io-495057)](https://data.hivex.aiandme.io)
[![Aggregate Data](https://github.com/aiandme-io/hivex/actions/workflows/aggregate-data.yml/badge.svg?branch=main)](https://github.com/aiandme-io/hivex/actions/workflows/aggregate-data.yml)
[![Validate PR](https://github.com/aiandme-io/hivex/actions/workflows/validate-pr.yml/badge.svg?branch=main)](https://github.com/aiandme-io/hivex/actions/workflows/validate-pr.yml)
[![License: MIT](https://img.shields.io/badge/license-MIT-green)](LICENSE)
[![Data License: CC BY 4.0](https://img.shields.io/badge/data%20license-CC--BY%204.0-blue)](https://creativecommons.org/licenses/by/4.0/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen)](https://github.com/aiandme-io/hivex/pulls)
[![Discord](https://img.shields.io/badge/Discord-join-5865F2?logo=discord\&logoColor=white)](https://discord.gg/your-invite)

Public, branch‑based workflow for testing open‑source AI systems and publishing transparent results.

Site: [https://hivex.aiandme.io](https://hivex.aiandme.io)
Data feed: [https://data.hivex.aiandme.io](https://data.hivex.aiandme.io)
Main repo: [https://github.com/aiandme-io/hivex](https://github.com/aiandme-io/hivex)

---

## How it works (high level)

* **One branch per project:** `project/<slug>`.
* **Project page:** the branch `README.md` renders on the website.
* **Results:** anyone opens a PR adding `results/.../result.json` on the project branch.
* **Auto‑update:** on merge, CI validates and aggregates → JSON is deployed to `data.hivex.aiandme.io` → the site auto‑loads it (no redeploys).

---

## Repo layout (example)

```
project/llamaindex-demo/
  README.md                # public description shown on the site
  project.json             # minimal project metadata
  results/
    20250822-alice-0001/
      result.json          # finding in standardized format
      evidence/            # optional artifacts (redacted/safe)
```

---

## Project files

**`README.md`** (required)

* Describe the target, scope/safe‑harbor, setup instructions, and timelines.

**`project.json`** (required; minimal schema)

```json
{
  "slug": "llamaindex-demo",
  "title": "LlamaIndex Demo RAG Bot",
  "status": "active",         
  "dates": { "announced": "2025-08-10" },
  "branch": "project/llamaindex-demo"
}
```

---

## Submitting results (contributors)

1. **Fork** the repo and checkout the project branch, e.g. `project/llamaindex-demo`.
2. Create a folder: `results/YYYYMMDD-<github>-<id>/` (e.g., `20250822-alice-0001`).
3. Add a `result.json` using the schema below. Include optional `evidence/` files as needed.
4. Open a **PR** to the project branch. The CI bot will validate and comment.

**Filename conventions**

* Use ISO date `YYYYMMDD`.
* `<id>` increments per author within the project (e.g., `0001`).

---

## `result.json` (minimum fields)

```json
{
  "id": "llamaindex-demo-0001",
  "author_github": "alice-sec",
  "type": "manual",
  "severity": "High",
  "impact": "One sentence summary of the impact.",
  "submitted_at": "2025-08-22T09:12:00Z"
}
```

**Recommended fields** (add when applicable)

```json
{
  "taxonomy": { "owasp": ["LLM01-PromptInjection"], "mitre_atlas": ["TA0042"] },
  "cvss_vector": "CVSS:3.1/AV:N/AC:L/PR:N/UI:N/S:U/C:H/I:H/A:N",
  "steps": ["Step 1 …", "Step 2 …"],
  "prompt_chain": ["system: …", "user: …"],
  "model_info": { "name": "<model>", "version": "<date or tag>", "hash": "sha256:…", "seed": 42 },
  "repro_cmds": ["python run.py --seed 42 --prompt prompts/x.txt"],
  "artifacts": [{ "path": "evidence/log.txt", "sha256": "…" }],
  "duplicate_of": null,
  "pr": { "number": 123, "url": "https://github.com/aiandme/HiveX/pull/123" }
}
```

> **Privacy/safety:** Only synthetic/sandbox data. Redact secrets. No live systems. Evidence must be safe to publish.

---

## Maintainers: starting a new project

1. Create branch `project/<slug>`.
2. Add `README.md` + `project.json` (schema above).
3. Push and announce in Discord.
4. CI will pick up the branch in the next aggregation run.

---

## CI/CD overview

* **`validate-pr`** (on PR):

  * JSON schema validation for `result.json` and `project.json`.
  * Duplicate detection (normalized PoC hash).
  * Basic secret/PII lint.
  * Auto‑labels by severity; PR comment with fixes.
* **`aggregate-data`** (on merge):

  * Scans all `project/*` branches; builds:

    * `projects.json` (list & status),
    * `results-<slug>.json` (per‑project findings),
    * `leaderboard.json` (scores by contributor).
  * Deploys the JSON bundle to **Vercel** project **`hivex-data`** at **[https://data.hivex.aiandme.io](https://data.hivex.aiandme.io)** with short cache TTL + CORS.

---

## Leaderboard (scoring)

* Points per merged finding: **Critical 10** · **High 6** · **Medium 3** · **Low 1**.
* Bonuses: **+2** first valid report; **+1** high‑quality repro/evidence.
* Co‑authors split points.

---

## Governance & conduct (short)

* Safe‑harbor for good‑faith testing within scope.
* No real user data; sandbox only.
* Code of Conduct applies. Disputes on severity/duplicates can be appealed within 72h.

---

## License

* Code: MIT. Findings/data (reports, datasets, model cards): CC‑BY‑4.0.

---

## Links

* Website: [https://hivex.aiandme.io](https://hivex.aiandme.io)
* Data API (JSON): [https://data.hivex.aiandme.io](https://data.hivex.aiandme.io)
* Issues: [https://github.com/aiandme/HiveX/issues](https://github.com/aiandme/HiveX/issues)
* Discussions/Discord: <add invite link>
