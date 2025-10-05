from pathlib import Path
path = Path("src/views/DashboardView.vue")
text = path.read_text(encoding="utf-8")
insert = ".user-switch-stack {\n  display: flex;\n  flex-direction: column;\n  align-items: flex-end;\n  gap: var(--spacing-sm);\n}\n\n"
text = text.replace('.user-switch {', insert + '.user-switch {', 1)
# add mobile adjustment
mobile_insert = "  .user-switch-stack {\n    align-items: flex-start;\n  }\n\n"
text = text.replace('  .header-main {', '  .header-main {', 1)  # no change but ensures presence
if '  .user-switch-stack {
    align-items: flex-start;
  }

' not in text:
    text = text.replace('  .dashboard-view {', '  .dashboard-view {
    padding: var(--spacing-sm);
  }

  .user-switch-stack {
    align-items: flex-start;
  }

', 1)
path.write_text(text, encoding="utf-8")
