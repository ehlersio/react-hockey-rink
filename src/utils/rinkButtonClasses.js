// Shared toolbar-button class-name builder. Styling lives in styles.css —
// this just composes the right combination of classes for each variant/state.
export function rinkButtonClasses({ active = false, variant = null } = {}) {
  const classes = ['rhr-btn'];
  if (variant) classes.push(`rhr-btn-${variant}`);
  if (active) classes.push('rhr-btn-on');
  return classes.join(' ');
}
