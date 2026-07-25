const Vue = window.Vue

if (!Vue) {
  throw new Error('Vue CDN runtime failed to load')
}

export const {
  computed,
  createApp,
  defineComponent,
  nextTick,
  onBeforeUnmount,
  onMounted,
  openBlock,
  createElementBlock,
  createElementVNode,
  createVNode,
  createBlock,
  createCommentVNode,
  createStaticVNode,
  createTextVNode,
  Fragment,
  h,
  renderList,
  resolveComponent,
  normalizeClass,
  normalizeStyle,
  toDisplayString,
  unref,
  mergeProps,
  withCtx,
  renderSlot,
  createSlots,
  setBlockTracking,
  withDirectives,
  vModelText,
  vModelSelect,
  vShow,
  withModifiers,
  withKeys,
  ref,
  watch,
} = Vue

export default Vue
