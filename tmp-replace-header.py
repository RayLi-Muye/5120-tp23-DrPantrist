from pathlib import Path
import re
import textwrap
path = Path('src/views/DashboardView.vue')
text = path.read_text(encoding='utf-8')
header_text_match = re.search(r"(\s*<div class=\"header-main\">\n\s*<div class=\"header-text\">[\s\S]*?</div>)", text)
if not header_text_match:
    raise SystemExit('header text block not found')
user_switch_match = re.search(r"<div class=\"user-switch\"[\s\S]*?</div>", text)
if not user_switch_match:
    raise SystemExit('user switch block not found')
header_text_block = header_text_match.group(1)
user_switch_block = user_switch_match.group(0)
stripped_block = '\n'.join(line.lstrip() for line in user_switch_block.splitlines())
indented_user_switch = textwrap.indent(stripped_block, '          ')
new_header_main = f"{header_text_block}\n        <div class=\"user-switch-stack\">\n{indented_user_switch}\n          <DashboardTour />\n        </div>\n      </div>\n"
pattern = r"(\s*<div class=\"header-main\">[\s\S]*?)\n\s*<div class=\"header-info\">"
match = re.search(pattern, text)
if not match:
    raise SystemExit('header main full block not found')
text = text[:match.start()] + new_header_main + '      <div class="header-info">' + text[match.end():]
path.write_text(text, encoding='utf-8')
