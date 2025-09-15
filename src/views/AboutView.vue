<template>
  <div class="about-view">
    <header class="about-header">
      <button @click="goBack" class="back-button" aria-label="Go back">←</button>
      <h1>About UseItUp</h1>
    </header>

    <main class="about-main">
      <section class="about-section">
        <h2>🌱 What Is Use It Up?</h2>
        <p>
          Use It Up is a simple, household‑friendly web app that helps you track groceries,
          avoid waste, and see your positive impact. It’s designed to be fast, mobile‑first,
          and easy to share with housemates.
        </p>
      </section>

      <section class="about-section">
        <h2>🏠 Key Concepts</h2>
        <ul class="features-list">
          <li><strong>Households</strong> — Create a household and share the join PIN with others.</li>
          <li><strong>Join via PIN</strong> — Housemates join using the Household ID + PIN.</li>
          <li><strong>Shared vs Private</strong> — Add items to a shared section or your
            own private section. Others can see private items but can’t change them.</li>
          <li><strong>Login Code</strong> — A 6‑character code lets you sign in on any device.</li>
        </ul>
      </section>

      <section class="about-section">
        <h2>📱 Get Started in 3 Steps</h2>
        <div class="steps">
          <div class="step">
            <div class="step-number">1</div>
            <div class="step-content">
              <h3>Create or Join</h3>
              <p>
                Create a household on the Auth page, or join one with a PIN on the
                Household screen.
              </p>
            </div>
          </div>
          <div class="step">
            <div class="step-number">2</div>
            <div class="step-content">
              <h3>Add Items</h3>
              <p>
                Choose a grocery, set an expiry date, and pick <em>Shared</em> or
                <em>Private</em>.
              </p>
            </div>
          </div>
          <div class="step">
            <div class="step-number">3</div>
            <div class="step-content">
              <h3>Use It Up</h3>
              <p>Mark items as used before expiry and track your savings and impact.</p>
            </div>
          </div>
        </div>
      </section>

      <section class="about-section">
        <h2>💡 Features</h2>
        <ul class="features-list">
          <li>🏠 Household management with join PIN</li>
          <li>👥 Shared and per‑member Private sections</li>
          <li>📦 Fast item adding with expiry guidance</li>
          <li>✅ Swipe or tap to mark as used</li>
          <li>🌍 Environmental and money‑saving impact</li>
          <li>🔒 Simple code‑based authentication, no passwords</li>
          <li>📱 Mobile‑first, works great on phones</li>
        </ul>
      </section>

      <section class="about-section">
        <h2>🔐 Sign‑In & Privacy</h2>
        <p>
          You sign in with a short login code—no passwords to remember. Your login code lets the
          app fetch your household and inventory securely from our API.
        </p>
        <p>
          You can reset local data by logging out. Never share your login code or household PIN in
          public places.
        </p>
      </section>

      <section class="about-section">
        <h2>🎯 Why It Matters</h2>
        <p>
          Food waste contributes to avoidable costs and emissions. By tracking what you buy and use,
          you’ll save money and reduce your footprint—one item at a time.
        </p>
      </section>
    </main>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from "vue-router";

const router = useRouter();

const goBack = () => {
  if (window.history.length > 1) {
    router.back();
  } else {
    router.push("/");
  }
};
</script>

<style scoped>
.about-view {
  padding: var(--spacing-md);
  min-height: 100vh;
  background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
}

.about-header {
  display: flex;
  align-items: center;
  margin-bottom: var(--spacing-xl);
}

.back-button {
  background: rgba(255, 255, 255, 0.15);
  border: 1px solid rgba(255, 255, 255, 0.2);
  font-size: var(--font-size-lg);
  color: white;
  cursor: pointer;
  padding: var(--spacing-sm);
  margin-right: var(--spacing-md);
  border-radius: var(--border-radius-md);
  min-height: var(--touch-target-min);
  min-width: var(--touch-target-min);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  transition: all var(--duration-fast) ease;
}

.back-button:hover {
  background: rgba(255, 255, 255, 0.2);
  transform: translateY(-1px);
}

.about-header h1 {
  font-size: var(--font-size-xl);
  color: white;
  margin: 0;
}

.about-main {
  max-width: 600px;
  margin: 0 auto;
}

.about-section {
  background: white;
  border-radius: var(--border-radius-lg);
  padding: var(--spacing-lg);
  margin-bottom: var(--spacing-lg);
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
}

.about-section h2 {
  font-size: var(--font-size-lg);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-md);
}

.about-section p {
  color: var(--color-text-secondary);
  line-height: 1.6;
  margin-bottom: var(--spacing-md);
}

.about-section p:last-child {
  margin-bottom: 0;
}

.steps {
  display: flex;
  flex-direction: column;
  gap: var(--spacing-lg);
}

.step {
  display: flex;
  align-items: flex-start;
  gap: var(--spacing-md);
}

.step-number {
  width: 32px;
  height: 32px;
  background: var(--color-primary);
  color: white;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-weight: var(--font-weight-bold);
  flex-shrink: 0;
}

.step-content h3 {
  font-size: var(--font-size-base);
  font-weight: var(--font-weight-semibold);
  color: var(--color-text-primary);
  margin-bottom: var(--spacing-xs);
}

.step-content p {
  color: var(--color-text-secondary);
  margin: 0;
}

.features-list {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  gap: var(--spacing-sm);
}

.features-list li {
  color: var(--color-text-secondary);
  padding: var(--spacing-sm);
  background: var(--color-bg-secondary);
  border-radius: var(--border-radius-md);
}

/* Mobile optimizations */
@media (max-width: 480px) {
  .about-view {
    padding: var(--spacing-sm);
  }

  .about-section {
    padding: var(--spacing-md);
  }

  .about-header h1 {
    font-size: var(--font-size-lg);
  }

  .steps {
    gap: var(--spacing-md);
  }

  .step {
    gap: var(--spacing-sm);
  }

  .step-number {
    width: 28px;
    height: 28px;
    font-size: var(--font-size-sm);
  }
}

/* Tablet and desktop */
@media (min-width: 768px) {
  .about-main {
    max-width: 800px;
  }

  .steps {
    display: grid;
    grid-template-columns: 1fr 1fr 1fr;
    gap: var(--spacing-xl);
  }

  .step {
    flex-direction: column;
    text-align: center;
    gap: var(--spacing-md);
  }

  .features-list {
    grid-template-columns: 1fr 1fr;
    gap: var(--spacing-md);
  }
}
</style>
