import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import { ObjectId } from "mongodb";
import { cookies } from "next/headers";

const DB_NAME = "wow-agent";
const COLLECTION_NAME = "users";

export async function GET() {
  try {
    const sessionCookie = cookies().get("user-session")?.value;
    
    if (!sessionCookie) {
      return NextResponse.json(
        { error: "Not authenticated" },
        { status: 401 }
      );
    }

    // Parse session data
    const sessionData = JSON.parse(sessionCookie);
    const { userId, transcriptId } = sessionData;

    if (!userId || !transcriptId) {
      return NextResponse.json(
        { error: "Invalid session" },
        { status: 401 }
      );
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Find user by both userId and transcriptId
    const user = await collection.findOne(
      { 
        _id: new ObjectId(userId),
        transcriptId: transcriptId
      },
      { projection: { password: 0 } }
    );

    if (!user) {
      return NextResponse.json(
        { error: "User not found or invalid transcript access" },
        { status: 404 }
      );
    }

    return NextResponse.json(user);
  } catch (error) {
    console.error("Error checking auth:", error);
    return NextResponse.json(
      { error: "Not authenticated" },
      { status: 401 }
    );
  }
} 