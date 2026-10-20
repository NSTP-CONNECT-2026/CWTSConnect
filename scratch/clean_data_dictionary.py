import re

# 1. Update public/data-dictionary.html
html_path = 'public/data-dictionary.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Replace all table-heading and table-desc with just <div class="table-title">...</div>
pattern = re.compile(
    r'<div class="table-heading">\s*'
    r'<div class="table-title">(.*?)</div>\s*'
    r'<div class="table-meta">.*?</div>\s*'
    r'</div>\s*'
    r'<div class="table-desc">.*?</div>',
    re.DOTALL
)

def replace_table_header(match):
    table_name = match.group(1).strip()
    return f'<div class="table-title">{table_name}</div>'

new_html, count = pattern.subn(replace_table_header, html)
print(f"Replaced {count} table header blocks in {html_path}")

# Update CSS in html
old_css = """    .table-heading {
      display: flex;
      justify-content: space-between;
      align-items: baseline;
      border-bottom: 1.5px solid #000000;
      padding-bottom: 4px;
      margin-bottom: 8px;
    }

    .table-title {
      font-family: var(--font-mono);
      font-size: 1.15rem;
      font-weight: 800;
      color: #000000;
      letter-spacing: -0.01em;
    }

    .table-meta {
      font-size: 0.8rem;
      font-style: italic;
      color: #444444;
    }

    .table-desc {
      font-size: 0.85rem;
      color: #222222;
      margin-bottom: 8px;
      line-height: 1.4;
    }

    /* The Data Dictionary Grid Table */
    table.data-dict-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 8px;
      font-size: 9pt;
      background: #ffffff;
      color: #000000;
    }"""

new_css = """    .table-title {
      font-family: var(--font-mono);
      font-size: 1.05rem;
      font-weight: 700;
      color: #000000;
      letter-spacing: -0.01em;
      padding: 7px 10px;
      border: 1px solid #000000;
      border-bottom: 2px solid #000000;
      background-color: #ffffff;
      margin-bottom: 0;
    }

    /* The Data Dictionary Grid Table */
    table.data-dict-table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 0;
      font-size: 9pt;
      background: #ffffff;
      color: #000000;
      border: 1px solid #000000;
      border-top: none;
    }"""

if old_css in new_html:
    new_html = new_html.replace(old_css, new_css)
    print("CSS updated successfully")
else:
    print("Warning: old CSS not matched exactly, checking...")

# Also update th background to pure white in CSS
new_html = new_html.replace(
    'table.data-dict-table th {\n      background-color: var(--table-header-bg);',
    'table.data-dict-table th {\n      background-color: #ffffff;'
)
new_html = new_html.replace(
    'table.data-dict-table th {\n        background-color: #f0f0f0 !important;',
    'table.data-dict-table th {\n        background-color: #ffffff !important;'
)

with open(html_path, 'w', encoding='utf-8') as f:
    f.write(new_html)

print(f"Updated {html_path}")

# 2. Update DATA_DICTIONARY.md
md_path = 'DATA_DICTIONARY.md'
with open(md_path, 'r', encoding='utf-8') as f:
    md = f.read()

# Remove **Description**: lines
md_new = re.sub(r'\n\*\*Description\*\*:[^\n]*\n', '\n', md)
with open(md_path, 'w', encoding='utf-8') as f:
    f.write(md_new)

print(f"Updated {md_path}")
