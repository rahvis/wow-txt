import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import OpenAI from "openai";

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Ensure this is set in .env.local
});

export async function POST(req: Request) {
  try {
    const { phoneNumber } = await req.json();

    // Connect to MongoDB
    const client = new MongoClient(process.env.MONGODB_URI as string);
    await client.connect();
    const db = client.db("jobs");
    const collection = db.collection("jobdata");

    // Find the document with the matching phone number
    const document = await collection.findOne({ phone_number: phoneNumber });

    if (!document) {
      await client.close();
      return NextResponse.json(
        { error: "No data found for this phone number" },
        { status: 404 }
      );
    }

    // Extract conversation transcript
    const conversationText = document.conversation
      .map((item: any) => (typeof item === "string" ? item : item.RME || ""))
      .join("\n");

    // OpenAI prompt to generate a professional resume
    const prompt = `
As an expert recruiter, create a professional resume based on the following conversation transcript. Focus on key skills, experiences, and achievements:

${conversationText}

Format the resume with these sections:
1. Summary
2. Skills
3. Professional Experience
4. Education
5. Achievements

Use concise and professional language.
`;

    // Call OpenAI API
    const response = await openai.chat.completions.create({
      model: "gpt-4",
      messages: [
        { role: "system", content: "You are a professional resume writer." },
        { role: "user", content: prompt },
      ],
      temperature: 0.7,
    });

    const resumeContent =
      response.choices[0]?.message?.content || "Error: No resume generated.";

    console.log("Generated Resume:", resumeContent); // Debug log

    // Convert resume content into a text file
    const textFileBuffer = Buffer.from(resumeContent, "utf-8");

    await client.close();

    return new Response(textFileBuffer, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Content-Disposition": `attachment; filename="${phoneNumber}_resume.txt"`,
      },
    });
  } catch (error: any) {
    console.error("Error generating resume:", error);
    return NextResponse.json(
      { error: "Failed to generate resume", details: error.message },
      { status: 500 }
    );
  }
}
