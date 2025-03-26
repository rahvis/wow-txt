import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";

const DB_NAME = "wow-agent";
const COLLECTION_NAME = "users";

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, transcriptId } = body;

    // Validate required fields
    if (!email || !password || !transcriptId) {
      return NextResponse.json(
        { error: "Email, password, and transcriptId are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Find user by email
    const user = await collection.findOne({ email });
    if (!user) {
      return NextResponse.json({ error: "Invalid email." }, { status: 401 });
    }

    // Verify transcriptId
    const isValidTranscriptId = user.transcriptId === transcriptId;
    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.password);
    
    if (!isValidPassword) {
      return NextResponse.json(
        { error: "Invalid email or password" },
        { status: 401 }
      );
    }

    if (!isValidTranscriptId) {
      return NextResponse.json(
        { error: "This transcript is not related to you" },
        { status: 401 }
      );
    }


    // Set session cookie with both userId and transcriptId
    const sessionData = {
      userId: user._id.toString(),
      transcriptId: user.transcriptId,
    };

    cookies().set("user-session", JSON.stringify(sessionData), {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "strict",
      maxAge: 60 * 60 * 24, // 24 hours
    });

    // Return user without password
    const { password: _, ...userWithoutPassword } = user;

    return NextResponse.json(userWithoutPassword);
  } catch (error) {
    console.error("Error during login:", error);
    return NextResponse.json({ error: "Failed to login" }, { status: 500 });
  }
}
