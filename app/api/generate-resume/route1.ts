import { NextResponse } from "next/server";
import { MongoClient } from "mongodb";

const AZURE_OPENAI_ENDPOINT = process.env.AZURE_OPENAI_ENDPOINT; // Ensure this is set in .env.local
const AZURE_OPENAI_KEY = process.env.AZURE_OPENAI_KEY; // Ensure this is set in .env.local

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
    {
      "model": "gpt-4",
      "prompt": "You are a professional resume writer. Based on the following conversation between an HR recruiter and a candidate, generate a well-structured, ATS-friendly resume. The resume should be formatted professionally in plain text, without any special characters, bold text, or symbols. Use proper section headers and spacing for readability.",
      "temperature": 0.7,
      "max_tokens": 600
    }
    
    ${conversationText}
    
    Format the resume with these sections:
    
    1. Professional Summary  
       Write a concise paragraph summarizing the candidate’s experience, key skills, and strengths.
    
    2. Core Competencies & Skills  
       List relevant skills in a clean, easy-to-read format.
    
    3. Professional Experience  
       Include job titles, company names, locations, and employment dates. Provide bullet points summarizing key responsibilities and achievements.
    
    4. Certifications & Education  
       List relevant certifications, training, and academic qualifications.
    
    5. Achievements (if applicable)  
       Include major accomplishments related to the candidate’s profession.
    
    6. References  
       Mention "Available upon request." or if they provide the references, include them.
    
    Ensure the resume remains concise, professional, and ATS-optimized. Avoid unnecessary details and focus on key skills and accomplishments relevant to the role.
    `;

    // Ensure AZURE_OPENAI_ENDPOINT is defined
    if (!AZURE_OPENAI_ENDPOINT) {
      throw new Error("AZURE_OPENAI_ENDPOINT is not defined.");
    }

    // Call Azure OpenAI API
    const request = new Request(AZURE_OPENAI_ENDPOINT, {
      method: "POST",
      body: JSON.stringify({
        messages: [
          {
            role: "system",
            content: "You are a professional resume writer.",
          },
          { role: "user", content: prompt },
        ],
        temperature: 0.7,
      }),
      headers: {
        "Content-Type": "application/json",
        ...(AZURE_OPENAI_KEY && { "api-key": AZURE_OPENAI_KEY }), // Include 'api-key' header only if AZURE_OPENAI_KEY is defined
      },
    });

    const response = await fetch(request);

    const data = await response.json();

    if (!response.ok) {
      console.error("Azure OpenAI API Error:", data);
      return NextResponse.json(
        { error: "Failed to generate resume", details: data },
        { status: 500 }
      );
    }

    const resumeContent =
      data.choices[0]?.message?.content || "Error: No resume generated.";

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
