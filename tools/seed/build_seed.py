#!/usr/bin/env python3
"""
build_seed.py — turns your recipes (written in a simple Markdown format) into
one .xlsx file whose tabs match the Google Sheet. You then upload it to Google
Drive, open it with Google Sheets, and use "Meal planner → Import seed from
another Sheet…" in the real planner Sheet.

Usage (from the repo folder):
    python3 tools/seed/build_seed.py seed/            # your private files
    python3 tools/seed/build_seed.py tools/seed/example/   # try it on the example

Input folder may contain:
    recipes.md        required — see tools/seed/FORMAT.md
    ingredients.csv   optional — id,name,name_hindi,section,grams_per_piece,perishable
    plan.csv          optional — date,lunch_dal,lunch_sabzi,lunch_carb,lunch_salad,lunch_side,soup,cheese_night,note

Output (inside the input folder):
    out/meal-planner-seed.xlsx
    out/REVIEW.md     things to check: short soaks, unknown ingredients, missing fields…

Needs: pip install openpyxl
"""

import csv
import re
import sys
from pathlib import Path

try:
    from openpyxl import Workbook
except ImportError:
    sys.exit("Please run:  pip install openpyxl")

# Keep in sync with SCHEMA in apps-script/Setup.gs
SCHEMA = {
    "Recipes": [
        "id", "name", "name_hindi", "category", "dal_type", "soup_style", "region",
        "protein_g_per_person", "kcal_per_person",
        "contains_paneer", "contains_tofu", "contains_cheese", "contains_curd",
        "cruciferous", "kidney_caution", "equipment",
        "steps_en", "steps_hindi", "reheat_en", "reheat_hindi",
        "instagram_reel_url", "soak_review", "notes", "active",
    ],
    "RecipeIngredients": ["recipe_id", "ingredient_id", "quantity", "unit", "soak_overnight", "prep_note"],
    "Ingredients": ["id", "name", "name_hindi", "section", "grams_per_piece", "perishable"],
    "Pantry": ["ingredient_id", "in_stock"],
    "Plan": ["date", "lunch_dal", "lunch_sabzi", "lunch_carb", "lunch_salad", "lunch_side",
             "soup", "cheese_night", "pinned", "note"],
}

CATEGORIES = {"dal", "sabzi", "carb", "salad", "soup", "side"}
SECTIONS = {"vegetables", "greens & herbs", "dals & grains", "dairy & extras", "spices"}
YN_FIELDS = ["contains_paneer", "contains_tofu", "contains_cheese", "contains_curd", "cruciferous", "kidney_caution"]
UNITS = r"(?:g|kg|ml|l|tsp|tbsp|cups?|pieces?|pcs?|bunch(?:es)?|pinch|cloves?|inch)"

# Signs of a short hot-water soak done by the cook (not allowed — see FORMAT.md).
SHORT_SOAK = re.compile(
    r"(hot|warm|garam)\s+(water|paani|pani)|गरम\s*पानी|गुनगुने\s*पानी|"
    r"soak(ed)?\s+(it\s+)?for\s+\d+\s*(min|minutes|mins)|\b(15|20|30|45)\s*(min|minutes|mins)\b[^.\n]*soak|"
    r"half an hour[^.\n]*soak|soak[^.\n]*half an hour",
    re.IGNORECASE,
)


def slug(text):
    return re.sub(r"[^a-z0-9]+", "-", text.lower()).strip("-")


def yn(value, default="n"):
    v = str(value or "").strip().lower()
    if v in ("y", "yes", "true", "1"):
        return "y"
    if v in ("n", "no", "false", "0"):
        return "n"
    return default


def number(text):
    """'1/2' → 0.5, '1.5' → 1.5, '2' → 2"""
    text = text.strip()
    if "/" in text:
        a, b = text.split("/", 1)
        return round(float(a) / float(b), 3)
    n = float(text)
    return int(n) if n.is_integer() else n


