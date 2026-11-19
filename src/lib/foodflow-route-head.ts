export function foodFlowHead(title: string, description: string) {
  return {
    meta: [
      { title: `${title} | FoodFlow` },
      { name: "description", content: description },
      { property: "og:title", content: `${title} | FoodFlow` },
      { property: "og:description", content: description },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  };
}