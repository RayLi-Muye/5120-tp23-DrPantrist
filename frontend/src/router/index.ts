import { createRouter, createWebHistory } from "vue-router";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/",
      name: "dashboard",
      // Lazy-loaded dashboard view
      component: () => import("../views/DashboardView.vue"),
      meta: {
        title: "Dashboard - Use It Up",
        requiresAuth: false, // Will be updated when auth is implemented
      },
    },
    {
      path: "/inventory",
      name: "inventory",
      // Lazy-loaded inventory view
      component: () => import("../views/InventoryView.vue"),
      meta: {
        title: "Inventory - Use It Up",
        requiresAuth: false,
      },
    },
    {
      path: "/add-item",
      name: "add-item",
      // Lazy-loaded add item view
      component: () => import("../views/AddItemView.vue"),
      meta: {
        title: "Add Item - Use It Up",
        requiresAuth: false,
      },
    },
    // Legacy routes for backward compatibility
    {
      path: "/home",
      redirect: "/",
    },
    {
      path: "/about",
      name: "about",
      component: () => import("../views/AboutView.vue"),
      meta: {
        title: "About - Use It Up",
      },
    },
    // Catch-all route for 404 handling
    {
      path: "/:pathMatch(.*)*",
      name: "not-found",
      redirect: "/",
    },
  ],
  // Smooth scrolling behavior
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition;
    } else {
      return { top: 0, behavior: "smooth" };
    }
  },
});

// Global navigation guards
router.beforeEach((to, from, next) => {
  // Set document title
  if (to.meta.title) {
    document.title = to.meta.title as string;
  }

  // Future: Authentication check
  // if (to.meta.requiresAuth && !isAuthenticated()) {
  //   next('/login')
  //   return
  // }

  // Loading state management (can be used with a global store)
  // This helps with smooth transitions on mobile
  if (typeof window !== "undefined") {
    // Add loading class to body for transition effects
    document.body.classList.add("route-transitioning");
  }

  next();
});

router.afterEach((to, from) => {
  // Remove loading state after navigation completes
  if (typeof window !== "undefined") {
    // Small delay to ensure smooth transition
    setTimeout(() => {
      document.body.classList.remove("route-transitioning");
    }, 100);
  }

  // Analytics tracking (future implementation)
  // trackPageView(to.path)
});

// Handle navigation errors gracefully
router.onError((error) => {
  console.error("Router error:", error);
  // Future: Send error to monitoring service
  // In case of chunk loading failure, redirect to dashboard
  if (error.message.includes("Loading chunk")) {
    router.push("/");
  }
});

export default router;
