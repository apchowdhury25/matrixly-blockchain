import { createFileRoute } from "@tanstack/react-router";
import { json } from "@/lib/api/http";
import { openApiSpec } from "@/lib/api/openapi";

export const Route = createFileRoute("/api/v1/openapi.json")({
  server: {
    handlers: {
      GET: () => json(openApiSpec),
    },
  },
});
