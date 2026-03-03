import { NextResponse, type NextRequest } from "next/server";

export default function middleware(req: NextRequest) {
  const token =
    req.cookies.get("authjs.session-token")?.value ??
    req.cookies.get("__Secure-authjs.session-token")?.value;
  const isLoggedIn = Boolean(token);
  const isLoginPage = req.nextUrl.pathname === "/login";
  const isSignupPage = req.nextUrl.pathname === "/signup";
  const isAuthApi = req.nextUrl.pathname.startsWith("/api/auth");
  const isRegisterApi = req.nextUrl.pathname.startsWith("/api/users/register");

  if (!isLoggedIn && !isLoginPage && !isSignupPage && !isAuthApi && !isRegisterApi) {
    return NextResponse.redirect(new URL("/login", req.nextUrl));
  }

  if (isLoggedIn && (isLoginPage || isSignupPage)) {
    return NextResponse.redirect(new URL("/", req.nextUrl));
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"]
};
