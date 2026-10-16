/**
 * Phase 14: a section's slot on the page-wide Data Spine. The lane is the
 * column the single route runs through; the hub is where it passes exactly and
 * branches to the section's content. Server-rendered and decorative only.
 */
export function SpineLane({ id, calm = false }: { id: string; calm?: boolean }) {
  return <div className="spine-lane" data-spine-lane={id} data-spine-calm={calm ? "true" : undefined} aria-hidden="true">
    <span className="spine-hub"><i /></span>
  </div>;
}

/**
 * Where a branch attaches to real content. Default: fans out from the section hub.
 * `tick`: a smaller item node (timeline entries, repo rows); its branch still starts at the local hub.
 */
export function SpineAnchor({ tick = false }: { tick?: boolean }) {
  return <span className={tick ? "spine-anchor spine-anchor--tick" : "spine-anchor"} data-spine-anchor={tick ? "tick" : ""} aria-hidden="true" />;
}
