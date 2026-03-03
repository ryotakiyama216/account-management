import { createStoredUser, findStoredUserByEmail } from "@/lib/users";

type RegisterRequest = {
  name?: string;
  email?: string;
  password?: string;
};

export async function POST(req: Request): Promise<Response> {
  try {
    const body = (await req.json()) as RegisterRequest;
    const name = body.name?.trim() ?? "";
    const email = body.email?.trim().toLowerCase() ?? "";
    const password = body.password ?? "";

    if (!name || !email || !password) {
      return Response.json(
        { error: "name, email, password are required." },
        { status: 400 }
      );
    }
    if (password.length < 8) {
      return Response.json(
        { error: "password must be at least 8 characters." },
        { status: 400 }
      );
    }

    const exists = await findStoredUserByEmail(email);
    if (exists) {
      return Response.json({ error: "email already exists." }, { status: 409 });
    }

    const user = await createStoredUser({ name, email, password });
    return Response.json({
      ok: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email
      }
    });
  } catch (error) {
    return Response.json(
      { error: error instanceof Error ? error.message : "Unexpected error." },
      { status: 500 }
    );
  }
}
