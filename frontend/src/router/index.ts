import { createRouter, createWebHistory } from "vue-router";
import { useAuthStore } from "@/stores/auth";

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: "/auth",
      name: "auth",
      component: () => import("../views/AuthView.vue"),
      meta: {
        title: "Login - Use It Up",
        requiresGuest: true,
      },
    },
    {
      path: "/",
      name: "dashboard",
      // Lazy-loaded dashboard view
      component: () => import("../views/DashboardView.vue"),
      meta: {
        title: "Dashboard - Use It Up",
        requiresAuth: true,
      },
    },
    {
      path: "/inventory",
      name: "inventory",
      // Lazy-loaded inventory view
      component: () => import("../views/InventoryView.vue"),
      meta: {
        title: "Inventory - Use It Up",
        requiresAuth: true,
      },
    },
    {
      path: "/add-item",
      name: "add-item",
      // Lazy-loaded add item view
      component: () => import("../views/AddItemView.vue"),
      meta: {
        title: "Add Item - Use It Up",
        requiresAuth: true,
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
        requiresAuth: true,
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
  const authStore = useAuthStore();

  // Try to load saved user if not already loaded
  if (!authStore.isAuthenticated) {
    authStore.loadSavedUser();
  }

  // Set document title
  if (to.meta.title) {
    document.title = to.meta.title as string;
  }

  const requiresAuth = to.matched.some((record) => record.meta.requiresAuth);
  const requiresGuest = to.matched.some((record) => record.meta.requiresGuest);

  if (requiresAuth && !authStore.isAuthenticated) {
    // Redirect to auth page if authentication is required but user is not authenticated
    next("/auth");
    return;
  } else if (requiresGuest && authStore.isAuthenticated) {
    // Redirect to home if guest page is accessed but user is authenticated
    next("/");
    return;
  }

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
