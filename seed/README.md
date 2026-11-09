# /seed — private, not committed

Everything in this folder except this README is git-ignored, because the repo is public.
Put your exported meal-plan doc here, and Claude will convert it into the seed format
(see `tools/seed/FORMAT.md`), then run:

    python3 tools/seed/build_seed.py seed/

The result is `seed/out/meal-planner-seed.xlsx` plus `seed/out/REVIEW.md`.
