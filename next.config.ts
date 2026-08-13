import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  async rewrites() {
    return {
      beforeFiles: [
        {
          source: "/",
          has: [{ type: "host", value: "players.onzeup.com.br" }],
          destination: "/players",
        },
        {
          source: "/",
          has: [{ type: "host", value: "coach.onzeup.com.br" }],
          destination: "/coaches",
        },
        {
          source: "/:slug",
          has: [{ type: "host", value: "coach.onzeup.com.br" }],
          destination: "/coach-profile/:slug",
        },
      ],
      afterFiles: [],
      fallback: [],
    };
  },
};

export default nextConfig;
