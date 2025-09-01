<template>
  <div class="home-page">
    <!-- Hero Section -->
    <section class="hero">
      <div class="hero-content">
        <div class="hero-text">
          <h1 class="hero-title">
            <span class="highlight">Use It Up</span>
            <br>
            Stop Food Waste, Start Saving
          </h1>
          <p class="hero-subtitle">
            Track your groceries, reduce waste, and make a positive impact on the environment.
            Every item you use instead of throwing away saves money and helps our planet.
          </p>
          <div class="hero-stats">
            <div class="stat">
              <span class="stat-number">30%</span>
              <span class="stat-label">Food wasted globally</span>
            </div>
            <div class="stat">
              <span class="stat-number">$1,500</span>
              <span class="stat-label">Average family waste/year</span>
            </div>
            <div class="stat">
              <span class="stat-number">8%</span>
              <span class="stat-label">Global greenhouse gases</span>
            </div>
          </div>
          <button @click="getStarted" class="cta-button">
            Get Started
            <span class="button-icon">🚀</span>
          </button>
        </div>
        <div class="hero-visual">
          <div class="phone-mockup">
            <div class="phone-screen">
              <div class="app-preview">
                <div class="preview-header">
                  <div class="preview-title">Your Inventory</div>
                  <div class="preview-stats">
                    <span class="stat-item">💰 $45 saved</span>
                    <span class="stat-item">🌱 12kg CO₂ avoided</span>
                  </div>
                </div>
                <div class="preview-items">
                  <div class="preview-item fresh">
                    <span class="item-emoji">🥕</span>
                    <span class="item-name">Carrots</span>
                    <span class="item-status">Fresh</span>
                  </div>
                  <div class="preview-item warning">
                    <span class="item-emoji">🥛</span>
                    <span class="item-name">Milk</span>
                    <span class="item-status">2 days left</span>
                  </div>
                  <div class="preview-item fresh">
                    <span class="item-emoji">🍎</span>
                    <span class="item-name">Apples</span>
                    <span class="item-status">Fresh</span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- Features Section -->
    <section class="features">
      <div class="container">
        <h2 class="section-title">How Use It Up Helps You</h2>
        <div class="features-grid">
          <div class="feature-card">
            <div class="feature-icon">📱</div>
            <h3>Smart Tracking</h3>
            <p>Easily add groceries with expiry dates and get timely reminders before items go bad.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">💰</div>
            <h3>Save Money</h3>
            <p>Track how much money you save by using items instead of throwing them away.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">🌍</div>
            <h3>Help Environment</h3>
            <p>See your positive environmental impact with CO₂ reduction tracking.</p>
          </div>
          <div class="feature-card">
            <div class="feature-icon">📊</div>
            <h3>Visual Insights</h3>
            <p>Get clear insights into your consumption patterns and waste reduction progress.</p>
          </div>
        </div>
      </div>
    </section>

    <!-- Impact Section -->
    <section class="impact">
      <div class="container">
        <div class="impact-content">
          <div class="impact-text">
            <h2>Make Every Meal Count</h2>
            <p>
              Food waste is one of the biggest environmental challenges we face.
              When you throw away food, you're not just wasting money – you're wasting
              all the resources that went into producing it.
            </p>
            <ul class="impact-list">
              <li>🌱 Reduce your carbon footprint</li>
              <li>💧 Save water and energy</li>
              <li>💰 Keep money in your pocket</li>
              <li>🏆 Feel good about your choices</li>
            </ul>
          </div>
          <div class="impact-visual">
            <div class="impact-circle">
              <div class="circle-content">
                <span class="circle-emoji">🌍</span>
                <span class="circle-text">Together we can make a difference</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>

    <!-- CTA Section -->
    <section class="final-cta">
      <div class="container">
        <div class="cta-content">
          <h2>Ready to Start Your Journey?</h2>
          <p>Join thousands of users who are already making a difference</p>
          <button @click="getStarted" class="cta-button large">
            Start Tracking Now
            <span class="button-icon">✨</span>
          </button>
          <p class="cta-note">Free to use • No credit card required • Start immediately</p>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { useRouter } from 'vue-router'

const router = useRouter()

const getStarted = () => {
  router.push('/auth')
}
</script>

<style scoped>
.home-page {
  min-height: 100vh;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
}

/* Hero Section */
.hero {
  padding: 2rem 1rem;
  min-height: 100vh;
  display: flex;
  align-items: center;
}

.hero-content {
  max-width: 1200px;
  margin: 0 auto;
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: center;
}

.hero-text {
  color: white;
}

.hero-title {
  font-size: 3.5rem;
  font-weight: bold;
  line-height: 1.1;
  margin-bottom: 1.5rem;
}

.highlight {
  color: #ffd700;
  text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.3);
}

