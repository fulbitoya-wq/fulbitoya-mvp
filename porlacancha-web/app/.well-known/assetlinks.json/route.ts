import { NextResponse } from "next/server";

export function GET() {
  const pkg = process.env.ANDROID_PACKAGE?.trim() || "com.porlacancha.app";
  const raw = process.env.ANDROID_SHA256_CERT_FINGERPRINTS?.trim();
  if (!raw) {
    return new NextResponse(null, { status: 404 });
  }
  const fingerprints = raw.split(",").map((s) => s.trim()).filter(Boolean);
  if (fingerprints.length === 0) {
    return new NextResponse(null, { status: 404 });
  }
  const body = [
    {
      relation: ["delegate_permission/common.handle_all_urls"],
      target: {
        namespace: "android_app",
        package_name: pkg,
        sha256_cert_fingerprints: fingerprints,
      },
    },
  ];
  return NextResponse.json(body);
}
