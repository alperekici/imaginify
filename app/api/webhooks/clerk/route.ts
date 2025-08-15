// app/api/webhooks/clerk/route.ts
/* eslint-disable camelcase */
export const runtime = 'nodejs';           // ✅ Node runtime (not Edge)
export const dynamic = 'force-dynamic';    // ✅ no caching

import { headers } from "next/headers";
import { NextResponse } from "next/server";
import { Webhook, WebhookRequiredHeaders } from "svix";
import { clerkClient } from "@clerk/nextjs/server";
import type { WebhookEvent } from "@clerk/nextjs/server";

import { createUser, updateUser, deleteUser } from "@/lib/actions/user.actions";

export async function POST(req: Request) {
  const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET; // ✅ set this in Vercel

  if (!WEBHOOK_SECRET) {
    console.error("Missing CLERK_WEBHOOK_SECRET");
    return new Response("Server misconfigured", { status: 500 });
  }

  // Clerk/Svix headers
  const headerPayload = headers();
  const svix_id = headerPayload.get("svix-id");
  const svix_timestamp = headerPayload.get("svix-timestamp");
  const svix_signature = headerPayload.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing Svix headers", { status: 400 });
  }

  // IMPORTANT: raw body for verification
  const body = await req.text();

  const wh = new Webhook(WEBHOOK_SECRET);

  let evt: WebhookEvent;
  try {
    evt = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    } as WebhookRequiredHeaders) as WebhookEvent;
  } catch (err) {
    console.error("Error verifying webhook:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  const eventType = evt.type;

  // Handle events
  try {
    if (eventType === "user.created") {
      const { id, email_addresses, image_url, first_name, last_name, username } = evt.data;

      const user = {
        clerkId: id,
        email: email_addresses?.[0]?.email_address ?? "",
        username: username ?? "",
        firstName: first_name ?? "",
        lastName: last_name ?? "",
        photo: image_url ?? "",
        creditBalance: 10,        // seed credits if you want
      };

      const newUser = await createUser(user);

      if (newUser) {
        await clerkClient.users.updateUserMetadata(id, {
          publicMetadata: { userId: newUser._id.toString() },
        });
      }

      return NextResponse.json({ ok: true });
    }

    if (eventType === "user.updated") {
      const { id, image_url, first_name, last_name, username } = evt.data;

      const user = {
        firstName: first_name ?? "",
        lastName: last_name ?? "",
        username: username ?? "",
        photo: image_url ?? "",
      };

      await updateUser(id, user); // <-- update by clerkId
      return NextResponse.json({ ok: true });
    }

    if (eventType === "user.deleted") {
      const { id } = evt.data;
      if (id) await deleteUser(id); // <-- delete by clerkId
      return NextResponse.json({ ok: true });
    }

    // Unhandled event → acknowledge anyway (2xx)
    return NextResponse.json({ ok: true, ignored: eventType });
  } catch (err: any) {
    console.error(`Webhook handler error for ${eventType}:`, err?.message || err);
    return new Response("Handler error", { status: 500 });
  }
}
