<template>
  <footer class="app-footer" aria-label="Site footer">
    <div class="footer-inner">
      <section class="footer-group" aria-labelledby="footer-team-heading">
        <h2 id="footer-team-heading" class="footer-heading">Team</h2>
        <p class="footer-placeholder">Introducing TP23.</p>
        <ul class="footer-list">
          <li>Ruifei Li — Information Technology</li>
          <li>Hao Zhong — Information Technology</li>
          <li>Gary Yu — Data Science</li>
          <li>Stuti — Data Science</li>
          <li>Garvita Zhang — Business Information Systems</li>
        </ul>
      </section>

      <section class="footer-group" aria-labelledby="footer-sources-heading">
        <h2 id="footer-sources-heading" class="footer-heading">Data Sources</h2>
        <p class="footer-placeholder">Our reference of Data insight.</p>
        <ul class="footer-list">
          <li>
            <a href="https://www.fao.org/4/mb060e/mb060e00.htm" class="footer-link">Global Food Loss and Waste: Facts and Figures</a>
          </li>
          <li>
            <a href="https://www.unep.org/resources/publication/food-waste-index-report-2024" class="footer-link">Food Waste Index Report 2024</a>
          </li>
          <li>
            <a href="https://www.dcceew.gov.au/environment/protection/waste/food-waste" class="footer-link">National Food Waste Strategy</a>
          </li>
          <li>
            <a href="https://www.foodbank.org.au/hunger-in-australia/?state=vic" class="footer-link">Hunger in Australia</a>
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
