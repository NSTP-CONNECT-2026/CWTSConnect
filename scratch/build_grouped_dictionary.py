import re
import os
import time
from selenium import webdriver
from selenium.webdriver.chrome.options import Options
from selenium.webdriver.common.by import By
from PIL import Image

# 1. READ EXISTING HTML
html_path = 'public/data-dictionary.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Define groups
groups_meta = [
    {
        "id": 1,
        "title": "Part 1: Tables 1 – 3",
        "label": "Tables 1 – 3",
        "tables": ["users", "student_profiles", "otp_verifications"],
        "filename": "data-dictionary-part1-tables-1-to-3.png"
    },
    {
        "id": 2,
        "title": "Part 2: Tables 4 – 6",
        "label": "Tables 4 – 6",
        "tables": ["student_cmo_requirements", "community_requests", "request_types"],
        "filename": "data-dictionary-part2-tables-4-to-6.png"
    },
    {
        "id": 3,
        "title": "Part 3: Tables 7 – 9",
        "label": "Tables 7 – 9",
        "tables": ["skills", "dss_match_results", "deployments"],
        "filename": "data-dictionary-part3-tables-7-to-9.png"
    },
    {
        "id": 4,
        "title": "Part 4: Tables 10 – 12",
        "label": "Tables 10 – 12",
        "tables": ["deployment_students", "attendance_records", "rendered_hours_summary"],
        "filename": "data-dictionary-part4-tables-10-to-12.png"
    },
    {
        "id": 5,
        "title": "Part 5: Tables 13 – 15",
        "label": "Tables 13 – 15",
        "tables": ["make_up_requests", "student_evaluations", "student_feedback"],
        "filename": "data-dictionary-part5-tables-13-to-15.png"
    },
    {
        "id": 6,
        "title": "Part 6: Tables 16 – 17 (Last 2 Tables)",
        "label": "Tables 16 – 17",
        "tables": ["notifications", "notification_preferences"],
        "filename": "data-dictionary-part6-tables-16-to-17.png"
    }
]

# Extract each table section
table_sections = {}
for g in groups_meta:
    for t in g["tables"]:
        pattern = re.compile(rf'(<!-- =+ -->\s*<!-- \d+\. {t.upper()} -->\s*<section class="table-section" id="table_{t}">.*?</section>)', re.DOTALL | re.IGNORECASE)
        m = pattern.search(html)
        if m:
            table_sections[t] = m.group(1).strip()
        else:
            pattern2 = re.compile(rf'(<section class="table-section" id="table_{t}">.*?</section>)', re.DOTALL | re.IGNORECASE)
            m2 = pattern2.search(html)
            if m2:
                table_sections[t] = m2.group(1).strip()
            else:
                raise Exception(f"Failed to find table {t}")

print(f"Successfully extracted all {len(table_sections)} tables.")

# Build HTML for groups
groups_html_parts = []
for g in groups_meta:
    inner_tables = "\n\n".join([table_sections[t] for t in g["tables"]])
    tables_list_str = ", ".join(g["tables"])
    part_html = f"""    <!-- ========================================== -->
    <!-- {g['title'].upper()} -->
    <!-- ========================================== -->
    <div class="table-group-wrapper" id="group-wrapper-{g['id']}">
      <div class="group-header-bar">
        <div class="group-title-info">
          <span class="group-badge">{g['title']}</span>
          <span class="group-tables-list">({tables_list_str})</span>
        </div>
        <a href="/{g['filename']}" download="{g['filename']}" class="btn-group-dl">
          Download {g['label']} PNG
        </a>
      </div>

      <div class="group-tables-container" id="group-container-{g['id']}">
{inner_tables}
      </div>
    </div>"""
    groups_html_parts.append(part_html)

all_groups_html = "\n\n".join(groups_html_parts)

# Build Top Download Card HTML
download_cards_grid = []
for g in groups_meta:
    btn = f"""          <a href="/{g['filename']}" download="{g['filename']}" class="dl-card-btn">
            <span class="dl-title">Download {g['label']} PNG</span>
            <span class="dl-sub">{", ".join(g['tables'])}</span>
          </a>"""
    download_cards_grid.append(btn)

download_card_html = f"""    <!-- PNG Downloads Section (Print-ready 300 DPI exports) -->
    <div class="download-card">
      <div style="display: flex; justify-content: space-between; align-items: flex-start; flex-wrap: wrap; gap: 12px; margin-bottom: 12px;">
        <div>
          <h3>Download Data Dictionary Tables as PNG (Black &amp; White)</h3>
          <p>Naka-grupo ang kada 3 tables (at ang huling 2 tables) sa high-resolution 300 DPI PNG na angkop para sa pormal na dokumentasyon at matipid sa ink.</p>
        </div>
        <button onclick="downloadAllPNGs()" class="dl-all-btn">
          Download All 6 PNG Batches
        </button>
      </div>

      <div class="download-grid">
{chr(10).join(download_cards_grid)}
      </div>
    </div>"""

