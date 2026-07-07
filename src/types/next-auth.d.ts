import type { DefaultSession, DefaultUser } from "next-auth";
import type { Role } from "../../generated/prisma/enums";

declare module "next-auth" {
  interface User extends DefaultUser {
    id: string;
    role: Role;
  }

  interface Session {
    user: DefaultSession["user"] & {
      id: string;
      role: Role;
    };
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    id: string;
    role: Role;
  }
}
