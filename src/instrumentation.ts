import type { Instrumentation } from "next";

import { describeError, formatServerError } from "@/lib/observability";

/**
 * Every server error Next.js catches, written down.
 *
 * Without this a failed render is a digest in the browser console and nothing
 * on the server worth reading: the error boundary has already swallowed it. The
 * handbook's story about a dashboard rendering blank because a timestamp was a
 * string is exactly the shape of failure this makes visible.
 */
export const onRequestError: Instrumentation.onRequestError = (error, request, context) => {
  console.error(
    formatServerError({
      scope: "request",
      ...describeError(error),
      route: context.routePath || request.path,
      method: request.method,
      detail: {
        routeType: context.routeType,
        renderSource: context.renderSource,
        path: request.path,
      },
    }),
  );
};