def parse_ingredient_line(line):
    """
    "- 150 g rajma (soak overnight); picked over"
    → quantity 150, unit g, name rajma, soak y, note "picked over"
    Lines without a number ("- salt to taste") keep the whole text as the name.
    """
    line = line.lstrip("-* ").strip()
    note = ""
    if ";" in line:
        line, note = (p.strip() for p in line.split(";", 1))
    soak = "n"
    m = re.search(r"\(([^)]*)\)\s*$", line)
    if m and "soak" in m.group(1).lower():
        soak = "y"
        line = line[: m.start()].strip()
    m = re.match(rf"^(?P<qty>\d+(?:[./]\d+)?)\s*(?P<unit>{UNITS})?\s+(?P<name>.+)$", line, re.IGNORECASE)
    if m:
        unit = (m.group("unit") or "piece").lower()
        unit = {"pieces": "piece", "pc": "piece", "pcs": "piece", "cups": "cup", "cloves": "clove", "bunches": "bunch"}.get(unit, unit)
        return number(m.group("qty")), unit, m.group("name").strip(), soak, note
    return "", "", line, soak, note


def parse_recipes(text):
    """Split recipes.md on '## ' headings and read fields + sub-sections."""
    recipes = []
    for block in re.split(r"^## +", text, flags=re.MULTILINE)[1:]:
        lines = block.splitlines()
        r = {"name": lines[0].strip(), "_ingredients": [], "_sections": {}}
        section = None
        for raw in lines[1:]:
            line = raw.rstrip()
            h = re.match(r"^### +(.+)$", line)
            if h:
                section = h.group(1).strip().lower()
                r["_sections"].setdefault(section, [])
                continue
            if section is None:
                f = re.match(r"^[-*]\s*([a-z_]+)\s*:\s*(.*)$", line.strip())
                if f:
                    r[f.group(1)] = f.group(2).strip()
            elif section == "ingredients":
                if line.strip().startswith(("-", "*")):
                    r["_ingredients"].append(parse_ingredient_line(line))
            else:
                r["_sections"][section].append(line)
        sec = {k: "\n".join(v).strip() for k, v in r["_sections"].items()}
        r["steps_en"] = sec.get("steps", "")
        r["steps_hindi"] = sec.get("steps (hindi)", "")
        r["reheat_en"] = sec.get("reheat", "")
        r["reheat_hindi"] = sec.get("reheat (hindi)", "")
        r["notes"] = sec.get("notes", r.get("notes", ""))
        recipes.append(r)
    return recipes


