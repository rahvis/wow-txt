import { NextResponse } from "next/server"
import { MongoClient } from "mongodb"

export async function GET() {
  try {
    const client = new MongoClient(process.env.MONGODB_URI as string)
    await client.connect()

    const db = client.db("jobs")
    const collection = db.collection("jobdata")

    const transcripts = await collection.find({}).toArray()

    await client.close()

    return NextResponse.json(transcripts)
  } catch (error) {
    console.error("Error fetching transcripts:", error)
    return NextResponse.json({ error: "Failed to fetch transcripts" }, { status: 500 })
  }
}

