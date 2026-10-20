import re

html_path = 'public/data-dictionary.html'
with open(html_path, 'r', encoding='utf-8') as f:
    html = f.read()

# Pattern for table-heading and table-desc:
# <div class="table-heading">\s*<div class="table-title">(.*?)</div>\s*<div class="table-meta">(.*?)</div>\s*</div>\s*<div class="table-desc">(.*?)</div>
pattern = re.compile(
    r'<div class="table-heading">\s*'
    r'<div class="table-title">(.*?)</div>\s*'
    r'<div class="table-meta">.*?</div>\s*'
    r'</div>\s*'
    r'<div class="table-desc">.*?</div>',
    re.DOTALL
)

matches = pattern.findall(html)
print(f"Total matching sections found: {len(matches)}")
for m in matches:
    print(f" - Table: {m}")