def main(folder):
    folder = Path(folder)
    out = folder / "out"
    out.mkdir(exist_ok=True)
    review = []  # lines for REVIEW.md

    # --- ingredients catalogue ---
    ingredients = {}  # id → row
    by_name = {}      # lowercased name / id → id
    ing_csv = folder / "ingredients.csv"
    if ing_csv.exists():
        with ing_csv.open(newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                iid = (row.get("id") or slug(row["name"])).strip()
                row["id"] = iid
                row["perishable"] = yn(row.get("perishable"))
                ingredients[iid] = row
                by_name[iid] = iid
                by_name[row["name"].strip().lower()] = iid

    def ingredient_id(name, recipe_name):
        key = name.strip().lower()
        if key in by_name:
            return by_name[key]
        iid = slug(name)
        if iid not in ingredients:
            ingredients[iid] = {"id": iid, "name": name.strip(), "name_hindi": "", "section": "",
                                "grams_per_piece": "", "perishable": ""}
            review.append(f"- New ingredient **{name.strip()}** (from {recipe_name}): add section, Hindi name, perishable.")
        by_name[key] = iid
        return iid

    # --- recipes ---
    recipes, recipe_ings = [], []
    ids = set()
    for r in parse_recipes((folder / "recipes.md").read_text(encoding="utf-8")):
        rid = r.get("id") or slug(r["name"])
        if rid in ids:
            review.append(f"- Duplicate recipe id **{rid}** — give one of them a different `id:`.")
        ids.add(rid)
        row = {h: r.get(h, "") for h in SCHEMA["Recipes"]}
        row["id"] = rid
        row["category"] = row["category"].lower()
        row["instagram_reel_url"] = r.get("reel", row["instagram_reel_url"])
        for h in YN_FIELDS:
            row[h] = yn(row[h])
        row["active"] = yn(row["active"], "y")

        if row["category"] not in CATEGORIES:
            review.append(f"- **{r['name']}**: category `{row['category'] or '(blank)'}` should be one of {', '.join(sorted(CATEGORIES))}.")
        if row["category"] in ("dal",) and not row["dal_type"]:
            review.append(f"- **{r['name']}**: add `dal_type` (needed for the no-repeat rule).")
        if row["category"] == "soup" and not row["soup_style"]:
            review.append(f"- **{r['name']}**: add `soup_style`.")
        if not row["steps_en"]:
            review.append(f"- **{r['name']}**: no steps.")
        if row["category"] == "salad" and row["cruciferous"] == "y":
            review.append(f"- **{r['name']}**: cruciferous vegetables must not be raw in salads.")

        # Short hot-water soaks: flag for review unless already handled.
        text = f"{row['steps_en']}\n{row['steps_hindi']}"
        if SHORT_SOAK.search(text):
            msg = "Recipe mentions a short/hot-water soak — convert to an overnight soak (and say 'already soaking, rinse first') or keep flagged."
            row["soak_review"] = row["soak_review"] or msg
            review.append(f"- **{r['name']}**: {msg}")
        elif row["soak_review"]:
            review.append(f"- **{r['name']}**: {row['soak_review']}")

        has_soak = False
        for qty, unit, name, soak, note in r["_ingredients"]:
            iid = ingredient_id(name, r["name"])
            has_soak = has_soak or soak == "y"
            recipe_ings.append({"recipe_id": rid, "ingredient_id": iid, "quantity": qty, "unit": unit,
                                "soak_overnight": soak, "prep_note": note})
        if has_soak and not re.search(r"rinse|already soak|भिगो|धो", text, re.IGNORECASE):
            review.append(f"- **{r['name']}**: has an overnight soak, but the script doesn't tell the cook it's already soaking / to rinse it.")
        if not r["_ingredients"]:
            review.append(f"- **{r['name']}**: no ingredients listed.")
        recipes.append(row)

    for ing in ingredients.values():
        if ing.get("section") and ing["section"] not in SECTIONS:
            review.append(f"- Ingredient **{ing['name']}**: section `{ing['section']}` should be one of {', '.join(sorted(SECTIONS))}.")

    # --- plan ---
    plan = []
    name_to_id = {r["name"].strip().lower(): r["id"] for r in recipes}
    plan_csv = folder / "plan.csv"
    if plan_csv.exists():
        with plan_csv.open(newline="", encoding="utf-8") as f:
            for row in csv.DictReader(f):
                p = {h: (row.get(h) or "").strip() for h in SCHEMA["Plan"]}
                for slot in ["lunch_dal", "lunch_sabzi", "lunch_carb", "lunch_salad", "lunch_side", "soup"]:
                    v = p[slot]
                    if v and v not in ids:
                        if v.lower() in name_to_id:
                            p[slot] = name_to_id[v.lower()]
                        else:
                            review.append(f"- Plan {p['date']}: `{v}` ({slot}) isn't a known recipe.")
                p["cheese_night"] = yn(p["cheese_night"])
                p["pinned"] = yn(p["pinned"])
                plan.append(p)

    # --- write xlsx ---
    wb = Workbook()
    wb.remove(wb.active)
    tables = {
        "Ingredients": list(ingredients.values()),
        "Recipes": recipes,
        "RecipeIngredients": recipe_ings,
        "Pantry": [{"ingredient_id": i, "in_stock": "y" if ing.get("section") == "spices" else "n"}
                   for i, ing in ingredients.items()],
        "Plan": plan,
    }
    for name, rows in tables.items():
        ws = wb.create_sheet(name)
        ws.append(SCHEMA[name])
        for row in rows:
            ws.append([row.get(h, "") for h in SCHEMA[name]])
    xlsx = out / "meal-planner-seed.xlsx"
    wb.save(xlsx)

    missing_hindi = sum(1 for r in recipes if not r["steps_hindi"])
    report = [
        "# Seed review", "",
        f"{len(recipes)} recipes, {len(ingredients)} ingredients, {len(plan)} plan days.",
        f"{missing_hindi} recipes have no Hindi script yet (fine for now).", "",
        "## Please check", "",
        *(review or ["Nothing to check."]),
        "",
    ]
    (out / "REVIEW.md").write_text("\n".join(report), encoding="utf-8")
    print(f"Wrote {xlsx}")
    print(f"Wrote {out / 'REVIEW.md'} ({len(review)} item(s) to check)")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else "seed")
