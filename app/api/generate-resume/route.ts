import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";
import { OpenAI } from "langchain/llms/openai";
import { PromptTemplate } from "langchain/prompts";
import { LLMChain } from "langchain/chains";

const model = new OpenAI({ modelName: "gpt-4", temperature: 0.9 });

const template = `
As an expert recruiter, create a professional resume based on the following conversation transcript. Focus on highlighting key skills, experiences, and achievements:

{conversation}

Format the resume with the following sections:
1. Summary
2. Skills
3. Professional Experience
4. Education
5. Achievements

Be concise and professional in your language.
`;

const prompt = new PromptTemplate({
  template: template,
  inputVariables: ["conversation"],
});

const chain = new LLMChain({ llm: model, prompt: prompt });

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
      .map((item: any) => (typeof item === "string" ? item : item.RME || ""))
      .join("\n");

    // Generate resume content using LangChain
    const result = await chain.call({ conversation: conversationText });
    const resumeContent = result.text;

    // Convert resume content into a text file
    const textFile = new Blob([resumeContent], { type: "text/plain" });
    const textFileBuffer = await textFile.arrayBuffer();

    await client.close();

    return new NextResponse(Buffer.from(textFileBuffer), {
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
