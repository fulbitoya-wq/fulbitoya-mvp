import { NextResponse } from "next/server";

export function GET() {
  const team = process.env.APPLE_TEAM_ID?.trim();
  const bundle = process.env.IOS_BUNDLE_ID?.trim() || "com.porlacancha.app";
  if (!team) {
    return new NextResponse(null, { status: 404 });
  }
  const body = {
    applinks: {
      apps: [],
      details: [
        {
          appID: `${team}.${bundle}`,
          paths: ["/e/*", "/d/*", "/auth/*"],
        },
      ],
    },
  };
  return NextResponse.json(body, {
    headers: { "Content-Type": "application/json" },
  });
}