.hero-subtitle {
  font-size: 1.25rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.hero-stats {
  display: flex;
  gap: 2rem;
  margin-bottom: 2.5rem;
}

.stat {
  text-align: center;
}

.stat-number {
  display: block;
  font-size: 2rem;
  font-weight: bold;
  color: #ffd700;
}

.stat-label {
  font-size: 0.875rem;
  opacity: 0.8;
}

.cta-button {
  background: linear-gradient(45deg, #ff6b6b, #ffd93d);
  color: #333;
  border: none;
  padding: 1rem 2rem;
  font-size: 1.125rem;
  font-weight: bold;
  border-radius: 50px;
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.3s ease;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.2);
}

.cta-button:hover {
  transform: translateY(-2px);
  box-shadow: 0 6px 20px rgba(0, 0, 0, 0.3);
}

.cta-button.large {
  padding: 1.25rem 2.5rem;
  font-size: 1.25rem;
}

.button-icon {
  font-size: 1.2em;
}

/* Phone Mockup */
.hero-visual {
  display: flex;
  justify-content: center;
}

.phone-mockup {
  width: 280px;
  height: 560px;
  background: #333;
  border-radius: 30px;
  padding: 20px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
}

.phone-screen {
  width: 100%;
  height: 100%;
  background: white;
  border-radius: 20px;
  overflow: hidden;
}

.app-preview {
  padding: 1.5rem 1rem;
}

.preview-header {
  margin-bottom: 1.5rem;
}

.preview-title {
  font-size: 1.25rem;
  font-weight: bold;
  color: #333;
  margin-bottom: 0.5rem;
}

.preview-stats {
  display: flex;
  gap: 1rem;
}

.stat-item {
  font-size: 0.875rem;
  color: #666;
}

.preview-items {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.preview-item {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem;
  border-radius: 12px;
  background: #f8f9fa;
}

.preview-item.fresh {
  border-left: 4px solid #28a745;
}

.preview-item.warning {
  border-left: 4px solid #ffc107;
}

.item-emoji {
  font-size: 1.5rem;
}

.item-name {
  flex: 1;
  font-weight: 500;
}

.item-status {
  font-size: 0.875rem;
  color: #666;
}

/* Features Section */
.features {
  padding: 5rem 1rem;
  background: white;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
}

.section-title {
  text-align: center;
  font-size: 2.5rem;
  color: #333;
  margin-bottom: 3rem;
}

.features-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(250px, 1fr));
  gap: 2rem;
}

.feature-card {
  text-align: center;
  padding: 2rem;
  border-radius: 16px;
  background: #f8f9fa;
  transition: transform 0.3s ease;
}

.feature-card:hover {
  transform: translateY(-5px);
}

.feature-icon {
  font-size: 3rem;
  margin-bottom: 1rem;
}

.feature-card h3 {
  font-size: 1.5rem;
  color: #333;
  margin-bottom: 1rem;
}

.feature-card p {
  color: #666;
  line-height: 1.6;
}

/* Impact Section */
.impact {
  padding: 5rem 1rem;
  background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%);
  color: white;
}

.impact-content {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 3rem;
  align-items: center;
}

.impact-text h2 {
  font-size: 2.5rem;
  margin-bottom: 1.5rem;
}

.impact-text p {
  font-size: 1.125rem;
  line-height: 1.6;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.impact-list {
  list-style: none;
  padding: 0;
}

.impact-list li {
  font-size: 1.125rem;
  margin-bottom: 0.75rem;
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.impact-visual {
  display: flex;
  justify-content: center;
}

.impact-circle {
  width: 300px;
  height: 300px;
  border-radius: 50%;
  background: rgba(255, 255, 255, 0.1);
  display: flex;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
}

.circle-content {
  text-align: center;
}

.circle-emoji {
  font-size: 4rem;
  display: block;
  margin-bottom: 1rem;
}

.circle-text {
  font-size: 1.125rem;
  font-weight: 500;
}

/* Final CTA Section */
.final-cta {
  padding: 5rem 1rem;
  background: #333;
  color: white;
  text-align: center;
}

.cta-content h2 {
  font-size: 2.5rem;
  margin-bottom: 1rem;
}

.cta-content p {
  font-size: 1.25rem;
  margin-bottom: 2rem;
  opacity: 0.9;
}

.cta-note {
  margin-top: 1rem !important;
  font-size: 0.875rem !important;
  opacity: 0.7 !important;
}

/* Mobile Responsive */
@media (max-width: 768px) {
  .hero-content {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .hero-title {
    font-size: 2.5rem;
  }

  .hero-stats {
    justify-content: center;
  }

  .phone-mockup {
    width: 240px;
    height: 480px;
  }

  .impact-content {
    grid-template-columns: 1fr;
    text-align: center;
  }

  .impact-circle {
    width: 250px;
    height: 250px;
  }

  .section-title {
    font-size: 2rem;
  }

  .features-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 480px) {
  .hero {
    padding: 1rem;
  }

  .hero-title {
    font-size: 2rem;
  }

  .hero-stats {
    flex-direction: column;
    gap: 1rem;
  }

  .phone-mockup {
    width: 200px;
    height: 400px;
    padding: 15px;
  }

  .cta-button {
    padding: 0.875rem 1.5rem;
    font-size: 1rem;
  }
}
</style>
