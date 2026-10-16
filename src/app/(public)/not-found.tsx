import { NotFoundContent } from "@/components/layout/not-found-content";

// notFound() inside public pages renders within (public)/layout, which already
// provides the header, footer and command center.
export default function PublicNotFound() {
  return <NotFoundContent />;
}
