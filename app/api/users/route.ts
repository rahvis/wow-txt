import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";
import bcrypt from "bcryptjs";
import { ObjectId } from "mongodb";

const DB_NAME = "wow-agent";
const COLLECTION_NAME = "users";

// GET all users
export async function GET(req: Request) {
  try {
    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    const users = await collection
      .find({}, { projection: { password: 0 } })
      .toArray();

    return NextResponse.json(users);
  } catch (error) {
    console.error("Error fetching users:", error);
    return NextResponse.json(
      { error: "Failed to fetch users" },
      { status: 500 }
    );
  }
}

// POST new user
export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { name, email, password, transcriptId } = body;

    // Validate required fields
    if (!name || !email || !password || !transcriptId) {
      return NextResponse.json(
        { error: "Name, email, password, and transcriptId are required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Check if email already exists
    const existingUser = await collection.findOne({ email });
    if (existingUser) {
      return NextResponse.json(
        { error: "Email already exists" },
        { status: 400 }
      );
    }

    // Check if transcriptId is already attached to another user
    const existingTranscriptUser = await collection.findOne({ transcriptId });
    if (existingTranscriptUser) {
      return NextResponse.json(
        { error: "This transcript is already associated with another user" },
        { status: 400 }
      );
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Create user
    const result = await collection.insertOne({
      name,
      email,
      password: hashedPassword,
      transcriptId,
      created_at: new Date(),
      updated_at: new Date(),
    });

    return NextResponse.json({
      _id: result.insertedId,
      name,
      email,
      transcriptId,
      created_at: new Date(),
      updated_at: new Date(),
    });
  } catch (error) {
    console.error("Error creating user:", error);
    return NextResponse.json(
      { error: "Failed to create user" },
      { status: 500 }
    );
  }
}

export async function PUT(req: Request) {
  try {
    const body = await req.json();
    const { id, name, email } = body;

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      );
    }

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Check if email exists for another user
    if (email) {
      const existingUser = await collection.findOne({
        email,
        _id: { $ne: new ObjectId(id) },
      });
      if (existingUser) {
        return NextResponse.json(
          { error: "Email already exists" },
          { status: 400 }
        );
      }
    }

    const updateData: any = {
      updated_at: new Date(),
    };

    if (name) updateData.name = name;
    if (email) updateData.email = email;

    const result = await collection.updateOne(
      { _id: new ObjectId(id) },
      { $set: updateData }
    );

    if (result.matchedCount === 0) {
      return NextResponse.json(
        { error: "User not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ message: "User updated successfully" });
  } catch (error) {
    console.error("Error updating user:", error);
    return NextResponse.json(
      { error: "Failed to update user" },
      { status: 500 }
    );
  }
}
