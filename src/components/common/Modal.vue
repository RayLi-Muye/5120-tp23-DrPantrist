<template>
  <teleport to="body">
    <div
      v-if="visible"
      class="modal-overlay"
      role="presentation"
      @click="onOverlayClick"
    >
      <div
        class="modal-panel"
        role="dialog"
        aria-modal="true"
        :aria-label="title || 'Dialog'"
        @click.stop
      >
        <header class="modal-header">
          <h3 class="modal-title" v-if="title">{{ title }}</h3>
          <button class="modal-close" aria-label="Close" @click="close">×</button>
        </header>
        <div class="modal-body">
          <slot />
        </div>
        <footer class="modal-footer">
          <button class="modal-action" @click="close">Close</button>
        </footer>
      </div>
    </div>
  </teleport>
  
</template>

<script setup lang="ts">
defineOptions({ name: 'UiModal' })
import { onMounted, onBeforeUnmount, watch, ref } from 'vue'

interface Props {
  visible: boolean
  title?: string
  closeOnOverlay?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  closeOnOverlay: true
})
const emit = defineEmits<{ (e: 'update:visible', value: boolean): void }>()

const visible = ref(props.visible)
watch(() => props.visible, v => (visible.value = v))

function close() {
  emit('update:visible', false)
}

function onOverlayClick() {
  if (props.closeOnOverlay) close()
}

function onKey(e: KeyboardEvent) {
  if (e.key === 'Escape' && visible.value) close()
}

onMounted(() => {
  window.addEventListener('keydown', onKey)
})
onBeforeUnmount(() => {
  window.removeEventListener('keydown', onKey)
})
</script>

<style scoped>
.modal-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
  padding: 16px;
}

.modal-panel {
  width: min(880px, 96vw);
  max-height: 88vh;
  background: #fff;
  color: #111;
  border-radius: 12px;
  box-shadow: 0 20px 60px rgba(0, 0, 0, 0.2);
  display: grid;
  grid-template-rows: auto 1fr auto;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 12px 16px;
  border-bottom: 1px solid #eee;
}

.modal-title { margin: 0; font-size: 18px; }
.modal-close {
  background: transparent; border: none; font-size: 20px; cursor: pointer; line-height: 1;
}

.modal-body { padding: 16px; overflow: auto; }
.modal-footer { padding: 12px 16px; border-top: 1px solid #eee; display: flex; justify-content: flex-end; }
.modal-action { padding: 8px 12px; border-radius: 8px; border: 1px solid #ddd; background: #f8f8f8; cursor: pointer; }
.modal-action:hover { background: #f0f0f0; }
</style>
