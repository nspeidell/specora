import { getCloudflareContext } from "@opennextjs/cloudflare";
import { Webhook } from "svix";
import { getDB } from "@/lib/db/client";
import { users } from "@/lib/db/schema";

type EmailAddress = {
  id: string;
  email_address: string;
};

type UserCreatedEvent = {
  type: "user.created";
  data: {
    id: string;
    email_addresses: EmailAddress[];
    primary_email_address_id: string;
    first_name: string | null;
    last_name: string | null;
    image_url: string | null;
  };
};

type WebhookEvent = UserCreatedEvent | { type: string; data: unknown };

export async function POST(request: Request) {
  const secret = process.env.CLERK_WEBHOOK_SECRET;

  if (!secret) {
    console.error("CLERK_WEBHOOK_SECRET is not set");
    return new Response("Webhook secret not configured", { status: 500 });
  }

  const svix_id = request.headers.get("svix-id");
  const svix_timestamp = request.headers.get("svix-timestamp");
  const svix_signature = request.headers.get("svix-signature");

  if (!svix_id || !svix_timestamp || !svix_signature) {
    return new Response("Missing Svix headers", { status: 400 });
  }

  const body = await request.text();
  const wh = new Webhook(secret);

  let event: WebhookEvent;
  try {
    event = wh.verify(body, {
      "svix-id": svix_id,
      "svix-timestamp": svix_timestamp,
      "svix-signature": svix_signature,
    }) as WebhookEvent;
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response("Invalid signature", { status: 400 });
  }

  if (event.type === "user.created") {
    const { env } = await getCloudflareContext();
    const db = getDB(env as { DB: D1Database });

    const { id, email_addresses, primary_email_address_id, first_name, last_name, image_url } =
      (event as UserCreatedEvent).data;

    const primaryEmail = email_addresses.find(
      (e) => e.id === primary_email_address_id
    );

    if (!primaryEmail) {
      console.error("No primary email found for user:", id);
      return new Response("No primary email", { status: 400 });
    }

    const fullName =
      [first_name, last_name].filter(Boolean).join(" ").trim() || null;

    try {
      await db.insert(users).values({
        clerkUserId: id,
        email: primaryEmail.email_address,
        fullName,
        avatarUrl: image_url,
      });
    } catch (err) {
      console.error("Failed to insert user:", err);
      return new Response("Database error", { status: 500 });
    }
  }

  return new Response("OK", { status: 200 });
}
