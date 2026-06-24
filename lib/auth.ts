import { NextAuthOptions } from "next-auth";
import EmailProvider from "next-auth/providers/email";
import PostgresAdapter from "@auth/pg-adapter";
import { Pool } from "pg";
import nodemailer from "nodemailer";

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: { rejectUnauthorized: false },
});

export const authOptions: NextAuthOptions = {
  // @ts-ignore — @auth/pg-adapter is compatible with NextAuth v4
  adapter: PostgresAdapter(pool),

  events: {
    async signIn(message) {
      console.log("[auth] signIn event:", JSON.stringify(message));
    },
    async session(message) {
      console.log("[auth] session event:", JSON.stringify(message));
    },
  },

  providers: [
    EmailProvider({
      from: process.env.EMAIL_FROM,

      sendVerificationRequest: async ({ identifier, url, provider }) => {
        console.log("[auth] sendVerificationRequest for:", identifier);
        console.log("[auth] magic link URL:", url);

        const result = await pool.query(
          "SELECT id FROM users WHERE email = $1",
          [identifier]
        );

        console.log("[auth] user lookup result:", result.rows);

        if (result.rows.length === 0) {
          console.log("[auth] BLOCKED — email not in users table");
          return;
        }

        console.log("[auth] ALLOWED — sending email");


        const transport = nodemailer.createTransport({
          host: "smtp.gmail.com",
          port: 465,
          secure: true,
          auth: {
            user: process.env.EMAIL_USER,
            pass: process.env.EMAIL_PASSWORD,
          },
        });

        await transport.sendMail({
          from: provider.from,
          to: identifier,
          subject: "Sign in to Sales Pipeline",
          text: `Click this link to sign in:\n\n${url}\n\nThis link expires in 24 hours.`,
          html: `
            <div style="font-family: sans-serif; max-width: 480px; margin: 0 auto;">
              <h2>Sign in to Sales Pipeline</h2>
              <p>Click the button below to sign in. This link expires in 24 hours.</p>
              <a href="${url}" style="display:inline-block; background:#2563eb; color:white; padding:12px 24px; border-radius:6px; text-decoration:none; font-weight:600;">
                Sign In
              </a>
              <p style="color:#888; font-size:12px; margin-top:24px;">
                If you didn't request this, you can safely ignore this email.
              </p>
            </div>
          `,
        });
      },
    }),
  ],

  // TODO: Re-enable this callback once pool connectivity on Vercel is confirmed.
  // This provides a second layer of auth by checking the users table on link click.
  // Currently disabled because sendVerificationRequest already blocks unauthorized emails.
  // callbacks: {
  //   async signIn({ user }) {
  //     const result = await pool.query(
  //       "SELECT id FROM users WHERE email = $1",
  //       [user.email]
  //     );
  //     return result.rows.length > 0;
  //   },
  // },

  pages: {
    signIn: "/auth/signin",
    error: "/auth/error",
  },

  session: {
    strategy: "jwt",
  },
};
