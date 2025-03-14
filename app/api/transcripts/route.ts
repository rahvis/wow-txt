import { NextResponse } from "next/server";
import clientPromise from "@/lib/mongodb";

const DB_NAME = "wow-agent";
const COLLECTION_NAME = "wow-agent-transcript";

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const page = parseInt(url.searchParams.get("page") || "1", 10);
    const limit = parseInt(url.searchParams.get("limit") || "5", 10);
    const skip = (page - 1) * limit;

    const client = await clientPromise;
    const db = client.db(DB_NAME);
    const collection = db.collection(COLLECTION_NAME);

    // Fetch paginated transcripts
    const transcripts = await collection
      .find()
      .skip(skip)
      .sort({ timestamp: -1 }) // Sort by latest timestamp first
      .limit(limit)
      .toArray();
    const totalDocuments = await collection.countDocuments();

    return NextResponse.json({
      transcripts, // Ensure this is always an array
      pagination: {
        page,
        totalPages: Math.ceil(totalDocuments / limit),
      },
    });
  } catch (error) {
    console.error("Error fetching transcripts:", error);
    return NextResponse.json(
      { error: "Failed to fetch transcripts" },
      { status: 500 }
    );
  }
}
