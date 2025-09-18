<template>
  <footer class="app-footer" aria-label="Site footer">
    <div class="footer-inner">
      <section class="footer-group" aria-labelledby="footer-team-heading">
        <h2 id="footer-team-heading" class="footer-heading">Team</h2>
        <p class="footer-placeholder">Replace this text with your team name and member roles.</p>
        <ul class="footer-list">
          <li>Member Name — Role (placeholder)</li>
          <li>Member Name — Role (placeholder)</li>
          <li>Member Name — Role (placeholder)</li>
        </ul>
      </section>

      <section class="footer-group" aria-labelledby="footer-sources-heading">
        <h2 id="footer-sources-heading" class="footer-heading">Data Sources</h2>
        <p class="footer-placeholder">Update these links with the data references you rely on.</p>
        <ul class="footer-list">
          <li>
            <a href="#" class="footer-link">Placeholder Source One</a>
          </li>
          <li>
            <a href="#" class="footer-link">Placeholder Source Two</a>
          </li>
          <li>
            <a href="#" class="footer-link">Placeholder Source Three</a>
          </li>
        </ul>
      </section>
    </div>
  </footer>
</template>

<script setup lang="ts">
// Pure presentational footer; no script logic required yet.
</script>

<style scoped>
.app-footer {
  margin-top: auto;
  background: rgba(15, 23, 42, 0.85);
  color: rgba(255, 255, 255, 0.82);
  border-top: 1px solid rgba(148, 163, 184, 0.35);
  backdrop-filter: blur(10px);
}

.footer-inner {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(220px, 1fr));
  gap: 32px;
  padding: 32px 24px;
}

.footer-group {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.footer-heading {
  font-size: 1.125rem;
  margin: 0;
  color: #f8fafc;
}

.footer-placeholder {
  margin: 0;
  font-size: 0.9rem;
  color: rgba(226, 232, 240, 0.75);
}

.footer-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: 6px;
  font-size: 0.9rem;
}

.footer-link {
  color: rgba(148, 197, 233, 0.9);
  text-decoration: none;
  transition: color 0.2s ease;
}

.footer-link:hover,
.footer-link:focus-visible {
  color: #60a5fa;
  text-decoration: underline;
}

@media (max-width: 640px) {
  .footer-inner {
    padding: 24px 16px;
    gap: 24px;
  }

  .footer-heading {
    font-size: 1rem;
  }
}
</style>
