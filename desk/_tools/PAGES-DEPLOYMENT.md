# Gated GitHub Pages deployment — owner action and verification

Not published (underscore folder). Applies to `.github/workflows/desk-pages-deploy.yml` (audit finding B4).

## Why an owner action is needed

The site is currently published by GitHub's built-in `pages-build-deployment`, because the Pages source is
"Deploy from a branch". That deployment runs on every push to `main` **whether or not Desk validation passes**.
The gated workflow (validate → build → deploy, `main` only) can only take over once the Pages source is
"GitHub Actions". This is a repository setting; Claude does not change it. **Until it is changed, deployment is not
gated, and real confidential project packages remain prohibited.**

## 1. Change the setting (owner)

1. Open https://github.com/kianakazemi04/nexus-ways → **Settings** → **Pages** (left menu, "Code and automation").
2. Under **Build and deployment** → **Source**, choose **GitHub Actions** instead of "Deploy from a branch".
   Do not click any suggested starter workflow ("Configure"); the repository already contains the workflow.
3. On the same page, confirm **Custom domain** still shows `nexus-ways.com` and **Enforce HTTPS** is still ticked.
4. **Settings** → **Environments** → **github-pages**: under *Deployment branches and tags*, confirm only `main`
   is allowed (GitHub normally creates this rule; if it shows "No restriction", select "Selected branches and tags"
   and add `main`).

Changing the source does not redeploy anything by itself: the site that is live now stays live until the next
successful run of the gated workflow on `main`.

## 2. Verify the setting

- Settings → Pages shows "Your site is live at https://nexus-ways.com/" and **Source: GitHub Actions**.
- From a terminal with GitHub CLI: `gh api repos/kianakazemi04/nexus-ways/pages --jq .build_type` returns
  `workflow` (it returns `legacy` while the source is a branch). This session's proxy cannot read that endpoint,
  so this check must be done by the owner.
- After the next push to `main`, the Actions tab shows a run of **Nexus Desk gated Pages deployment** and **no new
  `pages-build-deployment` run**.

## 3. Verify the first gated deployment safely (only after an explicit merge approval)

The first push to `main` after the setting changes is the first gated deployment. Proposed procedure:

1. **Before merging:** the branch's own CI must be green (validate + pages-build-check). Record the rollback point
   (current `main` commit) and a snapshot of the live checks used at G1.
2. **Merge** (fast-forward) only on the owner's explicit instruction.
3. **Watch the run:** `validate / validate` and `validate / pages-build-check` must pass first; `build` runs only
   after them and re-checks the exact `_site` tree; `deploy` runs only after `build`. If any job fails, nothing is
   deployed and the previous site stays live.
4. **Live checks after deploy** (same as G1): Desk routes and assets return 200; `desk/_fixtures`, `_tools`,
   `_schema`, `_tests`, `.github` return 404; every Desk page is `noindex`; 0 published opportunities; no `FIX-`
   ids; `?fixtures=1` inert; custom domain and HTTPS unchanged; no console errors.
5. **Rollback:** if the deployed site is wrong, revert the commit on `main` (owner approval) and the gated workflow
   redeploys the previous content; as an emergency fallback the owner can set the Pages source back to
   "Deploy from a branch" (which also removes the gate).

Optional extra evidence that the gate blocks, without touching `main`: on a throw-away branch, push a commit with a
deliberate validation error and show that the validation workflow fails. The deploy workflow never runs outside
`main`, so this shows the failing check, not a blocked deployment; the blocked-deployment path itself is covered by
the workflow structure (`needs: validate`) and the tests in `desk/_tests/p0.test.mjs`.

## 4. Recommended additionally: protect `main` (owner)

Settings → **Rules** → **Rulesets** → **New branch ruleset**: target the default branch; enable *Restrict
deletions*, *Block force pushes*, *Require a pull request before merging*, and *Require status checks to pass* with
`validate` and `pages-build-check`; leave the bypass list empty. Today `main` has no branch protection and no
rulesets (checked read-only on 2026-10-27).

## Action pinning policy

All third-party actions are pinned to full commit SHAs with the release in a comment, e.g.
`actions/checkout@11d5960a326750d5838078e36cf38b85af677262 # v4.4.0`. The approved list lives in
`desk/_tests/p0.test.mjs` (`APPROVED_ACTION_PINS`); the test fails on any tag, branch, short SHA, unknown action or
changed SHA. To update a pin: read the tag from the official repository
(`git ls-remote --tags https://github.com/actions/<name>`; for an annotated tag use the `^{}` line), confirm the
commit exists there, then update the workflow and the approved list in the same commit.
