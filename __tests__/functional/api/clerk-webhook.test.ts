import { Webhook } from "svix";
import { headers } from "next/headers";
import { clerkClient } from "@clerk/nextjs";
import { POST } from "@/app/api/webhooks/route";
import {
  createAuthor,
  deleteAuthor,
  updateAuthor,
} from "@/lib/actions/author.actions";

jest.mock("next/headers", () => ({ headers: jest.fn() }));
jest.mock("@clerk/nextjs", () => ({
  clerkClient: { users: { updateUserMetadata: jest.fn() } },
}));
jest.mock("@/lib/actions/author.actions", () => ({
  createAuthor: jest.fn(),
  updateAuthor: jest.fn(),
  deleteAuthor: jest.fn(),
}));

const SECRET = `whsec_${Buffer.from("test-webhook-secret").toString("base64")}`;
const mockHeaders = headers as jest.Mock;

/** Builds a request signed exactly like Clerk (via Svix) would sign it. */
function signedRequest(payload: object, { tamper = false } = {}) {
  const body = JSON.stringify(payload);
  const msgId = "msg_123";
  const timestamp = new Date();
  const signature = new Webhook(SECRET).sign(msgId, timestamp, body);
  mockHeaders.mockReturnValue(
    new Headers({
      "svix-id": msgId,
      "svix-timestamp": Math.floor(timestamp.getTime() / 1000).toString(),
      "svix-signature": tamper ? "v1,invalid" : signature,
    })
  );
  return new Request("http://localhost/api/webhooks", {
    method: "POST",
    body,
  });
}

const clerkUser = {
  id: "user_abc",
  email_addresses: [{ email_address: "jane@example.com" }],
  image_url: "https://img.clerk.com/jane.png",
  first_name: "Jane",
  last_name: "Doe",
  username: "jane",
};

describe("POST /api/webhooks (Clerk)", () => {
  const env = process.env;

  beforeEach(() => {
    process.env = { ...env, WEBHOOK_SECRET: SECRET };
    jest.spyOn(console, "log").mockImplementation(() => {});
    jest.spyOn(console, "error").mockImplementation(() => {});
  });

  afterEach(() => {
    process.env = env;
    jest.clearAllMocks();
    jest.restoreAllMocks();
  });

  it("throws when WEBHOOK_SECRET is not configured", async () => {
    delete process.env.WEBHOOK_SECRET;

    await expect(POST(signedRequest({}))).rejects.toThrow(/WEBHOOK_SECRET/);
  });

  it("returns 400 when svix headers are missing", async () => {
    mockHeaders.mockReturnValue(new Headers());
    const req = new Request("http://localhost/api/webhooks", {
      method: "POST",
      body: "{}",
    });

    const res = await POST(req);

    expect(res.status).toBe(400);
    expect(await res.text()).toMatch(/no svix headers/);
  });

  it("returns 400 when the signature is invalid", async () => {
    const res = await POST(
      signedRequest({ type: "user.created", data: clerkUser }, { tamper: true })
    );

    expect(res.status).toBe(400);
    expect(createAuthor).not.toHaveBeenCalled();
  });

  it("creates an author on user.created and stores its id in Clerk metadata", async () => {
    (createAuthor as jest.Mock).mockResolvedValue({ _id: "mongo_1" });

    const res = await POST(
      signedRequest({ type: "user.created", data: clerkUser })
    );

    expect(createAuthor).toHaveBeenCalledWith({
      clerkId: "user_abc",
      email: "jane@example.com",
      username: "jane",
      firstName: "Jane",
      lastName: "Doe",
      photo: "https://img.clerk.com/jane.png",
    });
    expect(clerkClient.users.updateUserMetadata).toHaveBeenCalledWith(
      "user_abc",
      { publicMetadata: { userId: "mongo_1" } }
    );
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({
      message: "OK",
      user: { _id: "mongo_1" },
    });
  });

  it("does not touch Clerk metadata when the author could not be created", async () => {
    (createAuthor as jest.Mock).mockResolvedValue(undefined);

    await POST(signedRequest({ type: "user.created", data: clerkUser }));

    expect(clerkClient.users.updateUserMetadata).not.toHaveBeenCalled();
  });

  it("updates the author on user.updated", async () => {
    (updateAuthor as jest.Mock).mockResolvedValue({ _id: "mongo_1" });

    const res = await POST(
      signedRequest({ type: "user.updated", data: clerkUser })
    );

    expect(updateAuthor).toHaveBeenCalledWith("user_abc", {
      firstName: "Jane",
      lastName: "Doe",
      username: "jane",
      photo: "https://img.clerk.com/jane.png",
    });
    expect(await res.json()).toEqual({
      message: "OK",
      user: { _id: "mongo_1" },
    });
  });

  it("deletes the author on user.deleted", async () => {
    (deleteAuthor as jest.Mock).mockResolvedValue({ _id: "mongo_1" });

    const res = await POST(
      signedRequest({ type: "user.deleted", data: { id: "user_abc" } })
    );

    expect(deleteAuthor).toHaveBeenCalledWith("user_abc");
    expect(await res.json()).toEqual({
      message: "user_abc",
      user: { _id: "mongo_1" },
    });
  });

  it("acknowledges unhandled event types without side effects", async () => {
    const res = await POST(
      signedRequest({ type: "session.created", data: { id: "sess_1" } })
    );

    expect(res.status).toBe(200);
    expect(createAuthor).not.toHaveBeenCalled();
    expect(updateAuthor).not.toHaveBeenCalled();
    expect(deleteAuthor).not.toHaveBeenCalled();
  });
});
