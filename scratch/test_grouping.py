import re

html_path = 'public/data-dictionary.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Define the groups
groups_meta = [
    {
        "id": 1,
        "title": "Part 1: Tables 1 – 3",
        "tables": ["users", "student_profiles", "otp_verifications"],
        "filename": "data-dictionary-part1-tables-1-to-3.png"
    },
    {
        "id": 2,
        "title": "Part 2: Tables 4 – 6",
        "tables": ["student_cmo_requirements", "community_requests", "request_types"],
        "filename": "data-dictionary-part2-tables-4-to-6.png"
    },
    {
        "id": 3,
        "title": "Part 3: Tables 7 – 9",
        "tables": ["skills", "dss_match_results", "deployments"],
        "filename": "data-dictionary-part3-tables-7-to-9.png"
    },
    {
        "id": 4,
        "title": "Part 4: Tables 10 – 12",
        "tables": ["deployment_students", "attendance_records", "rendered_hours_summary"],
        "filename": "data-dictionary-part4-tables-10-to-12.png"
    },
    {
        "id": 5,
        "title": "Part 5: Tables 13 – 15",
        "tables": ["make_up_requests", "student_evaluations", "student_feedback"],
        "filename": "data-dictionary-part5-tables-13-to-15.png"
    },
    {
        "id": 6,
        "title": "Part 6: Tables 16 – 17 (Last 2 Tables)",
        "tables": ["notifications", "notification_preferences"],
        "filename": "data-dictionary-part6-tables-16-to-17.png"
    }
]

# Extract each section by regex
# <section class="table-section" id="table_{name}">...</section>
sections = {}
for g in groups_meta:
    for t in g["tables"]:
        pattern = re.compile(rf'(<!-- =+ -->\s*<!-- \d+\. {t.upper()} -->\s*<section class="table-section" id="table_{t}">.*?</section>)', re.DOTALL | re.IGNORECASE)
        m = pattern.search(html)
        if m:
            sections[t] = m.group(1)
        else:
            # Try without comment header
            pattern2 = re.compile(rf'(<section class="table-section" id="table_{t}">.*?</section>)', re.DOTALL | re.IGNORECASE)
            m2 = pattern2.search(html)
            if m2:
                sections[t] = m2.group(1)
            else:
                print(f"FAILED to find section for table: {t}")

print(f"Extracted {len(sections)} of 17 tables.")
