/**
 * Phase 15: secondary spine motif for standalone pages. Not the landing's
 * page-long Data Spine — one faint route, one small hub and a short branch to
 * the page heading, so /projects, /blog and /cv read as the same world.
 * Server-rendered, CSS-only, aria-hidden and pointer-events: none.
 * Projects gets a slow signal (more energy); Blog and CV stay calmer.
 */
export function SecondarySpine({ variant }: { variant: "projects" | "blog" | "cv" }) {
  return <div className="secondary-spine" data-variant={variant} aria-hidden="true">
    <svg className="secondary-spine-path" viewBox="0 0 40 1000" preserveAspectRatio="none" focusable="false">
      <path d="M20 0C30 180 10 360 20 520S30 860 20 1000" />
      <path d="M22 0C34 200 8 380 18 540S32 840 22 1000" />
    </svg>
    <span className="secondary-spine-hub" />
    <span className="secondary-spine-branch" />
    {variant === "projects" && <span className="secondary-spine-signal" />}
  </div>;
}
