import { createFileRoute } from "@tanstack/react-router";
import { Kitchen3DScene } from "@/components/kitchen-3d/Kitchen3DScene";
import { foodFlowHead } from "@/lib/foodflow-route-head";

export const Route = createFileRoute("/kitchen-3d")({
  validateSearch: (search: Record<string, unknown>): { autostart?: boolean } =>
    search["autostart"] === "1" || search["autostart"] === 1 ? { autostart: true } : {},
  head: () =>
    foodFlowHead(
      "3D Kitchen & Dining Twin | FoodFlow",
      "Inspect the interactive 3D mess kitchen floorplan, cooking line, FEFO chiller, QR gate, and waste station.",
    ),
  component: Kitchen3DRouteComponent,
});

function Kitchen3DRouteComponent() {
  const { autostart } = Route.useSearch();
  return <Kitchen3DScene initialAutoStart={Boolean(autostart)} />;
}
