import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { Configuration, OpenAIApi } from "openai";

const configuration = new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
});
const openai = new OpenAIApi(configuration);

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

    // Extract the conversation from the document
    const conversation = document.conversation;

    // Prepare the conversation text
    const conversationText = conversation
      .map((item: any) => {
        if (typeof item === "string") {
          return item;
        } else if (typeof item === "object" && item.RME) {
          return item.RME;
        }
        return "";
      })
      .join("\n");

    // Generate resume content using OpenAI GPT-4
    const prompt = `As an expert recruiter, create a professional resume based on the following conversation transcript. Focus on highlighting key skills, experiences, and achievements:

${conversationText}

Format the resume with the following sections:
1. Summary
2. Skills
3. Professional Experience
4. Education
5. Achievements

Be concise and professional in your language.`;

    const completion = await openai.createChatCompletion({
      model: "gpt-4",
      messages: [
        {
          role: "system",
          content:
            "You are an expert recruiter creating a professional resume.",
        },
        { role: "user", content: prompt },
      ],
      max_tokens: 1000,
    });

    const resumeContent = completion.data.choices[0].message?.content;

    if (!resumeContent) {
      throw new Error("Failed to generate resume content");
    }

    await client.close();

    // Return the resume content as plain text
    return new NextResponse(resumeContent, {
      headers: {
        "Content-Type": "text/plain",
        "Content-Disposition": `attachment; filename=${phoneNumber}_resume.txt`,
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