# Update CSS in HTML
css_insert = """
    /* Download Panel & Group Bars */
    .download-card {
      border: 1.5px solid #000000;
      padding: 16px 20px;
      margin-bottom: 24px;
      background: #ffffff;
    }

    .download-card h3 {
      font-size: 1.05rem;
      font-weight: 800;
      letter-spacing: -0.01em;
      color: #000000;
      margin-bottom: 4px;
    }

    .download-card p {
      font-size: 0.85rem;
      color: #333333;
    }

    .download-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 8px 12px;
    }

    .dl-card-btn {
      display: flex;
      flex-direction: column;
      padding: 9px 12px;
      border: 1px solid #000000;
      background: #ffffff;
      color: #000000;
      text-decoration: none;
      border-radius: 4px;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .dl-card-btn:hover {
      background: #000000;
      color: #ffffff;
    }

    .dl-card-btn .dl-title {
      font-weight: 700;
      font-size: 0.85rem;
    }

    .dl-card-btn .dl-sub {
      font-size: 0.725rem;
      color: #555555;
      margin-top: 2px;
      font-family: var(--font-mono);
      white-space: nowrap;
      overflow: hidden;
      text-overflow: ellipsis;
    }

    .dl-card-btn:hover .dl-sub {
      color: #dddddd;
    }

    .dl-all-btn {
      display: inline-block;
      padding: 8px 18px;
      background: #000000;
      color: #ffffff;
      font-weight: 700;
      font-size: 0.825rem;
      border: 1px solid #000000;
      border-radius: 4px;
      cursor: pointer;
      transition: background 0.15s ease;
    }

    .dl-all-btn:hover {
      background: #333333;
    }

    .table-group-wrapper {
      margin-bottom: 40px;
    }

    .group-header-bar {
      display: flex;
      justify-content: space-between;
      align-items: center;
      flex-wrap: wrap;
      gap: 10px;
      border: 1px solid #000000;
      border-bottom: 2px solid #000000;
      background: #fbfbfb;
      padding: 10px 14px;
      margin-bottom: 12px;
    }

    .group-title-info {
      display: flex;
      align-items: baseline;
      gap: 8px;
      flex-wrap: wrap;
    }

    .group-badge {
      font-weight: 800;
      font-size: 0.95rem;
      color: #000000;
    }

    .group-tables-list {
      font-family: var(--font-mono);
      font-size: 0.8rem;
      color: #444444;
    }

    .btn-group-dl {
      display: inline-block;
      padding: 6px 14px;
      font-size: 0.8125rem;
      font-weight: 700;
      color: #000000;
      border: 1px solid #000000;
      background: #ffffff;
      text-decoration: none;
      border-radius: 4px;
      transition: background 0.15s ease, color 0.15s ease;
    }

    .btn-group-dl:hover {
      background: #000000;
      color: #ffffff;
    }

    .group-tables-container {
      background: #ffffff;
      padding: 18px;
      border: 1px solid #000000;
    }

    .group-tables-container .table-section {
      margin-bottom: 24px;
    }

    .group-tables-container .table-section:last-child {
      margin-bottom: 0;
    }
"""

# Replace the body content between TOC and footer/script
# Find TOC end
toc_end_idx = html.find('</div>\n    </div>\n\n\n    <!-- ========================================== -->')
if toc_end_idx == -1:
    toc_end_idx = html.find('</div>\n    </div>') + len('</div>\n    </div>')

# Find footer or end of container
container_end_idx = html.rfind('  </div>\n\n</body>')
if container_end_idx == -1:
    container_end_idx = html.rfind('</div>\n\n</body>')

# Let's inspect before replacing
print(f"toc_end_idx: {toc_end_idx}, container_end_idx: {container_end_idx}")

# Also add script for downloadAllPNGs before </body>
js_code = """
  <script>
    function downloadAllPNGs() {
      const files = [
        '/data-dictionary-part1-tables-1-to-3.png',
        '/data-dictionary-part2-tables-4-to-6.png',
        '/data-dictionary-part3-tables-7-to-9.png',
        '/data-dictionary-part4-tables-10-to-12.png',
        '/data-dictionary-part5-tables-13-to-15.png',
        '/data-dictionary-part6-tables-16-to-17.png'
      ];
      files.forEach((file, idx) => {
        setTimeout(() => {
          const a = document.createElement('a');
          a.href = file;
          a.download = file.substring(1);
          document.body.appendChild(a);
          a.click();
          document.body.removeChild(a);
        }, idx * 450);
      });
    }
  </script>
"""

# We can re-synthesize cleanly
head_part = html[:html.find('</style>')]
# Add print overrides
print_override = """
    @media print {
      .download-card,
      .group-header-bar {
        display: none !important;
      }
      .group-tables-container {
        padding: 0 !important;
        border: none !important;
      }
      .table-group-wrapper {
        margin-bottom: 24px;
      }
    }
"""
new_head = head_part + css_insert + print_override + "  </style>\n</head>\n<body>\n\n  <div class=\"container\">\n"

# Get screen-header, doc-title-block, toc-block
body_start = html.find('<header class="screen-header">')
toc_end = html.find('</div>\n    </div>', body_start) + len('</div>\n    </div>')
top_section = html[body_start:toc_end]

final_html = f"""<!DOCTYPE html>
<html lang="en">
<head>
{new_head[new_head.find('<head>') + 6:]}
{top_section}

{download_card_html}

{all_groups_html}

  </div>

{js_code}
</body>
</html>
"""

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(final_html)

print("Updated public/data-dictionary.html with grouped layout and download controls.")
