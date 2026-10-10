/** @type {import('next').NextConfig} */
export default {
  // knowledge/*.md is read at runtime, so make sure Vercel bundles it.
  outputFileTracingIncludes: { "/api/**/*": ["./knowledge/**/*"] },
};
